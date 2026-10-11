package addons

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/winservice"
)

// childVariable makes the test program act as an add-on den-watcher starts:
// it writes its report, with what LOG_TO_EVENT_LOG holds, and waits to be
// killed.
const childVariable = "ADDONS_TEST_CHILD"

func TestMain(m *testing.M) {
	if os.Getenv(childVariable) == "1" {
		report := filepath.Join(os.Getenv("ADDONS_DIR"), "fake.json")
		if err := os.WriteFile(report, []byte(os.Getenv(winservice.EventLogVariable)), 0o600); err != nil { //nolint:gosec // the test's own folder
			os.Exit(2)
		}
		time.Sleep(time.Minute)
		os.Exit(3)
	}
	os.Exit(m.Run())
}

func TestChildName(t *testing.T) {
	for program, want := range map[string]string{
		filepath.Join("Den-Watcher", "den-watcher-power.exe"): "power",
		filepath.Join("bin", "den-watcher-gpu"):               "gpu",
	} {
		if got := childName(program); got != want {
			t.Errorf("childName(%q) = %q, want %q", program, got, want)
		}
	}
}

func TestStartChildrenRunsTheAddOnAndRemovesItsReportWhenStopped(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	program := filepath.Join(t.TempDir(), "den-watcher-fake"+filepath.Ext(exe))
	copyFile(t, exe, program)
	dir := t.TempDir()
	t.Setenv("ADDONS_DIR", dir)
	t.Setenv(childVariable, "1")

	stop := startChildren(dir, []string{program}, time.Minute, time.Minute)
	report := filepath.Join(dir, "fake.json")
	var got []byte
	for deadline := time.Now().Add(20 * time.Second); time.Now().Before(deadline); time.Sleep(50 * time.Millisecond) {
		if got, err = os.ReadFile(report); err == nil && len(got) > 0 { //nolint:gosec // the test's own folder
			break
		}
	}
	if string(got) != "1" {
		stop()
		t.Fatalf("the add-on wrote %q, want the %s=1 it was started with", got, winservice.EventLogVariable)
	}

	stopped := make(chan struct{})
	go func() { stop(); close(stopped) }()
	select {
	case <-stopped:
	case <-time.After(20 * time.Second):
		t.Fatal("stop did not end the add-on")
	}
	if _, err := os.Stat(report); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the report is still there after stop: %v", err)
	}
}

func TestStartChildrenWithoutAddOnsDoesNothing(t *testing.T) {
	startChildren(t.TempDir(), nil, time.Minute, time.Minute)()
}

func TestSuperviseChildStartsTheAddOnAgainLessAndLessOften(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var mu sync.Mutex
	var starts []time.Time
	done := make(chan struct{})
	go func() {
		superviseChild(ctx, "test", 20*time.Millisecond, 80*time.Millisecond, func(context.Context) error {
			mu.Lock()
			defer mu.Unlock()
			starts = append(starts, time.Now())
			if len(starts) == 5 {
				cancel()
			}
			return errors.New("crashed")
		})
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("superviseChild did not return once ctx was done")
	}
	mu.Lock()
	defer mu.Unlock()
	if len(starts) != 5 {
		t.Fatalf("started %d times, want 5", len(starts))
	}
	// Waits of 20, 40, 80 and 80 ms: doubling, up to the most.
	for i, least := range []time.Duration{20, 40, 80, 80} {
		if gap := starts[i+1].Sub(starts[i]); gap < least*time.Millisecond {
			t.Errorf("wait %d was %v, want at least %v", i+1, gap, least*time.Millisecond)
		}
	}
}

func TestSuperviseChildStopsWhileWaiting(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	runs := 0
	done := make(chan struct{})
	go func() {
		superviseChild(ctx, "test", time.Hour, time.Hour, func(context.Context) error {
			runs++
			// Done while superviseChild waits an hour to run it again.
			time.AfterFunc(50*time.Millisecond, cancel)
			return nil
		})
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("superviseChild kept waiting after ctx was done")
	}
	if runs != 1 {
		t.Errorf("ran %d times, want 1", runs)
	}
}

func copyFile(t *testing.T, from, to string) {
	t.Helper()
	in, err := os.Open(from) //nolint:gosec // the test program itself
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = in.Close() }()
	out, err := os.OpenFile(to, os.O_CREATE|os.O_WRONLY, 0o700) //nolint:gosec // a folder of the test's own
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.Copy(out, in); err != nil {
		t.Fatal(err)
	}
	if err := out.Close(); err != nil {
		t.Fatal(err)
	}
}
