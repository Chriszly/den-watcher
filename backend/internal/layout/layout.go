// Package layout keeps how the page is arranged, such as which categories of
// cards are folded, on the machine that serves it, so every browser that opens
// the page shows the same arrangement.
package layout

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"unicode"
	"unicode/utf8"
)

// MaxEntries and MaxNameBytes limit a layout sent by the page: more entries
// than the page has categories, and longer names than it uses.
const (
	MaxEntries   = 50
	MaxNameBytes = 50
)

// Layout is how the page is arranged.
type Layout struct {
	// Folded are the categories of cards that show only their title, such
	// as "storage".
	Folded []string `json:"folded"`
}

// InputError tells what is wrong with a layout sent by the page.
type InputError struct{ Message string }

func (e *InputError) Error() string { return e.Message }

const schema = `
CREATE TABLE IF NOT EXISTS page_layout (
	id     INTEGER PRIMARY KEY CHECK (id = 1), -- there is only one layout
	layout TEXT NOT NULL                       -- the Layout as JSON
);
`

// Store keeps the layout in the database.
type Store struct{ db *sql.DB }

// Open creates the layout's table in db when it does not exist yet.
func Open(ctx context.Context, db *sql.DB) (*Store, error) {
	if _, err := db.ExecContext(ctx, schema); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

// Read returns the stored layout; an empty one when none was stored yet.
func (s *Store) Read(ctx context.Context) (Layout, error) {
	var stored string
	err := s.db.QueryRowContext(ctx, `SELECT layout FROM page_layout WHERE id = 1`).Scan(&stored)
	if errors.Is(err, sql.ErrNoRows) {
		return Layout{Folded: []string{}}, nil
	}
	if err != nil {
		return Layout{}, err
	}
	var layout Layout
	if err := json.Unmarshal([]byte(stored), &layout); err != nil {
		return Layout{}, fmt.Errorf("read the stored layout: %w", err)
	}
	if layout.Folded == nil {
		layout.Folded = []string{}
	}
	return layout, nil
}

// Write checks the layout and stores it in place of the one before. A layout
// that is not valid is an *InputError.
func (s *Store) Write(ctx context.Context, layout Layout) error {
	if err := check(layout.Folded); err != nil {
		return err
	}
	stored, err := json.Marshal(layout)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO page_layout (id, layout) VALUES (1, ?)
		ON CONFLICT (id) DO UPDATE SET layout = excluded.layout`, string(stored))
	return err
}

// check checks the folded categories: few enough, each short, printable and
// named once.
func check(names []string) error {
	if len(names) > MaxEntries {
		return &InputError{fmt.Sprintf("folded has more than %d entries", MaxEntries)}
	}
	seen := make(map[string]bool, len(names))
	for _, name := range names {
		if name == "" || len(name) > MaxNameBytes || !utf8.ValidString(name) || !printable(name) {
			return &InputError{fmt.Sprintf("each entry of folded must be printable text of 1 to %d bytes", MaxNameBytes)}
		}
		if seen[name] {
			return &InputError{fmt.Sprintf("folded names %q twice", name)}
		}
		seen[name] = true
	}
	return nil
}

func printable(name string) bool {
	for _, r := range name {
		if !unicode.IsPrint(r) {
			return false
		}
	}
	return true
}
