package metrics

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestRootDriveIsOnlyTheRootOfADrive(t *testing.T) {
	for root, want := range map[string]string{
		`C:\`:          "C:",
		`d:\`:          "D:",
		`C:\mnt\data\`: "",
		`\\nas\share\`: "",
		``:             "",
	} {
		if got, ok := rootDrive(root); got != want || ok != (want != "") {
			t.Errorf("rootDrive(%q) = %q, %v, want %q", root, got, ok, want)
		}
	}
}

// TestDriveOfFindsTheDriveOfThisMachine checks the drive of a temporary
// folder, which is on a drive and not in a mounted folder, is found on a real
// Windows machine.
func TestDriveOfFindsTheDriveOfThisMachine(t *testing.T) {
	dir := t.TempDir()
	want := strings.ToUpper(filepath.VolumeName(dir))
	if got, ok := driveOf(dir); !ok || got != want {
		t.Errorf("driveOf(%q) = %q, %v, want %q", dir, got, ok, want)
	}
}
