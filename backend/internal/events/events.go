// Package events keeps what happened to each device that its usage alone
// does not tell: when it started again (a reboot, its uptime fell between two
// readings) and when den-watcher on it was updated (its version changed). The
// page marks them on its charts, with the alerts and outages kept elsewhere.
package events

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"math"
	"slices"
	"sync"
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/metrics"
)

// Kind is what happened.
type Kind string

// The kinds of events kept here.
const (
	// KindReboot is a start of the device, at the time it started.
	KindReboot Kind = "reboot"
	// KindUpdate is a new version of den-watcher on the device, at the time
	// it was first seen; its detail is the new version.
	KindUpdate Kind = "update"
)

// Event is something that happened to a device.
type Event struct {
	Time   time.Time
	Kind   Kind
	Detail string
}

// Target is a device whose events are kept.
type Target struct {
	ID string
	// Usage reads its newest usage.
	Usage Usage
}

// Usage reads the usage of a device.
type Usage interface {
	Collect(ctx context.Context) (metrics.Snapshot, error)
}

// schema keeps the events, and the uptime and version each device had when
// last seen, so a reboot or update while the hub was stopped is noticed at
// its start. The uptime is written at most every writeInterval, so the hub
// does not write for every reading.
const schema = `
CREATE TABLE IF NOT EXISTS events (
	device TEXT    NOT NULL,
	time   INTEGER NOT NULL, -- Unix time in milliseconds
	kind   TEXT    NOT NULL,
	detail TEXT    NOT NULL,
	PRIMARY KEY (device, time, kind)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS events_by_time ON events (time);
CREATE TABLE IF NOT EXISTS events_seen (
	device  TEXT    PRIMARY KEY,
	uptime  INTEGER NOT NULL, -- seconds
	version TEXT    NOT NULL,
	written INTEGER NOT NULL  -- Unix time in milliseconds
);
`

const (
	// Interval is how often the devices are looked at.
	Interval = 15 * time.Second
	// writeInterval is how often a device's uptime is written while nothing
	// happens.
	writeInterval = 10 * time.Minute
	// pruneInterval is how often events older than the retention are deleted.
	pruneInterval = time.Hour
)

// seen is what a device was like at its newest reading.
type seen struct {
	uptime  uint64
	version string
	written time.Time
}

// Log looks at the devices every Interval and keeps their events.
type Log struct {
	db        *sql.DB
	devices   func() []Target
	retention time.Duration

	mu   sync.Mutex
	seen map[string]seen
}

// Open prepares the events tables in db. devices lists the devices to look
// at; events older than retention are deleted.
func Open(ctx context.Context, db *sql.DB, devices func() []Target, retention time.Duration) (*Log, error) {
	if _, err := db.ExecContext(ctx, schema); err != nil {
		return nil, fmt.Errorf("create the events tables: %w", err)
	}
	l := &Log{db: db, devices: devices, retention: retention, seen: map[string]seen{}}
	rows, err := db.QueryContext(ctx, `SELECT device, uptime, version, written FROM events_seen`)
	if err != nil {
		return nil, fmt.Errorf("read the devices last seen: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var device string
		var s seen
		var written int64
		if err := rows.Scan(&device, &s.uptime, &s.version, &written); err != nil {
			return nil, fmt.Errorf("read the devices last seen: %w", err)
		}
		s.written = time.UnixMilli(written)
		l.seen[device] = s
	}
	return l, rows.Err()
}

// Run looks at the devices until ctx is done.
func (l *Log) Run(ctx context.Context) {
	check := time.NewTicker(Interval)
	defer check.Stop()
	prune := time.NewTicker(pruneInterval)
	defer prune.Stop()
	l.Check(ctx, time.Now())
	l.prune(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-check.C:
			l.Check(ctx, time.Now())
		case <-prune.C:
			l.prune(ctx)
		}
	}
}

// Check reads every device once and keeps a reboot when its uptime is less
// than at the reading before, and an update when its version changed. A
// device that does not answer is left as it was; one that tells no uptime,
// such as a printer, has no reboots, and one that tells no version, such as
// a router, no updates.
func (l *Log) Check(ctx context.Context, now time.Time) {
	for _, target := range l.devices() {
		snapshot, err := target.Usage.Collect(ctx)
		if err != nil {
			continue
		}
		l.note(ctx, target.ID, snapshot.UptimeSeconds, snapshot.Version, now)
	}
}

// note compares what a device is like now with its reading before.
func (l *Log) note(ctx context.Context, device string, uptime uint64, version string, now time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()
	before, known := l.seen[device]
	if version == "" {
		version = before.version
	}
	var happened []Event
	if known && uptime > 0 && uptime < before.uptime {
		// Started at whole seconds, so readings of one start a little apart
		// agree. The uptime is bounded so it fits in a Duration.
		started := now.Add(-time.Duration(min(uptime, math.MaxInt64/uint64(time.Second))) * time.Second).Truncate(time.Second)
		happened = append(happened, Event{Time: started, Kind: KindReboot})
	}
	if known && before.version != "" && version != before.version {
		happened = append(happened, Event{Time: now.Truncate(time.Second), Kind: KindUpdate, Detail: version})
	}
	if uptime == 0 {
		uptime = before.uptime
	}
	s := seen{uptime: uptime, version: version, written: before.written}
	for _, e := range happened {
		if _, err := l.db.ExecContext(ctx, `INSERT OR IGNORE INTO events (device, time, kind, detail) VALUES (?, ?, ?, ?)`,
			device, e.Time.UnixMilli(), e.Kind, e.Detail); err != nil {
			slog.Error("store an event", "device", device, "kind", e.Kind, "error", err)
		}
	}
	if !known || len(happened) > 0 || version != before.version || now.Sub(before.written) >= writeInterval {
		_, err := l.db.ExecContext(ctx, `
			INSERT INTO events_seen (device, uptime, version, written) VALUES (?, ?, ?, ?)
			ON CONFLICT (device) DO UPDATE SET uptime = excluded.uptime, version = excluded.version, written = excluded.written`,
			device, uptime, version, now.UnixMilli())
		if err != nil {
			slog.Error("store how a device was last seen", "device", device, "error", err)
		} else {
			s.written = now
		}
	}
	l.seen[device] = s
}

// BetweenLimit is how many events Between returns at most.
const BetweenLimit = 500

// Between returns the events of device from from to to, oldest first: the
// newest BetweenLimit of them.
func (l *Log) Between(ctx context.Context, device string, from, to time.Time) ([]Event, error) {
	rows, err := l.db.QueryContext(ctx, `SELECT time, kind, detail FROM events WHERE device = ? AND time >= ? AND time <= ? ORDER BY time DESC, kind DESC LIMIT ?`,
		device, from.UnixMilli(), to.UnixMilli(), BetweenLimit)
	if err != nil {
		return nil, fmt.Errorf("read the events: %w", err)
	}
	defer func() { _ = rows.Close() }()
	list := []Event{}
	for rows.Next() {
		var e Event
		var t int64
		if err := rows.Scan(&t, &e.Kind, &e.Detail); err != nil {
			return nil, fmt.Errorf("read the events: %w", err)
		}
		e.Time = time.UnixMilli(t)
		list = append(list, e)
	}
	slices.Reverse(list)
	return list, rows.Err()
}

// Forget deletes the events of a device that was removed without its
// history, and how it was last seen, so a device added later under the same
// name starts anew.
func (l *Log) Forget(ctx context.Context, device string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.seen, device)
	for _, query := range []string{
		`DELETE FROM events WHERE device = ?`,
		`DELETE FROM events_seen WHERE device = ?`,
	} {
		if _, err := l.db.ExecContext(ctx, query, device); err != nil {
			return fmt.Errorf("delete the events of a removed device: %w", err)
		}
	}
	return nil
}

// prune deletes the events older than the retention.
func (l *Log) prune(ctx context.Context) {
	before := time.Now().Add(-l.retention).UnixMilli()
	if _, err := l.db.ExecContext(ctx, `DELETE FROM events WHERE time < ?`, before); err != nil {
		slog.Error("delete old events", "error", err)
	}
}
