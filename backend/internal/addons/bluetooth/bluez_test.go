//go:build linux

package bluetooth

import (
	"bufio"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/godbus/dbus/v5"
)

// objects is what BlueZ lists on a machine with one adapter: a connected
// headset with a battery, a connected keyboard known only by its class, a
// connected device without a name and a paired phone that is not connected.
func objects() managedObjects {
	return managedObjects{
		"/org/bluez": {"org.bluez.AgentManager1": {}},
		"/org/bluez/hci0": {
			adapterInterface: {"Address": dbus.MakeVariant("00:11:22:33:44:55"), "Powered": dbus.MakeVariant(true)},
		},
		"/org/bluez/hci0/dev_AA_BB_CC_DD_EE_01": {
			deviceInterface: {
				"Address":   dbus.MakeVariant("AA:BB:CC:DD:EE:01"),
				"Alias":     dbus.MakeVariant("WH-1000XM4"),
				"Icon":      dbus.MakeVariant("audio-headset"),
				"Connected": dbus.MakeVariant(true),
			},
			batteryInterface: {"Percentage": dbus.MakeVariant(byte(70))},
		},
		"/org/bluez/hci0/dev_AA_BB_CC_DD_EE_02": {
			deviceInterface: {
				"Address":   dbus.MakeVariant("AA:BB:CC:DD:EE:02"),
				"Alias":     dbus.MakeVariant(" K380 "),
				"Class":     dbus.MakeVariant(uint32(0x002540)),
				"Connected": dbus.MakeVariant(true),
			},
		},
		"/org/bluez/hci0/dev_AA_BB_CC_DD_EE_03": {
			deviceInterface: {
				"Address":   dbus.MakeVariant("AA:BB:CC:DD:EE:03"),
				"Alias":     dbus.MakeVariant("AA-BB-CC-DD-EE-03"),
				"Connected": dbus.MakeVariant(true),
			},
		},
		"/org/bluez/hci0/dev_AA_BB_CC_DD_EE_04": {
			deviceInterface: {
				"Address":   dbus.MakeVariant("AA:BB:CC:DD:EE:04"),
				"Alias":     dbus.MakeVariant("Pixel"),
				"Icon":      dbus.MakeVariant("phone"),
				"Connected": dbus.MakeVariant(false),
				"Paired":    dbus.MakeVariant(true),
			},
		},
	}
}

var wantDevices = []Device{
	{Key: "AA:BB:CC:DD:EE:01", Name: "WH-1000XM4", Kind: KindHeadphones, Battery: 70, HasBattery: true},
	{Key: "AA:BB:CC:DD:EE:02", Name: "K380", Kind: KindKeyboard},
	{Key: "AA:BB:CC:DD:EE:03"},
}

func sortedByKey(devices []Device) []Device {
	devices = slices.Clone(devices)
	slices.SortFunc(devices, func(a, b Device) int { return strings.Compare(a.Key, b.Key) })
	return devices
}

func TestReadingOfListsConnectedDevices(t *testing.T) {
	got := readingOf(objects())

	if got == nil || got.Connected != 3 || !reflect.DeepEqual(sortedByKey(got.Devices), wantDevices) {
		t.Errorf("readingOf() = %+v, want %+v", got, wantDevices)
	}
}

func TestReadingOfWithoutAdapterIsNothing(t *testing.T) {
	all := objects()
	delete(all, "/org/bluez/hci0")
	if got := readingOf(all); got != nil {
		t.Errorf("readingOf() without an adapter = %+v, want nothing", got)
	}
}

// fakeBlueZ answers GetManagedObjects as BlueZ would.
type fakeBlueZ struct{ objects managedObjects }

func (f fakeBlueZ) GetManagedObjects() (managedObjects, *dbus.Error) {
	return f.objects, nil
}

// startBus starts a D-Bus daemon of its own for the test and points
// DBUS_SYSTEM_BUS_ADDRESS at it. It skips the test where there is no
// dbus-daemon.
func startBus(t *testing.T) {
	t.Helper()
	daemon, err := exec.LookPath("dbus-daemon")
	if err != nil {
		t.Skip("no dbus-daemon")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, daemon, //nolint:gosec // the dbus-daemon found on PATH
		"--session", "--nofork", "--print-address",
		"--address=unix:path="+filepath.Join(t.TempDir(), "bus"))
	out, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cancel()
		_ = cmd.Wait()
	})
	address, err := bufio.NewReader(out).ReadString('\n')
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("DBUS_SYSTEM_BUS_ADDRESS", strings.TrimSpace(address))
}

func TestReaderAsksBlueZ(t *testing.T) {
	startBus(t)
	bluez, err := dbus.ConnectSystemBus()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = bluez.Close() }()
	if err := bluez.Export(fakeBlueZ{objects()}, "/", "org.freedesktop.DBus.ObjectManager"); err != nil {
		t.Fatal(err)
	}
	if reply, err := bluez.RequestName("org.bluez", dbus.NameFlagDoNotQueue); err != nil || reply != dbus.RequestNameReplyPrimaryOwner {
		t.Fatalf("RequestName() = %v, %v", reply, err)
	}

	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	read := NewReader(t.TempDir())
	for range 2 {
		got := read(ctx)
		if got == nil || !reflect.DeepEqual(sortedByKey(got.Devices), wantDevices) {
			t.Errorf("read() = %+v, want %+v", got, wantDevices)
		}
	}
}

func TestReaderCountsLinksWithoutBlueZ(t *testing.T) {
	startBus(t) // a bus without BlueZ on it
	sysDir := t.TempDir()
	for _, name := range []string{"hci0", "hci0:64"} {
		if err := os.MkdirAll(filepath.Join(ClassDir(sysDir), name), 0o750); err != nil {
			t.Fatal(err)
		}
	}

	got := NewReader(sysDir)(t.Context())

	if !reflect.DeepEqual(got, &Reading{Connected: 1}) {
		t.Errorf("read() without BlueZ = %+v, want 1 connected", got)
	}
}

func TestReaderCountsLinksWithoutBus(t *testing.T) {
	t.Setenv("DBUS_SYSTEM_BUS_ADDRESS", "unix:path="+filepath.Join(t.TempDir(), "none"))
	sysDir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(ClassDir(sysDir), "hci0"), 0o750); err != nil {
		t.Fatal(err)
	}

	got := NewReader(sysDir)(t.Context())

	if !reflect.DeepEqual(got, &Reading{Connected: 0}) {
		t.Errorf("read() without a bus = %+v, want 0 connected", got)
	}
}
