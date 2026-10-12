package metrics

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestOwnReaderMeasuresSinceTheLastRead(t *testing.T) {
	counters := []ownCounters{
		{cpuSeconds: 10, memoryBytes: 30e6, read: 1000, written: 5000, hasIO: true},
		{cpuSeconds: 12, memoryBytes: 32e6, read: 41000, written: 25000, hasIO: true},
	}
	reads := 0
	own := OwnReader{read: func(context.Context) (ownCounters, error) {
		reads++
		return counters[reads-1], nil
	}}
	start := time.Now()

	first := own.Read(context.Background(), start)
	if first == nil || first.MemoryBytes != 30e6 || first.CPUPercent != nil || first.ReadBytesPerSecond != nil {
		t.Errorf("first Read() = %+v, want only the memory", first)
	}
	second := own.Read(context.Background(), start.Add(10*time.Second))
	if second == nil || second.MemoryBytes != 32e6 || second.CPUPercent == nil ||
		*second.ReadBytesPerSecond != 4000 || *second.WriteBytesPerSecond != 2000 {
		t.Fatalf("second Read() = %+v, want 4000 B/s read and 2000 B/s written", second)
	}
}

func TestOwnReaderGivesNothingWhenItCannotRead(t *testing.T) {
	own := OwnReader{read: func(context.Context) (ownCounters, error) { return ownCounters{}, errors.New("no") }}
	if got := own.Read(context.Background(), time.Now()); got != nil {
		t.Errorf("Read() = %+v, want nil", got)
	}
}

func TestOwnRates(t *testing.T) {
	last := ownCounters{cpuSeconds: 10, read: 100, written: 100, hasIO: true}
	current := ownCounters{cpuSeconds: 12, memoryBytes: 1, read: 600, written: 100, hasIO: true}

	got := ownRates(last, current, 5*time.Second, 4)
	// 2 CPU seconds in 5 seconds is 40 % of one CPU, 10 % of four.
	if got.CPUPercent == nil || *got.CPUPercent != 10 || *got.ReadBytesPerSecond != 100 || *got.WriteBytesPerSecond != 0 {
		t.Errorf("ownRates() = %+v, want 10 %% CPU, 100 B/s read and none written", got)
	}
	if got := ownRates(last, ownCounters{cpuSeconds: 1}, 5*time.Second, 4); got.CPUPercent != nil || got.ReadBytesPerSecond != nil {
		t.Errorf("ownRates() of counters that went down or without I/O = %+v, want no rates", got)
	}
	if got := ownRates(last, current, 0, 4); got.CPUPercent != nil {
		t.Errorf("ownRates() over no time = %+v, want no rates", got)
	}
}

func TestReadOwnCountersReadsThisProgram(t *testing.T) {
	// A HOST_PROC that points elsewhere, as in the container, must not matter.
	t.Setenv("HOST_PROC", t.TempDir())
	got, err := readOwnCounters(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if got.memoryBytes == 0 {
		t.Errorf("readOwnCounters() = %+v, want the memory the test uses", got)
	}
}

func TestOwnExtraAddsUpThePrograms(t *testing.T) {
	size := uint64(5e6)
	got := ownExtra([]OwnUsage{
		{CPUPercent: number(1.5), MemoryBytes: 20e6, ReadBytesPerSecond: number(100), WriteBytesPerSecond: number(300)},
		{CPUPercent: number(0.5), MemoryBytes: 10e6},
		{MemoryBytes: 5e6},
	}, &size)

	want := map[string]float64{"cpu": 2, "memory": 35e6, "read": 100, "written": 300, "database": 5e6, "programs": 3}
	if got.ID != OwnExtraID || len(got.Items) != len(want) {
		t.Fatalf("ownExtra() = %+v, want the values %v", got, want)
	}
	for _, item := range got.Items {
		if item.Value == nil || *item.Value != want[item.ID] {
			t.Errorf("ownExtra() %s = %v, want %v", item.ID, item.Value, want[item.ID])
		}
	}
	if clean := CleanExtras([]Extra{got}, 64); len(clean) != 1 || len(clean[0].Items) != len(want) {
		t.Errorf("CleanExtras() of the group = %+v, want it kept whole", clean)
	}
	if len(got.Description) > MaxDescriptionLength {
		t.Errorf("the description has %d characters, more than %d", len(got.Description), MaxDescriptionLength)
	}
	for language, description := range got.Descriptions {
		if n := len([]rune(description)); n > MaxDescriptionLength {
			t.Errorf("the %s description has %d characters, more than %d", language, n, MaxDescriptionLength)
		}
	}
}

func TestOwnExtraLeavesOutWhatNoProgramMeasured(t *testing.T) {
	got := ownExtra([]OwnUsage{{MemoryBytes: 20e6}}, nil)
	var ids []string
	for _, item := range got.Items {
		ids = append(ids, item.ID)
	}
	if len(ids) != 2 || ids[0] != "memory" || ids[1] != "programs" {
		t.Errorf("ownExtra() of a first reading without a database = %v, want only memory and programs", ids)
	}
}

func TestDatabaseSizeCountsTheWriteAheadLog(t *testing.T) {
	path := filepath.Join(t.TempDir(), "history.db")
	for file, size := range map[string]int{path: 4096, path + "-wal": 1000, path + "-shm": 32} {
		if err := os.WriteFile(file, make([]byte, size), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	if got := databaseSize(path); got == nil || *got != 5128 {
		t.Errorf("databaseSize() = %v, want 5128", got)
	}
	if got := databaseSize(path + ".missing"); got != nil {
		t.Errorf("databaseSize() of a missing file = %v, want nil", *got)
	}
	if got := databaseSize(""); got != nil {
		t.Errorf("databaseSize(\"\") = %v, want nil", *got)
	}
}

func TestAddOnsOwnCountsTheFreshReports(t *testing.T) {
	dir := t.TempDir()
	folder := openRoot(t, dir)
	now := time.Now().UTC().Truncate(time.Second)
	write := func(name string, at time.Time, own *OwnUsage) {
		t.Helper()
		if err := WriteAddOnReport(folder, name, AddOnReport{Time: at, Own: own}); err != nil {
			t.Fatal(err)
		}
	}
	write("host.json", now, &OwnUsage{MemoryBytes: 1})
	write("power.json", now, &OwnUsage{MemoryBytes: 2})
	write("old.json", now.Add(-time.Minute), &OwnUsage{MemoryBytes: 3})
	write("older-version.json", now, nil)
	addOns := &AddOns{Dir: dir, MaxEntries: 64}

	if extras := addOns.Read(now); len(extras) != 0 {
		t.Errorf("Read() = %+v, want no extras from reports without any", extras)
	}
	got := addOns.Own(now)
	if len(got) != 2 || got[0].MemoryBytes != 1 || got[1].MemoryBytes != 2 {
		t.Errorf("Own() = %+v, want the host's and the power add-on's", got)
	}
	if got := (*AddOns)(nil).Own(now); got != nil {
		t.Errorf("Own() without add-ons = %+v, want nil", got)
	}
}
