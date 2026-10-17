package history

import (
	"context"
	"math"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestPackKeepsTheValuesAndTakesFiveBytesEach(t *testing.T) {
	values := []packed{{id: 7, value: 1.5}, {id: 2, value: -3}, {id: 40, value: 1e12}}
	data := pack(values)
	if len(data) != 3*5 {
		t.Errorf("len(pack()) = %d, want 15 for 3 values with close ids", len(data))
	}
	got, err := unpack(data)
	if err != nil {
		t.Fatalf("unpack() error = %v", err)
	}
	want := []packed{{2, -3}, {7, 1.5}, {40, 1e12}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("unpack(pack()) = %v, want %v", got, want)
	}
}

func TestUnpackRefusesCutOffData(t *testing.T) {
	data := pack([]packed{{3, 1}, {9, 2}})
	for _, cut := range []int{1, 4, len(data) - 1} {
		if _, err := unpack(data[:cut]); err == nil {
			t.Errorf("unpack(%d of %d bytes) succeeded, want an error", cut, len(data))
		}
	}
}

func TestAddLeavesOutValuesThatDoNotFitAFloat32(t *testing.T) {
	ctx := context.Background()
	store := openTestStore(t)
	at := time.Unix(1_800_000_000, 0)
	if err := store.Add(ctx, LocalDevice, at, map[string]float64{MetricCPU: 5, MetricMemory: math.MaxFloat64, MetricSwap: math.NaN()}); err != nil {
		t.Fatalf("Add() error = %v", err)
	}
	got, err := store.Range(ctx, LocalDevice, at, at.Add(time.Minute), time.Minute)
	if err != nil {
		t.Fatalf("Range() error = %v", err)
	}
	want := []Series{{Metric: MetricCPU, Points: []Point{{at.Unix(), 5}}}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Range() = %+v, want only the cpu", got)
	}
}

func TestAddAddsOnlyWhatAStoredMinuteLacks(t *testing.T) {
	ctx := context.Background()
	store := openTestStore(t)
	hour := time.Unix(1_800_000_000, 0)
	at := hour.Add(time.Minute)
	// The device's minute, then the same minute with what the hub measured:
	// the cpu is stored once, the response is added.
	if err := store.Add(ctx, LocalDevice, at, map[string]float64{MetricCPU: 10}); err != nil {
		t.Fatal(err)
	}
	if err := store.Add(ctx, LocalDevice, at, map[string]float64{MetricCPU: 99, MetricResponse: 7}); err != nil {
		t.Fatal(err)
	}
	if err := store.Add(ctx, LocalDevice, at, map[string]float64{MetricCPU: 98, MetricResponse: 8}); err != nil {
		t.Fatal(err)
	}

	got, err := store.Range(ctx, LocalDevice, at, at.Add(time.Minute), time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	want := []Series{
		{Metric: MetricCPU, Points: []Point{{at.Unix(), 10}}},
		{Metric: MetricResponse, Points: []Point{{at.Unix(), 7}}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Range(1 min) = %+v, want %+v", got, want)
	}
	if got := countRows(t, store, "history_minutes", LocalDevice); got != 1 {
		t.Errorf("%d rows for one minute, want 1", got)
	}
	var count int
	if err := store.db.QueryRow(`SELECT count FROM samples_hourly WHERE metric = ?`, MetricCPU).Scan(&count); err != nil || count != 1 {
		t.Errorf("the cpu counts %d times in its hour, %v; want once", count, err)
	}
}

func TestRangeAveragesMetricsThatStartAndStopInTheMiddle(t *testing.T) {
	ctx := context.Background()
	store := openTestStore(t)
	start := time.Unix(1_800_000_000, 0)
	for i, values := range []map[string]float64{
		{MetricCPU: 10},
		{MetricCPU: 20, "disk:/mnt": 50},
		{MetricCPU: 30, "disk:/mnt": 70},
		{},
		{MetricCPU: 50},
	} {
		if len(values) == 0 {
			continue
		}
		if err := store.Add(ctx, LocalDevice, start.Add(time.Duration(i)*time.Minute), values); err != nil {
			t.Fatal(err)
		}
	}

	got, err := store.Range(ctx, LocalDevice, start, start.Add(6*time.Minute), 2*time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	want := []Series{
		{Metric: MetricCPU, Points: []Point{{start.Unix(), 15}, {start.Unix() + 120, 30}, {start.Unix() + 240, 50}}},
		{Metric: "disk:/mnt", Points: []Point{{start.Unix(), 50}, {start.Unix() + 120, 70}}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Range() = %+v, want %+v", got, want)
	}
}

func TestOpenChangesHowADatabaseFromBeforeVersion3IsStored(t *testing.T) {
	path := filepath.Join(t.TempDir(), "history.db")
	db := openRaw(t, path)
	hour := int64(1_800_000_000)
	_, err := db.Exec(`
		CREATE TABLE samples (device TEXT NOT NULL, time INTEGER NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, PRIMARY KEY (device, time, metric)) WITHOUT ROWID;
		CREATE INDEX samples_by_time ON samples (time);
		CREATE TABLE samples_hourly (device TEXT NOT NULL, time INTEGER NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (device, time, metric)) WITHOUT ROWID;
		INSERT INTO samples VALUES
			('local', ?1 + 60, 'cpu', 10), ('local', ?1 + 60, 'memory', 40), ('local', ?1 + 120, 'cpu', 20),
			('local', ?1 + 3 * 86400, 'cpu', 60), ('other', ?1 + 60, 'cpu', 99);
		INSERT INTO samples_hourly VALUES ('local', ?1, 'cpu', 15, 2), ('local', ?1, 'memory', 40, 1);
		PRAGMA user_version = 2`, hour)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}

	store, err := Open(context.Background(), path)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer func() { _ = store.Close() }()

	if v := userVersion(t, store.DB()); v != len(migrations) {
		t.Errorf("user_version = %d, want %d", v, len(migrations))
	}
	if _, err := os.Stat(path + ".backup"); err == nil {
		t.Error("the database was copied, want no copy: its old values stay until they are all converted")
	}
	var tables int
	if err := store.DB().QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE name = 'samples'`).Scan(&tables); err != nil || tables != 0 {
		t.Errorf("samples exists = %d, %v; want it dropped", tables, err)
	}
	got, err := store.Range(context.Background(), LocalDevice, time.Unix(hour, 0), time.Unix(hour+4*86400, 0), time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	want := []Series{
		{Metric: MetricCPU, Points: []Point{{hour + 60, 10}, {hour + 120, 20}, {hour + 3*86400, 60}}},
		{Metric: MetricMemory, Points: []Point{{hour + 60, 40}}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Range() = %+v, want %+v", got, want)
	}
	if got := countRows(t, store, "history_minutes", "other"); got != 1 {
		t.Errorf("minutes of the other device = %d, want 1", got)
	}
	// The hourly averages are the ones that were there, not counted again.
	hourly, err := store.Range(context.Background(), LocalDevice, time.Unix(hour, 0), time.Unix(hour+3600, 0), time.Hour)
	if err != nil || len(hourly) != 2 || hourly[0].Points[0].Value != 15 {
		t.Errorf("Range(1 h) = %+v, %v; want the average of 15 kept", hourly, err)
	}
}

func TestOpenGoesOnWithAConversionThatWasCutShort(t *testing.T) {
	path := filepath.Join(t.TempDir(), "history.db")
	db := openRaw(t, path)
	hour := int64(1_800_000_000)
	_, err := db.Exec(`
		CREATE TABLE samples (device TEXT NOT NULL, time INTEGER NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, PRIMARY KEY (device, time, metric)) WITHOUT ROWID;
		INSERT INTO samples VALUES ('local', ?1 + 60, 'cpu', 10), ('local', ?1 + 86400 + 60, 'cpu', 20);
		PRAGMA user_version = 3`, hour)
	if err != nil {
		t.Fatal(err)
	}
	// The program stopped after it converted the values (here: before it dropped samples).
	store, err := Open(context.Background(), path)
	if err != nil {
		t.Fatal(err)
	}
	_ = store.Close()
	db = openRaw(t, path)
	if _, err := db.Exec(`CREATE TABLE samples (device TEXT NOT NULL, time INTEGER NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, PRIMARY KEY (device, time, metric)) WITHOUT ROWID;
		INSERT INTO samples VALUES ('local', ?1 + 86400 + 60, 'cpu', 20)`, hour); err != nil {
		t.Fatal(err)
	}
	_ = db.Close()

	store, err = Open(context.Background(), path)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer func() { _ = store.Close() }()
	if got := countRows(t, store, "history_minutes", LocalDevice); got != 2 {
		t.Errorf("%d minutes, want 2: the converted one kept, the other added", got)
	}
}

func TestDeleteBeforeDeletesTheOldMinutesOfEveryDevice(t *testing.T) {
	ctx := context.Background()
	store := openTestStore(t)
	start := time.Unix(1_800_000_000, 0)
	for _, device := range []string{LocalDevice, "nas", "pc"} {
		addMany(t, store, device, start, 10)
	}

	deleted, err := store.DeleteBefore(ctx, start.Add(4*time.Minute))
	if err != nil {
		t.Fatal(err)
	}

	if deleted != 12 {
		t.Errorf("DeleteBefore() deleted %d minutes, want 4 of each of 3 devices", deleted)
	}
	for _, device := range []string{LocalDevice, "nas", "pc"} {
		if got := countRows(t, store, "history_minutes", device); got != 6 {
			t.Errorf("%s has %d minutes left, want 6", device, got)
		}
	}
}

func TestOpenSkipsTheDaysAStartCutShortConverted(t *testing.T) {
	path := filepath.Join(t.TempDir(), "history.db")
	db := openRaw(t, path)
	day := int64(1_799_971_200) // a multiple of a day
	_, err := db.Exec(packedSchema+`
		CREATE TABLE samples (device TEXT NOT NULL, time INTEGER NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, PRIMARY KEY (device, time, metric)) WITHOUT ROWID;
		INSERT INTO samples VALUES ('local', ?1 + 60, 'cpu', 10), ('local', ?1 + 86400 + 60, 'cpu', 20);
		INSERT INTO history_metrics (id, name) VALUES (1, 'cpu');
		PRAGMA user_version = 3`, day)
	if err != nil {
		t.Fatal(err)
	}
	// The first day was converted, here with another value, which shows it
	// is not converted again.
	if _, err := db.Exec(`INSERT INTO history_minutes VALUES ('local', ?, ?)`, day+60, pack([]packed{{1, 11}})); err != nil {
		t.Fatal(err)
	}
	_ = db.Close()

	store, err := Open(context.Background(), path)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer func() { _ = store.Close() }()
	got, err := store.Range(context.Background(), LocalDevice, time.Unix(day, 0), time.Unix(day+2*86400, 0), time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	want := []Series{{Metric: MetricCPU, Points: []Point{{day + 60, 11}, {day + 86400 + 60, 20}}}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Range() = %+v, want the first day as it was and the second converted: %+v", got, want)
	}
}
