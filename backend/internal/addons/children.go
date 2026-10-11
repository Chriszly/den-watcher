package addons

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/winservice"
)

// Children are the add-ons the den-watcher service on Windows starts as its
// own child processes, so Task Manager shows them under den-watcher.exe and
// they stop with it. They run in the service's own low-privilege account, as
// they did as services of their own. The smart add-on is not one of them: it
// needs LocalSystem, which a child of a Local Service process cannot get, so
// it stays a service of its own.
var Children = []string{"power", "gpu", "pressure", "kernel", "wifi", "memory", "ports", "processes", "bluetooth"}

// childRetryDelay is how long den-watcher waits before it starts an add-on
// again that stopped on its own. Each further stop in a row doubles the wait,
// up to maxChildRetryDelay, as the service manager did for the add-on
// services; an add-on that ran for maxChildRetryDelay starts over.
const (
	childRetryDelay    = 10 * time.Second
	maxChildRetryDelay = 5 * time.Minute
)

// StartChildren starts each add-on of Children that is installed next to
// the running program, as den-watcher-<name>.exe, and starts it again
// whenever it stops. The returned function stops them, waits until they have
// ended and removes their reports from the add-on folder dir, as a killed
// add-on cannot. The installer puts only the add-ons picked at setup there.
func StartChildren(dir string) (stop func()) {
	if dir == "" {
		dir = DefaultDir()
	}
	exe, err := os.Executable()
	if err != nil {
		slog.Error("the add-ons are not started, as the program's folder is unknown", "error", err)
		return func() {}
	}
	var programs []string
	for _, name := range Children {
		program := filepath.Join(filepath.Dir(exe), "den-watcher-"+name+".exe")
		if _, err := os.Stat(program); err == nil {
			programs = append(programs, program)
		}
	}
	return startChildren(dir, programs, childRetryDelay, maxChildRetryDelay)
}

// startChildren runs each of programs, an add-on named den-watcher-<name>
// with an optional extension, as StartChildren does.
func startChildren(dir string, programs []string, retryDelay, maxRetryDelay time.Duration) (stop func()) {
	if len(programs) == 0 {
		return func() {}
	}
	keep, err := newChildGroup()
	if err != nil {
		// The add-ons still run, but may outlive a den-watcher that crashes.
		slog.Warn("the add-ons are not tied to den-watcher's lifetime", "error", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	for _, program := range programs {
		name := childName(program)
		wg.Go(func() {
			superviseChild(ctx, name, retryDelay, maxRetryDelay, func(ctx context.Context) error {
				return runChild(ctx, program, keep)
			})
			removeReport(dir, name)
		})
	}
	return func() {
		cancel()
		wg.Wait()
		keep.close()
	}
}

// childName is the add-on's name in program's file name,
// den-watcher-<name>.exe.
func childName(program string) string {
	base := filepath.Base(program)
	base = base[:len(base)-len(filepath.Ext(base))]
	return base[len("den-watcher-"):]
}

// runChild runs program until it ends or ctx is done, which kills it.
func runChild(ctx context.Context, program string, keep *childGroup) error {
	cmd := exec.CommandContext(ctx, program)
	// A child of a service has no console either, so its warnings go to the
	// event log, as they did when it was a service of its own.
	cmd.Env = append(os.Environ(), winservice.EventLogVariable+"=1")
	detach(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	if err := keep.add(cmd.Process); err != nil {
		slog.Warn("the add-on is not tied to den-watcher's lifetime", "program", program, "error", err)
	}
	return cmd.Wait()
}

// superviseChild calls run until ctx is done, waiting retryDelay before it
// calls it again after it returned, twice as long after each further return
// in a row, up to maxRetryDelay. A run that lasted maxRetryDelay or longer
// starts the waits over.
func superviseChild(ctx context.Context, name string, retryDelay, maxRetryDelay time.Duration, run func(context.Context) error) {
	maxDelay := max(maxRetryDelay, retryDelay)
	delay := time.Duration(0)
	for {
		started := time.Now()
		err := run(ctx)
		if ctx.Err() != nil {
			return
		}
		if delay == 0 || time.Since(started) >= maxDelay {
			delay = retryDelay
		} else {
			delay = min(2*delay, maxDelay)
		}
		if err == nil {
			err = errors.New("it ended")
		}
		slog.Warn(fmt.Sprintf("the %s add-on stopped; starting it again in %s", name, delay), "error", err)
		select {
		case <-ctx.Done():
			return
		case <-time.After(delay):
		}
	}
}

// removeReport removes the report of the add-on name from the add-on folder
// dir, through the folder as the add-on itself would (see openFolder).
func removeReport(dir, name string) {
	folder, err := openFolder(dir)
	if err != nil {
		return
	}
	defer func() { _ = folder.Close() }()
	if err := folder.Remove(name + ".json"); err != nil && !errors.Is(err, os.ErrNotExist) {
		slog.Warn("remove the add-on's report", "add-on", name, "error", err)
	}
}
