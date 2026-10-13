package server

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// fakeBackups writes a small file as the copy of the database, or fails.
type fakeBackups struct {
	dir  string
	err  error
	made []string
}

func (f *fakeBackups) Backup(context.Context) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	path := filepath.Join(f.dir, ".den-watcher-backup-1.db")
	if err := os.WriteFile(path, []byte("SQLite format 3\x00"), 0o600); err != nil {
		return "", err
	}
	f.made = append(f.made, path)
	return path, nil
}

func newBackupHandler(p Password, b Backups) http.Handler {
	return New(Site{Devices: DeviceList(device(fakeCollector{}, nil)), Hub: &fakeHub{}, Password: p, Backups: b, Files: site})
}

func TestBackupSendsTheCopyAndDeletesIt(t *testing.T) {
	backups := &fakeBackups{dir: t.TempDir()}
	handler := newBackupHandler(&fakePassword{password: "correct horse"}, backups)

	rec := send(handler, http.MethodPost, "/api/backup", `{"password":"correct horse"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body)
	}
	if got := rec.Body.String(); got != "SQLite format 3\x00" {
		t.Errorf("body = %q, want the copy", got)
	}
	disposition := rec.Header().Get("Content-Disposition")
	if !regexp.MustCompile(`^attachment; filename="den-watcher-\d{4}-\d{2}-\d{2}\.db"$`).MatchString(disposition) {
		t.Errorf("Content-Disposition = %q, want an attachment named den-watcher-<date>.db", disposition)
	}
	if rec.Header().Get("Content-Type") != "application/vnd.sqlite3" || rec.Header().Get("Content-Length") != "16" {
		t.Errorf("headers = %v, want a SQLite file of 16 bytes", rec.Header())
	}
	if _, err := os.Stat(backups.made[0]); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the copy is still there after sending it (%v)", err)
	}
}

func TestBackupNeedsThePassword(t *testing.T) {
	backups := &fakeBackups{dir: t.TempDir()}
	handler := newBackupHandler(&fakePassword{password: "correct horse"}, backups)

	rec := send(handler, http.MethodPost, "/api/backup", `{"password":"wrong"}`)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rec.Code)
	}
	if len(backups.made) != 0 {
		t.Errorf("a backup was made with a wrong password")
	}
}

func TestBackupOnlyAcceptsJSON(t *testing.T) {
	handler := newBackupHandler(&fakePassword{password: "correct horse"}, &fakeBackups{dir: t.TempDir()})

	req := httptest.NewRequest(http.MethodPost, "/api/backup", strings.NewReader(`{"password":"correct horse"}`))
	req.RemoteAddr = "192.168.1.20:5000"
	req.Host = "192.168.1.9:9393"
	req.Header.Set("Content-Type", "text/plain")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnsupportedMediaType {
		t.Errorf("status = %d, want 415", rec.Code)
	}
}

func TestAFailedBackupAnswers500(t *testing.T) {
	handler := newBackupHandler(&fakePassword{password: "correct horse"}, &fakeBackups{err: errors.New("disk full")})

	rec := send(handler, http.MethodPost, "/api/backup", `{"password":"correct horse"}`)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
}

func TestTheFirstBackupChoosesThePassword(t *testing.T) {
	pw := &fakePassword{}
	handler := newBackupHandler(pw, &fakeBackups{dir: t.TempDir()})

	rec := send(handler, http.MethodPost, "/api/backup", `{"password":"correct horse"}`)

	if rec.Code != http.StatusOK || pw.password != "correct horse" {
		t.Errorf("status = %d, password = %q; want the backup and the password chosen", rec.Code, pw.password)
	}
}

func TestNoBackupWithoutTheDatabase(t *testing.T) {
	handler := newBackupHandler(&fakePassword{password: "correct horse"}, nil)

	if rec := send(handler, http.MethodPost, "/api/backup", `{"password":"correct horse"}`); rec.Code != http.StatusMethodNotAllowed && rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want POST /api/backup left out", rec.Code)
	}
	data := NewDataOnly(fakeCollector{}, nil, nil)
	if rec := send(data, http.MethodPost, "/api/backup", `{"password":"correct horse"}`); rec.Code != http.StatusMethodNotAllowed && rec.Code != http.StatusNotFound {
		t.Errorf("data-only status = %d, want POST /api/backup left out", rec.Code)
	}
}
