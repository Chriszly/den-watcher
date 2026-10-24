package bluetooth

import (
	"fmt"
	"runtime"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	cfgmgr32       = windows.NewLazySystemDLL("cfgmgr32.dll")
	devGetObjects  = cfgmgr32.NewProc("DevGetObjects")
	devFreeObjects = cfgmgr32.NewProc("DevFreeObjects")
)

// devObjectTypeAEP is DevObjectTypeAEP: an association endpoint, which is how
// Windows' device query lists a paired Bluetooth device.
const devObjectTypeAEP = 5

// The operators of a device query's filter, from devfiltertypes.h.
const (
	devpropOperatorEquals   = 0x2
	devpropOperatorAndOpen  = 0x100000
	devpropOperatorAndClose = 0x200000
)

// The properties of an association endpoint read here, from propkey.h.
var (
	pkeyItemNameDisplay = windows.DEVPROPKEY{
		FmtID: windows.DEVPROPGUID{Data1: 0xb725f130, Data2: 0x47ef, Data3: 0x101a, Data4: [8]byte{0xa5, 0xf1, 0x02, 0x60, 0x8c, 0x9e, 0xeb, 0xac}},
		PID:   10,
	}
	pkeyAepDeviceAddress = windows.DEVPROPKEY{FmtID: aepGUID, PID: 12}
	pkeyAepIsConnected   = windows.DEVPROPKEY{FmtID: aepGUID, PID: 7}
	pkeyAepIsPaired      = windows.DEVPROPKEY{FmtID: aepGUID, PID: 16}
	pkeyAepProtocolID    = windows.DEVPROPKEY{
		FmtID: windows.DEVPROPGUID{Data1: 0x3b2ce006, Data2: 0x5e61, Data3: 0x4fde, Data4: [8]byte{0xba, 0xb8, 0x9b, 0x8a, 0xac, 0x9b, 0x26, 0xdf}},
		PID:   5,
	}
	pkeyAepLeAppearance = windows.DEVPROPKEY{
		FmtID: windows.DEVPROPGUID{Data1: 0x995ef0b0, Data2: 0x7eb3, Data3: 0x4a8b, Data4: [8]byte{0xb9, 0xce, 0x06, 0x8b, 0xb3, 0xf4, 0xaf, 0x69}},
		PID:   1,
	}
	aepGUID = windows.DEVPROPGUID{Data1: 0xa35996ab, Data2: 0x11cf, Data3: 0x4935, Data4: [8]byte{0x8b, 0x61, 0xa6, 0x76, 0x10, 0x81, 0xec, 0xdf}}

	// leProtocol is the protocol id of Bluetooth Low Energy endpoints.
	leProtocol = windows.GUID{Data1: 0xbb7bb05e, Data2: 0x5972, Data3: 0x42b5, Data4: [8]byte{0x94, 0xfc, 0x76, 0xea, 0xa7, 0x08, 0x4d, 0x49}}
)

// devPropCompKey is DEVPROPCOMPKEY.
type devPropCompKey struct {
	key    windows.DEVPROPKEY
	store  uint32
	locale *uint16
}

// devProperty is DEVPROPERTY.
type devProperty struct {
	compKey    devPropCompKey
	typ        windows.DEVPROPTYPE
	bufferSize uint32
	buffer     unsafe.Pointer
}

// devPropFilterExpression is DEVPROP_FILTER_EXPRESSION.
type devPropFilterExpression struct {
	operator uint32
	property devProperty
}

// devObject is DEV_OBJECT.
type devObject struct {
	objectType    uint32
	objectID      *uint16
	propertyCount uint32
	properties    *devProperty
}

// leEndpoint is what Windows tells of a paired Bluetooth LE device.
type leEndpoint struct {
	name       string
	address    string
	connected  bool
	appearance uint16
}

// findLEDevices lists the paired Bluetooth Low Energy devices, such as most
// newer keyboards, mice and game controllers, which the classic API does not
// list. It asks Windows' device query in cfgmgr32.dll, the plain-DLL side of
// what Windows' own Bluetooth settings list. It asks only for paired devices,
// as asking for others would make the radio scan for them.
//
//nolint:gosec // cfgmgr32.dll takes and returns pointers, which need unsafe.
func findLEDevices() ([]leEndpoint, error) {
	if err := cfgmgr32.Load(); err != nil {
		return nil, nil // older than Windows 10 1809: no device query
	}
	if err := devGetObjects.Find(); err != nil {
		return nil, nil
	}
	keys := []devPropCompKey{
		{key: pkeyItemNameDisplay},
		{key: pkeyAepDeviceAddress},
		{key: pkeyAepIsConnected},
		{key: pkeyAepLeAppearance},
	}
	protocol := leProtocol
	paired := byte(0xff) // DEVPROP_TRUE
	filters := []devPropFilterExpression{
		{operator: devpropOperatorAndOpen},
		{operator: devpropOperatorEquals, property: devProperty{
			compKey: devPropCompKey{key: pkeyAepProtocolID},
			typ:     windows.DEVPROP_TYPE_GUID, bufferSize: uint32(unsafe.Sizeof(protocol)), buffer: unsafe.Pointer(&protocol),
		}},
		{operator: devpropOperatorEquals, property: devProperty{
			compKey: devPropCompKey{key: pkeyAepIsPaired},
			typ:     windows.DEVPROP_TYPE_BOOLEAN, bufferSize: 1, buffer: unsafe.Pointer(&paired),
		}},
		{operator: devpropOperatorAndClose},
	}
	var count uint32
	var objects *devObject
	hr, _, _ := devGetObjects.Call(devObjectTypeAEP, 0,
		uintptr(len(keys)), uintptr(unsafe.Pointer(&keys[0])),
		uintptr(len(filters)), uintptr(unsafe.Pointer(&filters[0])),
		uintptr(unsafe.Pointer(&count)), uintptr(unsafe.Pointer(&objects)))
	runtime.KeepAlive(keys)
	runtime.KeepAlive(filters)
	runtime.KeepAlive(&protocol)
	runtime.KeepAlive(&paired)
	if int32(hr) < 0 {
		return nil, fmt.Errorf("DevGetObjects: %w", windows.Errno(hr))
	}
	if objects == nil {
		return nil, nil
	}
	defer devFreeObjects.Call(uintptr(count), uintptr(unsafe.Pointer(objects))) //nolint:errcheck // returns nothing
	var endpoints []leEndpoint
	for _, object := range unsafe.Slice(objects, count) {
		var e leEndpoint
		for _, p := range unsafe.Slice(object.properties, object.propertyCount) {
			if p.buffer == nil || p.bufferSize == 0 {
				continue
			}
			value := unsafe.Slice((*byte)(p.buffer), p.bufferSize)
			switch {
			case p.compKey.key == pkeyItemNameDisplay && p.typ == windows.DEVPROP_TYPE_STRING:
				e.name = utf16String(value)
			case p.compKey.key == pkeyAepDeviceAddress && p.typ == windows.DEVPROP_TYPE_STRING:
				e.address = utf16String(value)
			case p.compKey.key == pkeyAepIsConnected && p.typ == windows.DEVPROP_TYPE_BOOLEAN:
				e.connected = value[0] != 0
			case p.compKey.key == pkeyAepLeAppearance && p.typ == windows.DEVPROP_TYPE_UINT16 && len(value) >= 2:
				e.appearance = uint16(value[0]) | uint16(value[1])<<8
			}
		}
		endpoints = append(endpoints, e)
	}
	return endpoints, nil
}

// utf16String returns the NUL-terminated UTF-16 string in b.
func utf16String(b []byte) string {
	u := make([]uint16, len(b)/2)
	for i := range u {
		u[i] = uint16(b[2*i]) | uint16(b[2*i+1])<<8
	}
	return windows.UTF16ToString(u)
}

// leDevices returns the connected devices of endpoints, keyed by their
// address as the classic devices are.
func leDevices(endpoints []leEndpoint) []Device {
	var devices []Device
	for _, e := range endpoints {
		if !e.connected || e.address == "" {
			continue
		}
		devices = append(devices, Device{
			Key:  strings.ToUpper(strings.NewReplacer(":", "", "-", "").Replace(e.address)),
			Name: e.name,
			Kind: appearanceKind(e.appearance),
		})
	}
	return devices
}
