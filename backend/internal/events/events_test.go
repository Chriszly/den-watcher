package events

import (
	"context"
	"errors"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/history"
	"github.com/Chriszly/den-watcher/backend/internal/metrics"
)

// usage reads a snapshot, or fails while err is set.
type usage struct {
	snapshot metrics.Snapshot
	err      error
}

func (u *usage) Collect(context.Context) (metrics.Snapshot, error) {
	return u.snapshot, u.err
}

func openTest(t *testing.T, path string, targets *[]Target) *Log {
	t.Helper()
	store, err := history.Open(context.Background(), path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	l, err := Open(context.Background(), store.DB(), func() []Target { return *targets }, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return l
}

func reading(uptime uint64, version string) metrics.Snapshot {
	return metrics.Snapshot{UptimeSeconds: uptime, Version: version}
}

func between(t *testing.T, l *Log, device string) []Event {
	t.Helper()
	list, err := l.Between(context.Background(), device, time.Unix(0, 0), time.Unix(2_000_000_000, 0))
	if err != nil {
		t.Fatal(err)
	}
	return list
}

func TestKeepsRebootsAndUpdates(t *testing.T) {
	ctx := context.Background()
	u := &usage{snapshot: reading(3600, "1.4.0")}
	targets := []Target{{ID: "nas", Usage: u}}
	l := openTest(t, filepath.Join(t.TempDir(), "events.db"), &targets)
	now := time.Unix(1_800_000_000, 0)

	// The first reading only notes how the device is.
	l.Check(ctx, now)
	u.snapshot = reading(3615, "1.4.0")
	l.Check(ctx, now.Add(Interval))
	if got := between(t, l, "nas"); len(got) != 0 {
		t.Fatalf("without a change: %+v", got)
	}

	// It started again 10 seconds ago, with a new version.
	u.snapshot = reading(10, "1.5.0")
	at := now.Add(2 * Interval)
	l.Check(ctx, at)
	want := []Event{
		{Time: at.Add(-10 * time.Second), Kind: KindReboot},
		{Time: at, Kind: KindUpdate, Detail: "1.5.0"},
	}
	if got := between(t, l, "nas"); !reflect.DeepEqual(got, want) {
		t.Fatalf("events = %+v, want %+v", got, want)
	}

	// A device that does not answer, and readings without uptime or version,
	// such as of a printer or a router, change nothing.
	u.err = errors.New("no answer")
	l.Check(ctx, at.Add(Interval))
	u.err = nil
	u.snapshot = reading(0, "")
	l.Check(ctx, at.Add(2*Interval))
	u.snapshot = reading(40, "1.5.0")
	l.Check(ctx, at.Add(3*Interval))
	if got := between(t, l, "nas"); !reflect.DeepEqual(got, want) {
		t.Fatalf("events = %+v, want only %+v", got, want)
	}
}

func TestNoticesARebootWhileTheHubWasStopped(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "events.db")
	u := &usage{snapshot: reading(86400, "1.4.0")}
	targets := []Target{{ID: "local", Usage: u}}
	now := time.Unix(1_800_000_000, 0)
	openTest(t, path, &targets).Check(ctx, now)

	u.snapshot = reading(120, "1.5.0")
	later := now.Add(time.Hour)
	l := openTest(t, path, &targets)
	l.Check(ctx, later)
	want := []Event{
		{Time: later.Add(-2 * time.Minute), Kind: KindReboot},
		{Time: later, Kind: KindUpdate, Detail: "1.5.0"},
	}
	if got := between(t, l, "local"); !reflect.DeepEqual(got, want) {
		t.Fatalf("events = %+v, want %+v", got, want)
	}
}

func TestBetweenAndPruneKeepToTheirTime(t *testing.T) {
	ctx := context.Background()
	targets := []Target{}
	l := openTest(t, filepath.Join(t.TempDir(), "events.db"), &targets)
	old := time.Now().Add(-48 * time.Hour).Truncate(time.Second)
	recent := time.Now().Add(-time.Hour).Truncate(time.Second)
	l.note(ctx, "pc", 1000, "1.0.0", old)
	l.note(ctx, "pc", 10, "1.0.0", old.Add(time.Minute))
	l.note(ctx, "pc", 1000, "1.0.0", recent)
	l.note(ctx, "pc", 10, "1.0.0", recent.Add(time.Minute))

	got, err := l.Between(ctx, "pc", recent.Add(-time.Minute), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || !got[0].Time.Equal(recent.Add(50*time.Second)) {
		t.Fatalf("between = %+v, want the recent reboot", got)
	}
	if got, _ := l.Between(ctx, "other", time.Unix(0, 0), time.Now()); len(got) != 0 {
		t.Fatalf("another device has %+v", got)
	}

	l.prune(ctx)
	if got := between(t, l, "pc"); len(got) != 1 {
		t.Fatalf("after pruning: %+v, want only the recent reboot", got)
	}
}
