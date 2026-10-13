package metrics

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseOSRelease(t *testing.T) {
	tests := []struct {
		text string
		want string
	}{
		{"NAME=\"Debian GNU/Linux\"\nVERSION=\"13 (trixie)\"\nPRETTY_NAME=\"Debian GNU/Linux 13 (trixie)\"\n", "Debian GNU/Linux 13 (trixie)"},
		{"# comment\nNAME='Alpine Linux'\nVERSION=3.22\n", "Alpine Linux 3.22"},
		{"NAME=Arch\n", "Arch"},
		{"", ""},
	}
	for _, tt := range tests {
		if got := parseOSRelease(tt.text); got != tt.want {
			t.Errorf("parseOSRelease(%q) = %q, want %q", tt.text, got, tt.want)
		}
	}
}

func TestReadOSInContainer(t *testing.T) {
	t.Setenv("HOST_PROC", "/host/proc")
	t.Setenv("HOST_ETC", "")
	if got := readOS(t.Context()); got != "" {
		t.Errorf("readOS() without HOST_ETC = %q, want none, as /etc is the container's", got)
	}
	etc := t.TempDir()
	writeFile(t, filepath.Join(etc, "os-release"), "PRETTY_NAME=\"Raspberry Pi OS\"\n")
	t.Setenv("HOST_ETC", etc)
	if got := readOS(t.Context()); got != "Raspberry Pi OS" {
		t.Errorf("readOS() = %q, want the host's", got)
	}
}

func TestReadBoard(t *testing.T) {
	sys := t.TempDir()
	t.Setenv("HOST_SYS", sys)
	if maker, model := readBoard(); maker != "" || model != "" {
		t.Errorf("readBoard() without files = %q, %q, want none", maker, model)
	}
	dmi := filepath.Join(sys, "class", "dmi", "id")
	writeFile(t, filepath.Join(dmi, "sys_vendor"), "LENOVO\n")
	writeFile(t, filepath.Join(dmi, "product_name"), "To Be Filled By O.E.M.\n")
	if maker, model := readBoard(); maker != "LENOVO" || model != "" {
		t.Errorf("readBoard() from DMI = %q, %q, want LENOVO without the placeholder", maker, model)
	}
	writeFile(t, filepath.Join(sys, "firmware", "devicetree", "base", "model"), "Raspberry Pi 5 Model B Rev 1.0\x00")
	if maker, model := readBoard(); maker != "" || model != "Raspberry Pi 5 Model B Rev 1.0" {
		t.Errorf("readBoard() from the device tree = %q, %q", maker, model)
	}
}

func writeFile(t *testing.T, path, text string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(text), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestReadSystemTellsTheKernel(t *testing.T) {
	s := readSystem(t.Context())
	if s == nil || s.Kernel == "" || s.Architecture == "" {
		t.Errorf("readSystem() = %+v, want at least the kernel and architecture", s)
	}
}
