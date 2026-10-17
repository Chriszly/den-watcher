package metrics

import (
	"context"
	"path/filepath"
	"strings"

	"github.com/shirou/gopsutil/v4/disk"
	"golang.org/x/sys/windows"
)

// readDiskCounters returns the counters of the drive holding each path, such
// as C: for C:\. Windows keeps them per drive letter, and gopsutil only reads
// them for local drives, which do not wait for a server. A path on a volume
// mounted in a folder has none (see driveOf).
func readDiskCounters(ctx context.Context, paths []string, _ map[string]deviceNumber) map[string]ioCounters {
	// gopsutil returns the drives it could read together with an error
	// about the others, so the readings are used even if err is set.
	stats, _ := disk.IOCountersWithContext(ctx)
	result := make(map[string]ioCounters, len(paths))
	for _, path := range paths {
		drive, ok := driveOf(path)
		if !ok {
			continue
		}
		if s, ok := stats[drive]; ok {
			result[path] = ioCounters{read: s.ReadBytes, written: s.WriteBytes, operations: s.ReadCount + s.WriteCount}
		}
	}
	return result
}

// driveOf returns the drive letter, such as C:, of the volume holding path,
// or false when that volume is mounted in a folder, such as C:\mnt\data:
// it has no drive letter to find its counters by, and those of the drive the
// folder is on would be another disk's.
func driveOf(path string) (string, bool) {
	return rootDrive(volumeRoot(path))
}

// volumeRoot returns the folder the volume holding path is mounted at, such
// as C:\ or C:\mnt\data\, or the root of its drive when Windows cannot tell.
func volumeRoot(path string) string {
	name, err := windows.UTF16PtrFromString(path)
	if err == nil {
		root := make([]uint16, max(len(path)+2, windows.MAX_PATH+1))
		if err = windows.GetVolumePathName(name, &root[0], uint32(len(root))); err == nil {
			return windows.UTF16ToString(root)
		}
	}
	return filepath.VolumeName(path) + `\`
}

// rootDrive returns the drive letter of root when it is the root of a
// drive, such as C:\, and false for any other folder.
func rootDrive(root string) (string, bool) {
	drive := filepath.VolumeName(root)
	if len(drive) != 2 || drive[1] != ':' || root != drive+`\` {
		return "", false
	}
	return strings.ToUpper(drive), true
}

// diskDevice returns no device: Windows finds the counters by drive letter.
func diskDevice(string) (deviceNumber, bool) {
	return deviceNumber{}, false
}
