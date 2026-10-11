// Command experiment starts children, to see how Task Manager groups them.
// Temporary; not for main.
//
//	experiment child                 sleeps
//	experiment spawn <exe>...        starts each <exe> child, detached
//	experiment service <exe>...      runs as a service that does the same
package main

import (
	"os"
	"os/exec"
	"syscall"
	"time"

	"golang.org/x/sys/windows/svc"
)

func spawn(programs []string) {
	for _, p := range programs {
		cmd := exec.Command(p, "child")
		cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x00000008} // DETACHED_PROCESS
		_ = cmd.Start()
	}
}

type service struct{ programs []string }

func (s service) Execute(_ []string, r <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	status <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop}
	spawn(s.programs)
	for c := range r {
		if c.Cmd == svc.Stop {
			return false, 0
		}
	}
	return false, 0
}

func main() {
	switch os.Args[1] {
	case "child":
		time.Sleep(time.Hour)
	case "spawn":
		spawn(os.Args[2:])
		time.Sleep(time.Hour)
	case "service":
		_ = svc.Run("TmExperiment", service{os.Args[2:]})
	}
}
