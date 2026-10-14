package history

import (
	"cmp"
	"context"
	"database/sql"
	"encoding/binary"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"math"
	"slices"
	"strings"
	"sync"
)

// packedSchema keeps the minutes. A minute is one row per device: its values
// as float32, each with the id of its metric in history_metrics, as pack
// writes them. One row per minute, not one per value, takes about a twentieth
// of the space and of what is written to the SD card: the name of the
// device and of the metric, the row's overhead and a second index are paid
// once per minute, not once per value.
const packedSchema = `
CREATE TABLE IF NOT EXISTS history_metrics (
	id   INTEGER PRIMARY KEY,
	name TEXT    NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS history_minutes (
	device TEXT    NOT NULL,
	time   INTEGER NOT NULL, -- Unix time in seconds
	data   BLOB    NOT NULL, -- the minute's values, see pack
	PRIMARY KEY (device, time)
) WITHOUT ROWID;
`

// metricIDs maps metric names to the ids the minutes are stored with and
// back. History never deletes a metric, so what was read stays right.
type metricIDs struct {
	mu    sync.RWMutex
	ids   map[string]int64
	names map[int64]string
}

func newMetricIDs() *metricIDs {
	return &metricIDs{ids: map[string]int64{}, names: map[int64]string{}}
}

// idOf returns the id of a metric, or 0 for one not known yet, which has no
// stored values.
func (m *metricIDs) idOf(name string) int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.ids[name]
}

func (m *metricIDs) remember(id int64, name string) {
	m.mu.Lock()
	m.ids[name], m.names[id] = id, name
	m.mu.Unlock()
}

// idsOf returns the ids of the given metrics, adding those not known yet. It
// is called before a transaction starts: the write for a new name must not
// wait for a transaction of the caller.
func (s *Store) idsOf(ctx context.Context, metrics []string) (map[string]int64, error) {
	ids := make(map[string]int64, len(metrics))
	s.ids.mu.RLock()
	var missing []string
	for _, name := range metrics {
		if id, ok := s.ids.ids[name]; ok {
			ids[name] = id
		} else {
			missing = append(missing, name)
		}
	}
	s.ids.mu.RUnlock()
	for _, name := range missing {
		if _, err := s.db.ExecContext(ctx, `INSERT OR IGNORE INTO history_metrics (name) VALUES (?)`, name); err != nil {
			return nil, err
		}
		var id int64
		if err := s.db.QueryRowContext(ctx, `SELECT id FROM history_metrics WHERE name = ?`, name).Scan(&id); err != nil {
			return nil, err
		}
		s.ids.remember(id, name)
		ids[name] = id
	}
	return ids, nil
}

// nameOf returns the metric stored under id.
func (s *Store) nameOf(ctx context.Context, id int64) (string, error) {
	s.ids.mu.RLock()
	name, ok := s.ids.names[id]
	s.ids.mu.RUnlock()
	if ok {
		return name, nil
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, name FROM history_metrics`)
	if err != nil {
		return "", err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var other int64
		var otherName string
		if err := rows.Scan(&other, &otherName); err != nil {
			return "", err
		}
		s.ids.remember(other, otherName)
		if other == id {
			name = otherName
		}
	}
	if err := rows.Err(); err != nil {
		return "", err
	}
	if name == "" {
		return "", fmt.Errorf("the history has a value of the unknown metric %d", id)
	}
	return name, nil
}

// packed is one value of a minute.
type packed struct {
	id    int64
	value float32
}

// pack writes the values of a minute sorted by id, each as the step from the
// id before as a varint and the value as 4 bytes, so a value takes 5 bytes
// unless the ids are 64 or more apart.
func pack(values []packed) []byte {
	slices.SortFunc(values, func(a, b packed) int { return cmp.Compare(a.id, b.id) })
	data := make([]byte, 0, len(values)*5)
	var previous int64
	for _, v := range values {
		data = binary.AppendVarint(data, v.id-previous)
		data = binary.LittleEndian.AppendUint32(data, math.Float32bits(v.value))
		previous = v.id
	}
	return data
}

var errBrokenMinute = errors.New("a stored minute is broken")

// unpack reads the values pack wrote.
func unpack(data []byte) ([]packed, error) {
	var values []packed
	var id int64
	for len(data) > 0 {
		step, n := binary.Varint(data)
		if n <= 0 || len(data) < n+4 {
			return nil, errBrokenMinute
		}
		id += step
		values = append(values, packed{id, math.Float32frombits(binary.LittleEndian.Uint32(data[n:]))})
		data = data[n+4:]
	}
	return values, nil
}

// storableValues returns the values that fit a float32, with the ids of
// their metrics.
func storableValues(ids map[string]int64, values map[string]float64) []packed {
	list := make([]packed, 0, len(values))
	for metric, value := range values {
		v := float32(value)
		if math.IsNaN(float64(v)) || math.IsInf(float64(v), 0) {
			continue
		}
		list = append(list, packed{ids[metric], v})
	}
	return list
}

// storeMinute stores the values of a device at one time, apart from those
// that are stored already, and returns the metric ids of the ones it stored.
// The values it is given are in list.
func storeMinute(ctx context.Context, tx *sql.Tx, device string, at int64, list []packed) (stored []packed, err error) {
	result, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO history_minutes (device, time, data) VALUES (?, ?, ?)`, device, at, pack(slices.Clone(list)))
	if err != nil {
		return nil, err
	}
	if n, err := result.RowsAffected(); err != nil || n > 0 {
		return list, err
	}
	// The minute is stored already, as when the hub measured something of the
	// device that the device's own minute lacks: only what it lacks is added.
	var data []byte
	if err := tx.QueryRowContext(ctx, `SELECT data FROM history_minutes WHERE device = ? AND time = ?`, device, at).Scan(&data); err != nil {
		return nil, err
	}
	have, err := unpack(data)
	if err != nil {
		return nil, fmt.Errorf("minute %d of %s: %w", at, device, err)
	}
	known := make(map[int64]bool, len(have))
	for _, v := range have {
		known[v.id] = true
	}
	for _, v := range list {
		if !known[v.id] {
			stored = append(stored, v)
		}
	}
	if len(stored) == 0 {
		return nil, nil
	}
	_, err = tx.ExecContext(ctx, `UPDATE history_minutes SET data = ? WHERE device = ? AND time = ?`, pack(append(have, stored...)), device, at)
	return stored, err
}

// rangeMinutes is Range for steps under an hour: the average of each metric
// over each step, from the stored minutes and those that wait to be written.
func (s *Store) rangeMinutes(ctx context.Context, device string, from, to, stepSeconds int64) ([]Series, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT time, data FROM history_minutes WHERE device = ? AND time >= ? AND time < ? ORDER BY time`, device, from, to)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	// The sum and the number of values of each metric (by id from the
	// database, by name from memory) in each step.
	type total struct {
		sum   float64
		count int
	}
	byID := map[int64]map[int64]*total{}
	byName := map[string]map[int64]*total{}
	// A minute can be both stored and waiting, as while a flush that wrote
	// it has not forgotten it yet: of those, what the database has counts.
	waiting := s.pend.between(device, from, to)
	waitingAt := make(map[int64]bool, len(waiting))
	for _, minute := range waiting {
		waitingAt[minute.Time] = true
	}
	storedIDs := map[int64]map[int64]bool{}
	add := func(steps map[int64]*total, step int64, value float64) {
		t := steps[step]
		if t == nil {
			t = &total{}
			steps[step] = t
		}
		t.sum += value
		t.count++
	}
	for rows.Next() {
		var at int64
		var data []byte
		if err := rows.Scan(&at, &data); err != nil {
			return nil, err
		}
		values, err := unpack(data)
		if err != nil {
			return nil, fmt.Errorf("minute %d of %s: %w", at, device, err)
		}
		step := at / stepSeconds * stepSeconds
		if waitingAt[at] {
			storedIDs[at] = map[int64]bool{}
			for _, v := range values {
				storedIDs[at][v.id] = true
			}
		}
		for _, v := range values {
			if byID[v.id] == nil {
				byID[v.id] = map[int64]*total{}
			}
			add(byID[v.id], step, float64(v.value))
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, minute := range waiting {
		step := minute.Time / stepSeconds * stepSeconds
		for metric, value := range minute.Values {
			if stored := storedIDs[minute.Time]; stored != nil && stored[s.ids.idOf(metric)] {
				continue
			}
			if byName[metric] == nil {
				byName[metric] = map[int64]*total{}
			}
			add(byName[metric], step, value)
		}
	}
	for id, steps := range byID {
		name, err := s.nameOf(ctx, id)
		if err != nil {
			return nil, err
		}
		if other := byName[name]; other != nil {
			for step, t := range other {
				if steps[step] == nil {
					steps[step] = &total{}
				}
				steps[step].sum += t.sum
				steps[step].count += t.count
			}
		}
		byName[name] = steps
	}
	series := make([]Series, 0, len(byName))
	for name, steps := range byName {
		points := make([]Point, 0, len(steps))
		for step, t := range steps {
			points = append(points, Point{Time: step, Value: t.sum / float64(t.count)})
		}
		slices.SortFunc(points, func(a, b Point) int { return cmp.Compare(a.Time, b.Time) })
		series = append(series, Series{Metric: name, Points: points})
	}
	slices.SortFunc(series, func(a, b Series) int { return strings.Compare(a.Metric, b.Metric) })
	return series, nil
}

// convertSamples moves the values of a database from before version 3, one
// row per value in samples, into minutes, one device and one day at a time,
// and drops samples. Nothing else uses the database while it runs, and a day
// is converted in a transaction of its own, so a start cut short goes on
// with the first day that is not converted yet. The hourly averages stay
// as they are.
func (s *Store) convertSamples(ctx context.Context) error {
	var tables int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'samples'`).Scan(&tables); err != nil || tables == 0 {
		return err
	}
	slog.Info("changing how the history is stored; this can take a few minutes for a large database, and the file gets smaller afterwards")
	// The next device is an index lookup, however many values there are.
	query, args := `SELECT MIN(device) FROM samples`, []any{}
	for {
		var device sql.NullString
		if err := s.db.QueryRowContext(ctx, query, args...).Scan(&device); err != nil {
			return err
		}
		if !device.Valid {
			break
		}
		if err := s.convertDevice(ctx, device.String); err != nil {
			return fmt.Errorf("change how the history of %s is stored: %w", device.String, err)
		}
		slog.Info("changed how the history of a device is stored", "device", device.String)
		query, args = `SELECT MIN(device) FROM samples WHERE device > ?`, []any{device.String}
	}
	if _, err := s.db.ExecContext(ctx, `DROP TABLE samples`); err != nil {
		return err
	}
	s.shrinkFile(ctx)
	return nil
}

func (s *Store) convertDevice(ctx context.Context, device string) error {
	const day = int64(24 * 60 * 60)
	query, args := `SELECT MIN(time) FROM samples WHERE device = ?`, []any{device}
	for {
		var start sql.NullInt64
		if err := s.db.QueryRowContext(ctx, query, args...).Scan(&start); err != nil {
			return err
		}
		if !start.Valid {
			return nil
		}
		end := start.Int64/day*day + day
		// A day is converted in one transaction, so one whose first minute
		// is there already was converted by a start that was cut short.
		var done int
		if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM history_minutes WHERE device = ? AND time = ?`, device, start.Int64).Scan(&done); err != nil {
			return err
		}
		if done > 0 {
			query, args = `SELECT MIN(time) FROM samples WHERE device = ? AND time >= ?`, []any{device, end}
			continue
		}
		if err := s.convertDay(ctx, device, start.Int64, end); err != nil {
			return err
		}
		query, args = `SELECT MIN(time) FROM samples WHERE device = ? AND time >= ?`, []any{device, end}
	}
}

// convertDay converts the values of a device from from up to (not including)
// to.
func (s *Store) convertDay(ctx context.Context, device string, from, to int64) error {
	rows, err := s.db.QueryContext(ctx, `SELECT time, metric, value FROM samples WHERE device = ? AND time >= ? AND time < ? ORDER BY time`, device, from, to)
	if err != nil {
		return err
	}
	defer func() { _ = rows.Close() }()
	type minute struct {
		at     int64
		values map[string]float64
	}
	var minutes []minute
	names := map[string]bool{}
	for rows.Next() {
		var at int64
		var metric string
		var value float64
		if err := rows.Scan(&at, &metric, &value); err != nil {
			return err
		}
		if len(minutes) == 0 || minutes[len(minutes)-1].at != at {
			minutes = append(minutes, minute{at, map[string]float64{}})
		}
		minutes[len(minutes)-1].values[metric] = value
		names[metric] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}
	ids, err := s.idsOf(ctx, slices.Collect(maps.Keys(names)))
	if err != nil {
		return err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	for _, m := range minutes {
		if _, err := tx.ExecContext(ctx, `INSERT OR REPLACE INTO history_minutes (device, time, data) VALUES (?, ?, ?)`, device, m.at, pack(storableValues(ids, m.values))); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// shrinkFile gives the space of dropped tables back to the file system when
// more than half of the file is free. That needs room for a copy of what is
// kept, and a temporary folder that is big enough, so a failure only leaves
// the file as large as it was; its free pages are reused.
func (s *Store) shrinkFile(ctx context.Context) {
	var pages, free int64
	if err := s.db.QueryRowContext(ctx, `PRAGMA page_count`).Scan(&pages); err != nil {
		return
	}
	if err := s.db.QueryRowContext(ctx, `PRAGMA freelist_count`).Scan(&free); err != nil || free <= pages/2 {
		return
	}
	if _, err := s.db.ExecContext(ctx, `VACUUM`); err != nil {
		slog.Warn("could not make the database file smaller; its free space is reused by the history", "error", err)
		return
	}
	if _, err := s.db.ExecContext(ctx, `PRAGMA wal_checkpoint(TRUNCATE)`); err != nil {
		slog.Warn("shrink the database's write-ahead log", "error", err)
	}
}
