// Command den-watcher-processes is the processes add-on of den-watcher:
// every few seconds it reads the processes that use the most CPU and memory
// and writes them to the add-on folder (see package addons). It reads files
// in /proc that every user may read; on Linux (systemd) it runs as root
// without any capability only to write the add-on folder all add-ons share,
// and in Docker as the image's user. On Windows the den-watcher service runs
// it as its child process.
//
// Settings come from environment variables:
//
//	ADDONS_DIR  the add-on folder den-watcher reads (default
//	            /run/den-watcher-addons, the folder the systemd service
//	            makes; on Windows C:\ProgramData\Usage Control\addons)
//	HOST_PROC   where the host's /proc is, in a container (default /proc)
package main

import (
	"context"
	"os"
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/addons"
	"github.com/Chriszly/den-watcher/backend/internal/addons/processes"
	"github.com/Chriszly/den-watcher/backend/internal/metrics"
)

func main() {
	addons.Main("processes", "UsageControlProcesses", func() addons.Read {
		proc := os.Getenv("HOST_PROC")
		if proc == "" {
			proc = "/proc"
		}
		reader := processes.NewReader(processes.NewSource(proc))
		return func(_ context.Context, now time.Time) []metrics.Extra {
			return reader.Read(now)
		}
	})
}
