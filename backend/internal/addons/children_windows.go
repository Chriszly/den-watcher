//go:build windows

package addons

import (
	"os"
	"os/exec"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// childGroup is a job object that ends the add-ons den-watcher started when
// den-watcher ends in any way, also when it crashes: Windows kills every
// process in the job once its last handle closes, which den-watcher holds.
type childGroup struct{ job windows.Handle }

func newChildGroup() (*childGroup, error) {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return nil, err
	}
	info := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{
		BasicLimitInformation: windows.JOBOBJECT_BASIC_LIMIT_INFORMATION{
			LimitFlags: windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
		},
	}
	if _, err := windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation,
		uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info))); err != nil { //nolint:gosec // the API takes the struct by pointer
		_ = windows.CloseHandle(job)
		return nil, err
	}
	return &childGroup{job: job}, nil
}

// add puts process in the job. A program the add-on starts later, such as
// nvidia-smi, is in the job too.
func (g *childGroup) add(process *os.Process) error {
	if g == nil {
		return nil
	}
	handle, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(process.Pid)) //nolint:gosec // a process ID fits
	if err != nil {
		return err
	}
	defer func() { _ = windows.CloseHandle(handle) }()
	return windows.AssignProcessToJobObject(g.job, handle)
}

// close closes the job, which kills what still runs in it.
func (g *childGroup) close() {
	if g != nil {
		_ = windows.CloseHandle(g.job)
	}
}

// detach starts the add-on without a console, not even a hidden one, so no
// console host runs next to it and Windows sends it no logoff or shutdown
// events, which Go would turn into SIGTERM and end the add-on with.
func detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: windows.DETACHED_PROCESS}
}
