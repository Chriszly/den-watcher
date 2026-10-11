// Command experiment starts children of itself, to see how Task Manager
// groups them. Temporary; not for main.
package main

import (
	"os"
	"os/exec"
	"syscall"
	"time"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "child" {
		time.Sleep(time.Hour)
		return
	}
	flags := uint32(0x00000008) // DETACHED_PROCESS
	if len(os.Args) > 1 && os.Args[1] == "nowindow" {
		flags = 0x08000000 // CREATE_NO_WINDOW
	}
	for range 3 {
		cmd := exec.Command(os.Args[0], "child")
		cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: flags}
		_ = cmd.Start()
	}
	time.Sleep(time.Hour)
}
