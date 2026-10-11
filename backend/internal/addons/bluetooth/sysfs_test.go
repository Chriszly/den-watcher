//go:build linux

package bluetooth

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestCountLinks(t *testing.T) {
	dir := t.TempDir()
	if got, err := countLinks(filepath.Join(dir, "missing")); got != nil || err != nil {
		t.Errorf("countLinks() without the folder = %+v, %v, want nothing", got, err)
	}
	if got, err := countLinks(dir); got != nil || err != nil {
		t.Errorf("countLinks() without an adapter = %+v, %v, want nothing", got, err)
	}
	for _, name := range []string{"hci0", "hci0:3585", "hci0:12", "rfcomm0"} {
		if err := os.Mkdir(filepath.Join(dir, name), 0o750); err != nil {
			t.Fatal(err)
		}
	}
	got, err := countLinks(dir)
	if err != nil || !reflect.DeepEqual(got, &Reading{Connected: 2}) {
		t.Errorf("countLinks() = %+v, %v, want 2 connected", got, err)
	}
}
