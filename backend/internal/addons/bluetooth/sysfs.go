//go:build linux

package bluetooth

import (
	"errors"
	"io/fs"
	"os"
	"regexp"
)

var (
	// adapterName is an adapter's entry in /sys/class/bluetooth, such as
	// hci0, and linkName a connection's, such as hci0:3585: the kernel adds
	// one, named after the adapter and the connection's handle, while the
	// connection lasts.
	adapterName = regexp.MustCompile(`^hci[0-9]+$`)
	linkName    = regexp.MustCompile(`^hci[0-9]+:[0-9]+$`)
)

// countLinks reads dir, the kernel's /sys/class/bluetooth, and returns the
// connections it lists, or nil when it lists no adapter, as on a machine
// without Bluetooth. A device connected for audio and calls can have two
// connections, so the count can be higher than the devices connected.
func countLinks(dir string) (*Reading, error) {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	adapters, links := 0, 0
	for _, entry := range entries {
		switch {
		case adapterName.MatchString(entry.Name()):
			adapters++
		case linkName.MatchString(entry.Name()):
			links++
		}
	}
	if adapters == 0 {
		return nil, nil
	}
	return &Reading{Connected: links}, nil
}
