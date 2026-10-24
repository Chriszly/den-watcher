package bluetooth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	bluetoothapis            = windows.NewLazySystemDLL("bluetoothapis.dll")
	bluetoothFindFirstRadio  = bluetoothapis.NewProc("BluetoothFindFirstRadio")
	bluetoothFindRadioClose  = bluetoothapis.NewProc("BluetoothFindRadioClose")
	bluetoothFindFirstDevice = bluetoothapis.NewProc("BluetoothFindFirstDevice")
	bluetoothFindNextDevice  = bluetoothapis.NewProc("BluetoothFindNextDevice")
	bluetoothFindDeviceClose = bluetoothapis.NewProc("BluetoothFindDeviceClose")
)

// findRadioParams is BLUETOOTH_FIND_RADIO_PARAMS.
type findRadioParams struct {
	size uint32
}

// deviceSearchParams is BLUETOOTH_DEVICE_SEARCH_PARAMS.
type deviceSearchParams struct {
	size                uint32
	returnAuthenticated int32
	returnRemembered    int32
	returnUnknown       int32
	returnConnected     int32
	issueInquiry        int32
	timeoutMultiplier   uint8
	radio               windows.Handle
}

// deviceInfo is BLUETOOTH_DEVICE_INFO, of 560 bytes on 64-bit Windows.
type deviceInfo struct {
	size          uint32
	address       uint64
	classOfDevice uint32
	connected     int32
	remembered    int32
	authenticated int32
	lastSeen      windows.Systemtime
	lastUsed      windows.Systemtime
	name          [248]uint16
}

// NewReader returns what reads the connected devices, with their name and
// kind: the classic devices, such as headsets, speakers and older keyboards
// and mice, through Windows' Bluetooth API in bluetoothapis.dll, and the
// Bluetooth Low Energy ones, such as newer game controllers, keyboards and
// mice, through Windows' device query (see le_windows.go). Without a
// Bluetooth radio it reads nothing. Why it cannot read is logged once, and
// again when it changes. The sysDir of other systems means nothing here.
func NewReader(string) func(context.Context) *Reading {
	logged := ""
	return func(context.Context) *Reading {
		reading, err := readDevices()
		problem := ""
		if err != nil {
			problem = err.Error()
		}
		if problem != logged {
			if problem != "" {
				slog.Warn("the Bluetooth devices cannot be read", "error", err)
			} else {
				slog.Info("the Bluetooth devices can be read again")
			}
			logged = problem
		}
		return reading
	}
}

// readDevices returns the connected devices, or nil when there is no radio.
// When it cannot tell whether there is a radio, as when the service's
// account may not open it, it lists the devices anyway and says why too.
func readDevices() (*Reading, error) {
	if err := bluetoothapis.Load(); err != nil {
		return nil, errors.New("windows has no Bluetooth API (bluetoothapis.dll) here")
	}
	present, radioErr := hasRadio()
	if radioErr == nil && !present {
		return nil, nil
	}
	infos, err := findDevices()
	if err != nil {
		return nil, errors.Join(radioErr, err)
	}
	endpoints, leErr := findLEDevices()
	return readingOf(infos, leDevices(endpoints)), errors.Join(radioErr, leErr)
}

// hasRadio reports whether the computer has a Bluetooth radio that is on.
//
//nolint:gosec // bluetoothapis.dll takes and returns pointers, which need unsafe.
func hasRadio() (bool, error) {
	params := findRadioParams{size: uint32(unsafe.Sizeof(findRadioParams{}))}
	var radio windows.Handle
	find, _, callErr := bluetoothFindFirstRadio.Call(uintptr(unsafe.Pointer(&params)), uintptr(unsafe.Pointer(&radio)))
	if find == 0 {
		if errors.Is(callErr, windows.ERROR_NO_MORE_ITEMS) {
			return false, nil
		}
		return false, fmt.Errorf("BluetoothFindFirstRadio: %w", callErr)
	}
	_ = windows.CloseHandle(radio)
	_, _, _ = bluetoothFindRadioClose.Call(find)
	return true, nil
}

// findDevices lists the devices Windows remembers or has connected, without
// searching for others: an inquiry would make the radio scan.
//
//nolint:gosec // bluetoothapis.dll takes and returns pointers, which need unsafe.
func findDevices() ([]deviceInfo, error) {
	params := deviceSearchParams{
		size:             uint32(unsafe.Sizeof(deviceSearchParams{})),
		returnRemembered: 1,
		returnConnected:  1,
	}
	info := deviceInfo{size: uint32(unsafe.Sizeof(deviceInfo{}))}
	find, _, callErr := bluetoothFindFirstDevice.Call(uintptr(unsafe.Pointer(&params)), uintptr(unsafe.Pointer(&info)))
	if find == 0 {
		if errors.Is(callErr, windows.ERROR_NO_MORE_ITEMS) {
			return nil, nil
		}
		return nil, fmt.Errorf("BluetoothFindFirstDevice: %w", callErr)
	}
	defer bluetoothFindDeviceClose.Call(find) //nolint:errcheck // nothing to do when closing fails
	infos := []deviceInfo{info}
	for {
		info = deviceInfo{size: uint32(unsafe.Sizeof(deviceInfo{}))}
		if ok, _, _ := bluetoothFindNextDevice.Call(find, uintptr(unsafe.Pointer(&info))); ok == 0 {
			return infos, nil
		}
		infos = append(infos, info)
	}
}

// readingOf returns the connected classic devices of infos, and the
// connected LE devices le that are not among them: a device that speaks both
// shows once.
func readingOf(infos []deviceInfo, le []Device) *Reading {
	reading := &Reading{}
	for _, info := range infos {
		if info.connected == 0 {
			continue
		}
		reading.Devices = append(reading.Devices, Device{
			Key:  fmt.Sprintf("%012X", info.address&0xffffffffffff),
			Name: windows.UTF16ToString(info.name[:]),
			Kind: classKind(info.classOfDevice),
		})
	}
	for _, d := range le {
		if !slices.ContainsFunc(reading.Devices, func(c Device) bool { return c.Key == d.Key }) {
			reading.Devices = append(reading.Devices, d)
		}
	}
	reading.Connected = len(reading.Devices)
	return reading
}
