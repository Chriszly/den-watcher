package metrics

import (
	"context"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/common"
	"github.com/shirou/gopsutil/v4/process"
)

// OwnUsage is what one of den-watcher's programs uses of the machine: the
// collector itself, or an add-on, which writes it with its report. CPUPercent
// is a share of all of the machine's CPUs, as the CPU usage is; it and the
// speeds are measured since the program's previous reading, so its first
// reading has none of them.
type OwnUsage struct {
	CPUPercent          *float64 `json:"cpuPercent,omitempty"`
	MemoryBytes         uint64   `json:"memoryBytes"`
	ReadBytesPerSecond  *float64 `json:"readBytesPerSecond,omitempty"`
	WriteBytesPerSecond *float64 `json:"writeBytesPerSecond,omitempty"`
}

// ownCounters is what a program has used since it started, and the memory it
// holds now. hasIO is false where the system does not count a program's I/O.
type ownCounters struct {
	cpuSeconds    float64
	memoryBytes   uint64
	read, written uint64
	hasIO         bool
}

// OwnReader reads the OwnUsage of the program it runs in. The zero value is
// ready to use.
type OwnReader struct {
	// read reads the counters; nil reads the running program's.
	read func(ctx context.Context) (ownCounters, error)

	mu       sync.Mutex
	last     ownCounters
	lastTime time.Time
}

// Read returns the program's usage at now, or nil when it cannot be read.
func (o *OwnReader) Read(ctx context.Context, now time.Time) *OwnUsage {
	read := o.read
	if read == nil {
		read = readOwnCounters
	}
	current, err := read(ctx)
	if err != nil {
		return nil
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	usage := ownRates(o.last, current, now.Sub(o.lastTime), runtime.NumCPU())
	if o.lastTime.IsZero() {
		usage = OwnUsage{MemoryBytes: current.memoryBytes}
	}
	o.last, o.lastTime = current, now
	return &usage
}

// ownRates returns the usage between the counters last and current, read
// elapsed apart on a machine with cpus CPUs. A counter that went down, as
// none should, gives no rate.
func ownRates(last, current ownCounters, elapsed time.Duration, cpus int) OwnUsage {
	usage := OwnUsage{MemoryBytes: current.memoryBytes}
	seconds := elapsed.Seconds()
	if seconds <= 0 || cpus <= 0 {
		return usage
	}
	if current.cpuSeconds >= last.cpuSeconds {
		percent := min(100, (current.cpuSeconds-last.cpuSeconds)/seconds/float64(cpus)*100)
		usage.CPUPercent = &percent
	}
	if current.hasIO && last.hasIO && current.read >= last.read && current.written >= last.written {
		read := float64(current.read-last.read) / seconds
		written := float64(current.written-last.written) / seconds
		usage.ReadBytesPerSecond, usage.WriteBytesPerSecond = &read, &written
	}
	return usage
}

// readOwnCounters reads the running program's counters. In a container that
// reads the host's /proc through HOST_PROC, the program's own process is
// still found in the container's /proc, as its process ID is the one the
// container sees.
func readOwnCounters(ctx context.Context) (ownCounters, error) {
	ctx = context.WithValue(ctx, common.EnvKey, common.EnvMap{common.HostProcEnvKey: "/proc"})
	p, err := process.NewProcessWithContext(ctx, int32(os.Getpid())) //nolint:gosec // a process ID fits
	if err != nil {
		return ownCounters{}, err
	}
	times, err := p.TimesWithContext(ctx)
	if err != nil {
		return ownCounters{}, err
	}
	memory, err := p.MemoryInfoWithContext(ctx)
	if err != nil {
		return ownCounters{}, err
	}
	counters := ownCounters{cpuSeconds: times.User + times.System, memoryBytes: memory.RSS}
	// Linux counts what reached the disks; Windows counts every read and
	// write, of files, the network and pipes alike; macOS counts none.
	if io, err := p.IOCountersWithContext(ctx); err == nil {
		counters.hasIO = true
		if runtime.GOOS == "linux" {
			counters.read, counters.written = io.DiskReadBytes, io.DiskWriteBytes
		} else {
			counters.read, counters.written = io.ReadBytes, io.WriteBytes
		}
	}
	return counters, nil
}

// ownExtra returns the group of extras with what den-watcher uses of the
// machine: the usages of its programs added up, and the size of its database
// when databaseBytes is not nil.
func ownExtra(usages []OwnUsage, databaseBytes *uint64) Extra {
	var cpu, read, written float64
	var memory uint64
	hasCPU, hasIO := false, false
	for _, u := range usages {
		memory += u.MemoryBytes
		if u.CPUPercent != nil {
			cpu += *u.CPUPercent
			hasCPU = true
		}
		if u.ReadBytesPerSecond != nil && u.WriteBytesPerSecond != nil {
			read += *u.ReadBytesPerSecond
			written += *u.WriteBytesPerSecond
			hasIO = true
		}
	}
	value := func(v float64) *float64 { return &v }
	var items []ExtraItem
	if hasCPU {
		items = append(items, ExtraItem{ID: "cpu", Label: "CPU", Unit: UnitPercent, Value: value(min(100, cpu)), History: true})
	}
	items = append(items, ExtraItem{
		ID: "memory", Label: "Memory", Labels: map[string]string{"de": "Arbeitsspeicher", "fr": "Mémoire", "es": "Memoria"},
		Unit: UnitBytes, Value: value(float64(memory)), History: true,
	})
	if hasIO {
		items = append(items,
			ExtraItem{
				ID: "read", Label: "Read", Labels: map[string]string{"de": "Gelesen", "fr": "Lecture", "es": "Lectura"},
				Unit: UnitBytesPerSecond, Value: value(read),
			},
			ExtraItem{
				ID: "written", Label: "Written", Labels: map[string]string{"de": "Geschrieben", "fr": "Écriture", "es": "Escritura"},
				Unit: UnitBytesPerSecond, Value: value(written),
			})
	}
	if databaseBytes != nil {
		items = append(items, ExtraItem{
			ID: "database", Label: "Database", Labels: map[string]string{"de": "Datenbank", "fr": "Base de données", "es": "Base de datos"},
			Unit: UnitBytes, Value: value(float64(*databaseBytes)),
		})
	}
	items = append(items, ExtraItem{
		ID: "programs", Label: "Programs", Labels: map[string]string{"de": "Programme", "fr": "Programmes", "es": "Programas"}, //nolint:misspell // Spanish
		Unit: UnitNumber, Value: value(float64(len(usages))),
	})
	return Extra{
		ID:     OwnExtraID,
		Title:  "Den-Watcher itself",
		Titles: map[string]string{"de": "Den-Watcher selbst", "fr": "Den-Watcher lui-même", "es": "El propio Den-Watcher"},
		Description: "What Den-Watcher itself uses of this device: its program and add-ons together, and the size of its history. " +
			"On Windows, reads and writes include network traffic.",
		Descriptions: map[string]string{
			"de": "Was Den-Watcher selbst auf diesem Gerät belegt: sein Programm und die Add-ons zusammen, und die Größe seines Verlaufs. " +
				"Unter Windows zählt beim Lesen und Schreiben auch der Netzwerkverkehr mit.",
			"fr": "Ce que Den-Watcher utilise lui-même sur cet appareil : son programme et ses modules ensemble, et la taille de son historique. " + //nolint:misspell // French
				"Sous Windows, la lecture et l'écriture incluent le trafic réseau.", //nolint:misspell // French
			"es": "Lo que usa el propio Den-Watcher en este dispositivo: su programa y sus complementos juntos, y el tamaño de su historial. " +
				"En Windows, la lectura y la escritura incluyen el tráfico de red.",
		},
		Items: items,
	}
}

// OwnExtraID is the id of the group of extras with what den-watcher uses of
// the machine.
const OwnExtraID = "den-watcher"

// databaseSize returns the size of the SQLite database at path together with
// its write-ahead log, or nil when path is empty or cannot be read.
func databaseSize(path string) *uint64 {
	if path == "" {
		return nil
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil
	}
	size := uint64(info.Size()) //nolint:gosec // a file's size is not negative
	for _, suffix := range []string{"-wal", "-shm"} {
		if info, err := os.Stat(path + suffix); err == nil {
			size += uint64(info.Size()) //nolint:gosec // as above
		}
	}
	return &size
}
