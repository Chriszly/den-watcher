//go:build linux

package bluetooth

import (
	"strings"

	"github.com/godbus/dbus/v5"
)

// managedObjects is what BlueZ's GetManagedObjects returns: the properties of
// each interface of each object it has, such as an adapter or a device.
type managedObjects = map[dbus.ObjectPath]map[string]map[string]dbus.Variant

const (
	adapterInterface = "org.bluez.Adapter1"
	deviceInterface  = "org.bluez.Device1"
	batteryInterface = "org.bluez.Battery1"
)

// readingOf returns the devices BlueZ lists as connected, or nil when it has
// no adapter.
func readingOf(objects managedObjects) *Reading {
	adapters := 0
	var devices []Device
	for _, interfaces := range objects {
		if _, ok := interfaces[adapterInterface]; ok {
			adapters++
		}
		device, ok := interfaces[deviceInterface]
		if !ok {
			continue
		}
		if connected, _ := device["Connected"].Value().(bool); !connected {
			continue
		}
		address, _ := device["Address"].Value().(string)
		d := Device{Key: address, Name: nameOf(device, address), Kind: kindOf(device)}
		if percentage, ok := interfaces[batteryInterface]["Percentage"].Value().(byte); ok && percentage <= 100 {
			d.Battery, d.HasBattery = int(percentage), true
		}
		devices = append(devices, d)
	}
	if adapters == 0 {
		return nil
	}
	return &Reading{Connected: len(devices), Devices: devices}
}

// nameOf returns a device's name: its alias, which is the name its owner gave
// it or else the one it gives itself. BlueZ makes the alias of a device
// without a name from its address, as in AA-BB-CC-DD-EE-FF, which is left out.
func nameOf(device map[string]dbus.Variant, address string) string {
	alias, _ := device["Alias"].Value().(string)
	alias = strings.TrimSpace(alias)
	if alias == "" {
		alias, _ = device["Name"].Value().(string)
		alias = strings.TrimSpace(alias)
	}
	if strings.EqualFold(alias, strings.ReplaceAll(address, ":", "-")) {
		return ""
	}
	return alias
}

// kindOf returns a device's kind from the icon name BlueZ gives it, which it
// works out from the class of a classic device and the appearance of a
// Bluetooth Low Energy one, or else from its class.
func kindOf(device map[string]dbus.Variant) Kind {
	icon, _ := device["Icon"].Value().(string)
	switch icon {
	case "audio-headset", "audio-headphones":
		return KindHeadphones
	case "audio-card":
		return KindSpeaker
	case "input-keyboard":
		return KindKeyboard
	case "input-mouse", "input-tablet":
		return KindMouse
	case "input-gaming":
		return KindGameController
	case "phone":
		return KindPhone
	case "computer":
		return KindComputer
	}
	if class, ok := device["Class"].Value().(uint32); ok {
		return classKind(class)
	}
	return KindOther
}
