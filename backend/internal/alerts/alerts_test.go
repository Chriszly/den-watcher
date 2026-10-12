package alerts

import (
	"context"
	"errors"
	"path/filepath"
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

func openTest(t *testing.T, targets *[]Target) (*Watcher, *history.Store) {
	t.Helper()
	store, err := history.Open(context.Background(), filepath.Join(t.TempDir(), "alerts.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	w, err := Open(context.Background(), store.DB(), func() []Target { return *targets }, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return w, store
}

func disk(percent float64) metrics.Snapshot {
	return metrics.Snapshot{Disks: []metrics.Disk{{Path: "/", TotalBytes: 100, UsedPercent: percent}}}
}

func TestADiskStartsRisesAndEndsAnAlert(t *testing.T) {
	ctx := context.Background()
	u := &usage{snapshot: disk(50)}
	targets := []Target{{ID: "nas", Name: "NAS", Usage: u}}
	w, _ := openTest(t, &targets)
	now := time.Unix(1_800_000_000, 0)

	w.Check(ctx, now)
	if got := w.Active("nas"); len(got) != 0 {
		t.Fatalf("at 50 %%: %+v", got)
	}

	u.snapshot = disk(91)
	w.Check(ctx, now.Add(Interval))
	got := w.Active("nas")
	if len(got) != 1 || got[0].Kind != KindDisk || got[0].Subject != "/" || got[0].Level != Warning || *got[0].Value != 91 {
		t.Fatalf("at 91 %%: %+v", got)
	}

	u.snapshot = disk(96)
	w.Check(ctx, now.Add(2*Interval))
	if got := w.Active("nas"); len(got) != 1 || got[0].Level != Critical || *got[0].Value != 96 {
		t.Fatalf("at 96 %%: %+v", got)
	}

	// Just below the threshold it lasts, so it does not start and end again.
	u.snapshot = disk(94)
	w.Check(ctx, now.Add(3*Interval))
	if got := w.Active("nas"); len(got) != 1 || got[0].Level != Critical || *got[0].Value != 96 {
		t.Fatalf("at 94 %%: %+v", got)
	}

	// The device cannot be read for a moment: the alert lasts.
	u.err = errors.New("stale")
	w.Check(ctx, now.Add(4*Interval))
	if got := w.Active("nas"); len(got) != 1 {
		t.Fatalf("while unread: %+v", got)
	}
	u.err = nil

	u.snapshot = disk(80)
	w.Check(ctx, now.Add(5*Interval))
	if got := w.Active("nas"); len(got) != 0 {
		t.Fatalf("at 80 %%: %+v", got)
	}

	log, err := w.Log(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(log) != 1 || log[0].Ended == nil || !log[0].Ended.Equal(now.Add(5*Interval)) ||
		!log[0].Started.Equal(now.Add(Interval)) || log[0].Level != Critical || *log[0].Value != 96 || log[0].DeviceName != "NAS" {
		t.Fatalf("log: %+v", log)
	}
}

func TestCPUMustLastBeforeItIsAnAlert(t *testing.T) {
	ctx := context.Background()
	u := &usage{snapshot: metrics.Snapshot{CPU: metrics.CPU{Cores: 4, UsagePercent: 99}}}
	targets := []Target{{ID: "pi", Name: "Pi", Usage: u}}
	w, _ := openTest(t, &targets)
	start := time.Unix(1_800_000_000, 0)
	for at := start; at.Before(start.Add(5 * time.Minute)); at = at.Add(Interval) {
		w.Check(ctx, at)
		if got := w.Active("pi"); len(got) != 0 {
			t.Fatalf("after %v: %+v", at.Sub(start), got)
		}
	}
	w.Check(ctx, start.Add(5*time.Minute))
	got := w.Active("pi")
	if len(got) != 1 || got[0].Kind != KindCPU || !got[0].Started.Equal(start) {
		t.Fatalf("after 5 minutes: %+v", got)
	}

	// A short peak is forgotten once it is over.
	u.snapshot.CPU.UsagePercent = 10
	w.Check(ctx, start.Add(6*time.Minute))
	u.snapshot.CPU.UsagePercent = 99
	w.Check(ctx, start.Add(7*time.Minute))
	w.Check(ctx, start.Add(8*time.Minute))
	if got := w.Active("pi"); len(got) != 0 {
		t.Fatalf("one minute into a new peak: %+v", got)
	}
}

func TestAServerThatDoesNotAnswerIsAnAlertButAPCIsNot(t *testing.T) {
	ctx := context.Background()
	now := time.Unix(1_800_000_000, 0)
	targets := []Target{
		{ID: "server", Name: "Server", Unreachable: true, UnreachableSince: now.Add(-time.Minute)},
		{ID: "laptop", Name: "Laptop", PC: true, Unreachable: true, UnreachableSince: now.Add(-time.Hour)},
	}
	w, store := openTest(t, &targets)
	w.Check(ctx, now)
	if got := w.Active("server"); len(got) != 0 {
		t.Fatalf("after a minute: %+v", got)
	}
	w.Check(ctx, now.Add(time.Minute))
	got := w.Active("server")
	if len(got) != 1 || got[0].Kind != KindOffline || got[0].Level != Critical || !got[0].Started.Equal(now.Add(-time.Minute)) {
		t.Fatalf("after two minutes: %+v", got)
	}
	if got := w.Active("laptop"); len(got) != 0 {
		t.Fatalf("laptop: %+v", got)
	}

	// After a restart the alert is taken up again, and ends once the
	// server answers.
	again, err := Open(ctx, store.DB(), func() []Target { return targets }, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	targets[0].UnreachableSince = time.Time{}
	again.Check(ctx, now.Add(2*time.Minute))
	if got := again.Active("server"); len(got) != 1 {
		t.Fatalf("after a restart: %+v", got)
	}
	targets[0] = Target{ID: "server", Name: "Server", Usage: &usage{}}
	again.Check(ctx, now.Add(3*time.Minute))
	if got := again.Active("server"); len(got) != 0 {
		t.Fatalf("once it answers: %+v", got)
	}
}

func TestARemovedDeviceEndsItsAlerts(t *testing.T) {
	ctx := context.Background()
	targets := []Target{{ID: "nas", Name: "NAS", Usage: &usage{snapshot: disk(99)}}}
	w, _ := openTest(t, &targets)
	now := time.Unix(1_800_000_000, 0)
	w.Check(ctx, now)
	targets = nil
	w.Check(ctx, now.Add(Interval))
	if got := w.Active("nas"); len(got) != 0 {
		t.Fatalf("got %+v", got)
	}
}

func TestThrottlingAndSMART(t *testing.T) {
	ctx := context.Background()
	s := metrics.Snapshot{
		Throttling: &metrics.Throttling{Now: []string{"undervoltage", "throttled"}},
		Extras: []metrics.Extra{{ID: "smart-checks", Items: []metrics.ExtraItem{
			{ID: "sda-health", Section: "Disk (sda)", Unit: metrics.UnitText, Text: "✗"},
			{ID: "sdb-health", Section: "Disk (sdb)", Unit: metrics.UnitText, Text: "✓"},
		}}},
	}
	targets := []Target{{ID: "pi", Name: "Pi", Usage: &usage{snapshot: s}}}
	w, _ := openTest(t, &targets)
	w.Check(ctx, time.Unix(1_800_000_000, 0))
	got := w.Active("pi")
	if len(got) != 2 || got[0].Level != Critical || got[1].Level != Critical {
		t.Fatalf("got %+v", got)
	}
	kinds := map[Kind]string{got[0].Kind: got[0].Subject, got[1].Kind: got[1].Subject}
	if kinds[KindThrottling] != "undervoltage,throttled" || kinds[KindSMART] != "Disk (sda)" {
		t.Errorf("got %+v", got)
	}
}

func TestOldAlertsArePruned(t *testing.T) {
	ctx := context.Background()
	u := &usage{snapshot: disk(99)}
	targets := []Target{{ID: "nas", Name: "NAS", Usage: u}}
	w, _ := openTest(t, &targets)
	long := time.Now().Add(-48 * time.Hour)
	w.Check(ctx, long)
	u.snapshot = disk(10)
	w.Check(ctx, long.Add(Interval))
	w.prune(ctx)
	if log, _ := w.Log(ctx); len(log) != 0 {
		t.Errorf("got %+v", log)
	}
}

func TestAlertsLastWhileADeviceDoesNotAnswer(t *testing.T) {
	ctx := context.Background()
	targets := []Target{{ID: "nas", Name: "NAS", Usage: &usage{snapshot: disk(96)}}}
	w, _ := openTest(t, &targets)
	now := time.Unix(1_800_000_000, 0)
	w.Check(ctx, now)

	// A short blip is no outage, and the disk alert lasts through it.
	targets[0] = Target{ID: "nas", Name: "NAS", Unreachable: true, UnreachableSince: now}
	w.Check(ctx, now.Add(Interval))
	if got := w.Active("nas"); len(got) != 1 || got[0].Kind != KindDisk {
		t.Fatalf("during a blip: %+v", got)
	}
	// An outage that lasts adds the offline alert.
	w.Check(ctx, now.Add(3*time.Minute))
	if got := w.Active("nas"); len(got) != 2 {
		t.Fatalf("during an outage: %+v", got)
	}
	targets[0] = Target{ID: "nas", Name: "NAS", Usage: &usage{snapshot: disk(96)}}
	w.Check(ctx, now.Add(4*time.Minute))
	got := w.Active("nas")
	if len(got) != 1 || got[0].Kind != KindDisk || !got[0].Started.Equal(now) {
		t.Fatalf("once it answers: %+v", got)
	}
}

func TestTheLogKeepsAnAlertThatLasts(t *testing.T) {
	ctx := context.Background()
	disks := &usage{snapshot: disk(99)}
	flaps := &usage{snapshot: disk(99)}
	targets := []Target{{ID: "nas", Name: "NAS", Usage: disks}, {ID: "pi", Name: "Pi", Usage: flaps}}
	w, _ := openTest(t, &targets)
	now := time.Unix(1_800_000_000, 0)
	// The Pi starts and ends more alerts than the log holds, all newer than the NAS's.
	for i := range 2*LogLimit + 2 {
		flaps.snapshot = disk(float64(99 - 89*(i%2)))
		w.Check(ctx, now.Add(time.Duration(i)*Interval))
	}
	log, err := w.Log(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(log) != LogLimit || log[0].Device != "nas" || log[0].Ended != nil {
		t.Fatalf("got %d, first %+v", len(log), log[0])
	}
}

func TestAnOfflineAlertEndsWhenTheDeviceBecomesAPC(t *testing.T) {
	ctx := context.Background()
	now := time.Unix(1_800_000_000, 0)
	targets := []Target{{ID: "office", Name: "Office", Unreachable: true, UnreachableSince: now.Add(-3 * time.Minute)}}
	w, _ := openTest(t, &targets)
	w.Check(ctx, now)
	if got := w.Active("office"); len(got) != 1 || got[0].Kind != KindOffline {
		t.Fatalf("as a server: %+v", got)
	}
	targets[0].PC = true
	w.Check(ctx, now.Add(Interval))
	if got := w.Active("office"); len(got) != 0 {
		t.Fatalf("as a PC: %+v", got)
	}
}
