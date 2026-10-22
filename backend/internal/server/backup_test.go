package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeBackups writes a small file as the copy of the database, or fails.
type fakeBackups struct {
	dir  string
	err  error
	made []string
	// started and copied, when set, are closed when a copy starts, and
	// awaited before it ends.
	started, copied chan struct{}

	mu sync.Mutex
	// copying is how many copies are being made now, most the most at once.
	copying, most int
}

func (f *fakeBackups) Backup(context.Context) (string, error) {
	f.mu.Lock()
	f.copying++
	f.most = max(f.most, f.copying)
	f.mu.Unlock()
	defer func() {
		f.mu.Lock()
		f.copying--
		f.mu.Unlock()
	}()
	if f.started != nil {
		close(f.started)
		<-f.copied
	} else {
		time.Sleep(20 * time.Millisecond)
	}
	if f.err != nil {
		return "", f.err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	path := filepath.Join(f.dir, fmt.Sprintf(".den-watcher-backup-%d.db", len(f.made)+1))
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
	data := NewDataOnly(fakeCollector{}, nil, nil, nil)
	if rec := send(data, http.MethodPost, "/api/backup", `{"password":"correct horse"}`); rec.Code != http.StatusMethodNotAllowed && rec.Code != http.StatusNotFound {
		t.Errorf("data-only status = %d, want POST /api/backup left out", rec.Code)
	}
}

func TestABackupDoesNotHoldUpChanges(t *testing.T) {
	backups := &fakeBackups{dir: t.TempDir(), started: make(chan struct{}), copied: make(chan struct{})}
	hub := &fakeHub{}
	handler := New(Site{Devices: DeviceList(device(fakeCollector{}, nil)), Hub: hub, Password: &fakePassword{password: "correct horse"}, Backups: backups, Files: site})

	backedUp := make(chan int)
	go func() {
		backedUp <- send(handler, http.MethodPost, "/api/backup", `{"password":"correct horse"}`).Code
	}()
	<-backups.started
	removed := make(chan int)
	go func() {
		removed <- send(handler, http.MethodDelete, "/api/devices/nas", `{"password":"correct horse"}`).Code
	}()
	select {
	case code := <-removed:
		if code != http.StatusNoContent {
			t.Errorf("removal during a backup: status = %d, want 204", code)
		}
	case <-time.After(5 * time.Second):
		t.Error("the removal waits for the backup")
	}
	close(backups.copied)
	if code := <-backedUp; code != http.StatusOK {
		t.Errorf("backup status = %d, want 200", code)
	}
}

func TestBackupsAreMadeOneAtATime(t *testing.T) {
	backups := &fakeBackups{dir: t.TempDir()}
	handler := newBackupHandler(&fakePassword{password: "correct horse"}, backups)

	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			if rec := send(handler, http.MethodPost, "/api/backup", `{"password":"correct horse"}`); rec.Code != http.StatusOK {
				t.Errorf("status = %d, want 200", rec.Code)
			}
		})
	}
	wg.Wait()
	if backups.most != 1 {
		t.Errorf("%d copies were made at once, want 1", backups.most)
	}
}
