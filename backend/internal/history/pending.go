package history

import (
	"cmp"
	"context"
	"fmt"
	"log/slog"
	"maps"
	"math"
	"slices"
	"strings"
	"sync"
	"time"
)

// maxPendingMinutes is how many minutes wait for a flush at most: more are
// written at once, so a flush interval of an hour with many devices keeps
// little in memory.
const maxPendingMinutes = 5000

// pending holds the minutes that are not written yet, by device and time. A
// write of many minutes at once touches the pages of the database once for
// all of them, and the SD card of a Raspberry Pi is written to once per
// flush, not once per minute.
type pending struct {
	mu sync.Mutex
	// waiting has the minutes added since the last flush started, writing
	// those a flush is writing now. Reads see both.
	waiting, writing map[string]map[int64]map[string]float64
	count            int
}

func newPending() pending {
	return pending{waiting: map[string]map[int64]map[string]float64{}}
}

// add keeps the values of the minutes, but not those a minute has already,
// and returns how many minutes wait.
func (p *pending) add(device string, minutes []Minute) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, minute := range minutes {
		p.put(device, minute.Time, minute.Values)
	}
	return p.count
}

// put keeps the values of one minute that it has not got, as storeMinute
// does for a stored minute.
func (p *pending) put(device string, at int64, values map[string]float64) {
	byTime := p.waiting[device]
	if byTime == nil {
		byTime = map[int64]map[string]float64{}
		p.waiting[device] = byTime
	}
	have := byTime[at]
	if have == nil {
		have = make(map[string]float64, len(values))
		byTime[at] = have
		p.count++
	}
	for metric, value := range values {
		if _, ok := have[metric]; !ok {
			have[metric] = value
		}
	}
}

// newest returns the newest time that waits for a device.
func (p *pending) newest(device string) (int64, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	var newest int64
	found := false
	for _, byTime := range []map[int64]map[string]float64{p.waiting[device], p.writing[device]} {
		for at := range byTime {
			if !found || at > newest {
				newest, found = at, true
			}
		}
	}
	return newest, found
}

// between returns the minutes of a device that wait, from from up to (not
// including) to, in order of time. The values are as they will be stored.
func (p *pending) between(device string, from, to int64) []Minute {
	p.mu.Lock()
	defer p.mu.Unlock()
	merged := map[int64]map[string]float64{}
	for _, byTime := range []map[int64]map[string]float64{p.writing[device], p.waiting[device]} {
		for at, values := range byTime {
			if at < from || at >= to {
				continue
			}
			if merged[at] == nil {
				merged[at] = map[string]float64{}
			}
			for metric, value := range values {
				if v := float32(value); !math.IsNaN(float64(v)) && !math.IsInf(float64(v), 0) {
					if _, ok := merged[at][metric]; !ok {
						merged[at][metric] = float64(v)
					}
				}
			}
		}
	}
	list := make([]Minute, 0, len(merged))
	for at, values := range merged {
		list = append(list, Minute{Time: at, Values: values})
	}
	slices.SortFunc(list, func(a, b Minute) int { return cmp.Compare(a.Time, b.Time) })
	return list
}

// forget drops the minutes of a device.
func (p *pending) forget(device string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, byTime := range []map[int64]map[string]float64{p.waiting[device], p.writing[device]} {
		p.count -= len(byTime)
	}
	delete(p.waiting, device)
	delete(p.writing, device)
}

// take moves the minutes that wait to the ones being written and returns them.
func (p *pending) take() map[string][]Minute {
	p.mu.Lock()
	defer p.mu.Unlock()
	taken := make(map[string][]Minute, len(p.waiting))
	for device, byTime := range p.waiting {
		list := make([]Minute, 0, len(byTime))
		for at, values := range byTime {
			list = append(list, Minute{Time: at, Values: values})
		}
		slices.SortFunc(list, func(a, b Minute) int { return cmp.Compare(a.Time, b.Time) })
		taken[device] = list
	}
	p.writing, p.waiting = p.waiting, map[string]map[int64]map[string]float64{}
	return taken
}

// done forgets the minutes being written, or when they were not written puts
// them back among those that wait, where newer values of the same minute win.
func (p *pending) done(err error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if err != nil {
		for device, byTime := range p.writing {
			for at, values := range byTime {
				p.put(device, at, values)
			}
		}
	}
	p.writing = nil
	p.count = 0
	for _, byTime := range p.waiting {
		p.count += len(byTime)
	}
}

// SetFlushInterval makes minutes wait in memory for up to interval before
// they are written together, which RunFlusher does; zero writes each at once.
// Reads see the minutes that wait. A power cut loses them, so the interval is
// how much history it can lose. Call it before the store is used.
func (s *Store) SetFlushInterval(interval time.Duration) {
	s.flushEvery = interval
}

// RunFlusher writes the minutes that wait every flush interval until ctx is
// done; Close writes the last. Failures are logged, and the minutes stay for
// the next flush.
func (s *Store) RunFlusher(ctx context.Context) {
	if s.flushEvery <= 0 {
		return
	}
	tick := time.NewTicker(s.flushEvery)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			if err := s.Flush(ctx); err != nil && ctx.Err() == nil {
				slog.Error("write the history", "error", err)
			}
		}
	}
}

// Flush writes the minutes that wait.
func (s *Store) Flush(ctx context.Context) error {
	s.flushing.Lock()
	defer s.flushing.Unlock()
	taken := s.pend.take()
	if len(taken) == 0 {
		s.pend.done(nil)
		return nil
	}
	err := s.write(ctx, taken)
	s.pend.done(err)
	return err
}

// hourKey names the average of one hour of one metric of a device.
type hourKey struct {
	device, metric string
	hour           int64
}

// hourSum is the values of an hour that were stored, and how many.
type hourSum struct {
	sum   float64
	count int64
}

// write stores the minutes of several devices in one transaction, apart from
// the values that are stored already, and adds the new ones to the averages
// of their hours, one row per hour and metric however many minutes there are.
func (s *Store) write(ctx context.Context, byDevice map[string][]Minute) error {
	names := map[string]bool{}
	for _, minutes := range byDevice {
		for _, minute := range minutes {
			for metric := range minute.Values {
				names[metric] = true
			}
		}
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

	hours := map[hourKey]*hourSum{}
	for device, minutes := range byDevice {
		for _, minute := range minutes {
			list := storableValues(ids, minute.Values)
			if len(list) == 0 {
				continue
			}
			// Values stored already were counted in their hour then.
			stored, err := storeMinute(ctx, tx, device, minute.Time, list)
			if err != nil {
				return fmt.Errorf("store %s at %d: %w", device, minute.Time, err)
			}
			for _, v := range stored {
				metric, err := s.nameOf(ctx, v.id)
				if err != nil {
					return err
				}
				key := hourKey{device, metric, minute.Time / 3600 * 3600}
				if hours[key] == nil {
					hours[key] = &hourSum{}
				}
				hours[key].sum += minute.Values[metric]
				hours[key].count++
			}
		}
	}

	average, err := tx.PrepareContext(ctx, `
		INSERT INTO samples_hourly (device, time, metric, value, count) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (device, time, metric) DO UPDATE SET
			value = (value * count + excluded.value * excluded.count) / (count + excluded.count),
			count = count + excluded.count`)
	if err != nil {
		return err
	}
	defer func() { _ = average.Close() }()
	// In the order of the primary key, so the rows of a device and hour are
	// written to the same pages.
	keys := slices.SortedFunc(maps.Keys(hours), func(a, b hourKey) int {
		return cmp.Or(strings.Compare(a.device, b.device), cmp.Compare(a.hour, b.hour), strings.Compare(a.metric, b.metric))
	})
	for _, key := range keys {
		h := hours[key]
		if _, err := average.ExecContext(ctx, key.device, key.hour, key.metric, h.sum/float64(h.count), h.count); err != nil {
			return fmt.Errorf("average %s: %w", key.metric, err)
		}
	}
	return tx.Commit()
}
