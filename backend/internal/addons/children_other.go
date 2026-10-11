//go:build !windows

package addons

import (
	"os"
	"os/exec"
)

// childGroup does nothing outside Windows, where den-watcher starts no
// add-ons: the systemd units and the containers start them.
type childGroup struct{}

func newChildGroup() (*childGroup, error) { return nil, nil }

func (*childGroup) add(*os.Process) error { return nil }

func (*childGroup) close() {}

func detach(*exec.Cmd) {}
