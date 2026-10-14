//go:build !windows

package memory

import (
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/metrics"
	"github.com/Chriszly/den-watcher/backend/internal/sysfile"
)

// New returns what reads the memory details of this machine: /proc, which
// only Linux has, so elsewhere it reads nothing.
func New() func(now time.Time) []metrics.Extra {
	return NewReader(sysfile.HostProc()).Read
}
