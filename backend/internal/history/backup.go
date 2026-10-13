package history

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
)

// backupPattern names the copies Backup makes next to the database until
// they are sent, the * standing for what makes each one unique.
const backupPattern = ".den-watcher-backup-*.db"

// Backup writes a consistent copy of the database, with SQLite's VACUUM INTO,
// to a new file in the folder of the database, and returns its path; the
// caller deletes it. The copy is made while the recorders go on writing, and
// takes as much space as the database without its free pages. The folder of
// the database is used as it is writable, and a temporary folder may be too
// small or, in a container, in memory.
func (s *Store) Backup(ctx context.Context) (string, error) {
	file, err := os.CreateTemp(filepath.Dir(s.path), backupPattern)
	if err != nil {
		return "", err
	}
	path := file.Name()
	// VACUUM INTO writes into an empty file, which it is.
	if err := file.Close(); err != nil {
		_ = os.Remove(path)
		return "", err
	}
	if _, err := s.db.ExecContext(ctx, "VACUUM INTO ?", path); err != nil {
		_ = os.Remove(path)
		return "", err
	}
	return path, nil
}

// removeBackups deletes the copies Backup left next to the database at path
// when the program stopped while sending one.
func removeBackups(path string) {
	left, _ := filepath.Glob(filepath.Join(filepath.Dir(path), backupPattern))
	for _, file := range left {
		if err := os.Remove(file); err != nil && !errors.Is(err, os.ErrNotExist) {
			slog.Warn("could not delete a backup left from before", "path", file, "error", err)
		}
	}
}
