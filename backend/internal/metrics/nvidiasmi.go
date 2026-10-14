package metrics

import (
	"context"
	"errors"
	"os/exec"
	"time"
)

// RunNvidiaSMI runs nvidia-smi, the program found on the PATH at start, with
// fixed arguments, and returns what it printed. When one GPU is in an error
// state, nvidia-smi still prints the others but exits with an error, so its
// output is returned then too, with its error output, which may hold the
// message for a GPU it cannot reach; the error is then an *exec.ExitError.
// When ctx ended, as at a timeout, nothing is returned, as its output may end
// in the middle of a line.
func RunNvidiaSMI(ctx context.Context, program string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, program, args...)
	HideWindow(cmd)
	// Once nvidia-smi is killed, wait at most a second for its output to
	// close, in case a child it started keeps it open.
	cmd.WaitDelay = time.Second
	out, err := cmd.Output()
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	var exit *exec.ExitError
	if errors.As(err, &exit) {
		out = append(out, exit.Stderr...)
	}
	return string(out), err
}
