package bluetooth

import (
	"context"
	"reflect"
	"testing"
	"unsafe"

	"golang.org/x/sys/windows"
)

// The structures must have the sizes and offsets Windows' own have on 64-bit
// Windows, the only one the installer is built for.
func TestStructuresMatchWindows(t *testing.T) {
	if got := unsafe.Sizeof(deviceSearchParams{}); got != 40 {
		t.Errorf("BLUETOOTH_DEVICE_SEARCH_PARAMS takes %d bytes, want 40", got)
	}
	if got := unsafe.Sizeof(deviceInfo{}); got != 560 {
		t.Errorf("BLUETOOTH_DEVICE_INFO takes %d bytes, want 560", got)
	}
	if got := unsafe.Offsetof(deviceInfo{}.address); got != 8 {
		t.Errorf("Address is at %d, want 8", got)
	}
	if got := unsafe.Offsetof(deviceInfo{}.name); got != 64 {
		t.Errorf("szName is at %d, want 64", got)
	}
}

func TestReadingOfInfosKeepsConnectedDevices(t *testing.T) {
	name := func(s string) (n [248]uint16) {
		copy(n[:], windows.StringToUTF16(s))
		return n
	}
	got := readingOfInfos([]deviceInfo{
		{address: 0xaabbccddee01, classOfDevice: 0x240418, connected: 1, name: name("WH-1000XM5")},
		{address: 0xaabbccddee02, classOfDevice: 0x5a020c, remembered: 1, name: name("Pixel")},
	})

	want := &Reading{Connected: 1, Devices: []Device{{Key: "AABBCCDDEE01", Name: "WH-1000XM5", Kind: KindHeadphones}}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("readingOfInfos() = %+v, want %+v", got, want)
	}
}

// The machine may have no Bluetooth, as a CI runner has none; the reader must
// then report nothing rather than fail.
func TestNewReaderReadsThisMachine(t *testing.T) {
	read := NewReader("")
	for range 2 {
		got := read(context.Background())
		t.Logf("read %+v", got)
		if got != nil && got.Connected != len(got.Devices) {
			t.Errorf("read() = %+v, want a device per connection", got)
		}
	}
}
