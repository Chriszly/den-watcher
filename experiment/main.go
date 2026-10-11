// Command experiment starts children, to see how Task Manager groups them.
// Temporary; not for main.
//
//	experiment child                    sleeps
//	experiment spawn <job|nojob> <exe>...    starts each <exe>, detached
//	experiment service <job|nojob> <exe>...  runs as a service that does the same
package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
)

func spawn(mode string, programs []string) {
	var job windows.Handle
	if mode == "job" {
		job, _ = windows.CreateJobObject(nil, nil)
		info := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{
			BasicLimitInformation: windows.JOBOBJECT_BASIC_LIMIT_INFORMATION{LimitFlags: windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE},
		}
		_, _ = windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation,
			uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info)))
	}
	for _, p := range programs {
		args := []string{"child"}
		if strings.EqualFold(filepath.Base(p), "ping.exe") {
			args = []string{"-n", "3600", "127.0.0.1"}
		}
		cmd := exec.Command(p, args...)
		cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x00000008} // DETACHED_PROCESS
		if err := cmd.Start(); err != nil {
			continue
		}
		if job != 0 {
			h, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(cmd.Process.Pid))
			if err == nil {
				_ = windows.AssignProcessToJobObject(job, h)
				_ = windows.CloseHandle(h)
			}
		}
	}
}

type service struct {
	mode     string
	programs []string
}

func (s service) Execute(_ []string, r <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	status <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop}
	spawn(s.mode, s.programs)
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
		if exe, _ := os.Executable(); strings.EqualFold(filepath.Base(exe), "svc-e.exe") {
			dir := filepath.Dir(exe)
			spawn("nojob", []string{filepath.Join(dir, "svc-e-other.exe"), filepath.Join(os.Getenv("WINDIR"), "System32", "PING.EXE")})
		}
		time.Sleep(time.Hour)
	case "spawn":
		spawn(os.Args[2], os.Args[3:])
		time.Sleep(time.Hour)
	case "service":
		_ = svc.Run("", service{os.Args[2], os.Args[3:]})
	}
}
