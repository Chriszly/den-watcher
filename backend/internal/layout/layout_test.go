package layout

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

func openTestStore(t *testing.T) *Store {
	t.Helper()
	db, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "layout.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	s, err := Open(context.Background(), db)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	return s
}

func TestALayoutIsEmptyUntilOneIsStored(t *testing.T) {
	got, err := openTestStore(t).Read(context.Background())
	if err != nil {
		t.Fatalf("Read() error = %v", err)
	}
	if got.Folded == nil || len(got.Folded) != 0 {
		t.Errorf("Read() = %#v, want an empty, non-nil Folded", got)
	}
}

func TestTheLastWrittenLayoutIsKept(t *testing.T) {
	ctx := context.Background()
	s := openTestStore(t)
	for _, layout := range []Layout{{Folded: []string{"storage"}}, {Folded: []string{"network", "system"}}} {
		if err := s.Write(ctx, layout); err != nil {
			t.Fatalf("Write(%v) error = %v", layout, err)
		}
	}
	got, err := s.Read(ctx)
	if err != nil {
		t.Fatalf("Read() error = %v", err)
	}
	if want := []string{"network", "system"}; !reflect.DeepEqual(got.Folded, want) {
		t.Errorf("Folded = %v, want %v", got.Folded, want)
	}
}

func TestRefusesALayoutThatIsNotValid(t *testing.T) {
	tooMany := make([]string, MaxEntries+1)
	for i := range tooMany {
		tooMany[i] = strconv.Itoa(i)
	}
	for name, folded := range map[string][]string{
		"empty name":   {""},
		"long name":    {strings.Repeat("a", MaxNameBytes+1)},
		"control":      {"stor\nage"},
		"invalid utf8": {"\xff"},
		"twice":        {"storage", "storage"},
		"too many":     tooMany,
	} {
		t.Run(name, func(t *testing.T) {
			s := openTestStore(t)
			var input *InputError
			if err := s.Write(context.Background(), Layout{Folded: folded}); !errors.As(err, &input) {
				t.Fatalf("Write() error = %v, want an *InputError", err)
			}
			got, err := s.Read(context.Background())
			if err != nil || len(got.Folded) != 0 {
				t.Errorf("Read() = %v, %v; want the refused layout not stored", got, err)
			}
		})
	}
}
