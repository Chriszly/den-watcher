//go:build unix

package metrics

import (
	"path/filepath"
	"syscall"
	"testing"
	"time"
)

func TestAddOnsSkipANamedPipe(t *testing.T) {
	dir := t.TempDir()
	if err := syscall.Mkfifo(filepath.Join(dir, "pipe.json"), 0o600); err != nil {
		t.Skipf("no named pipe here: %v", err)
	}
	read := make(chan []Extra, 1)
	go func() { read <- (&AddOns{Dir: dir}).Read(time.Now()) }()
	select {
	case extras := <-read:
		if len(extras) != 0 {
			t.Errorf("Read() = %+v, want nothing", extras)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Read() waits on a named pipe")
	}
}
