package metrics

import (
	"context"
	"os/exec"
	"time"
)

// RunNvidiaSMI runs nvidia-smi, the program found on the PATH at start, with
// fixed arguments, and returns what it printed. When one GPU is in an error
// state, nvidia-smi still prints the others but exits with an error, so its
// output is returned then too; the error is then an *exec.ExitError, which
// holds the error output. When ctx ended, as at a timeout, nothing is
// returned, as its output may end in the middle of a line.
func RunNvidiaSMI(ctx context.Context, program string, args ...string) (string, error) {
	// program is the nvidia-smi found on the PATH at start, and every caller
	// passes fixed arguments.
	cmd := exec.CommandContext(ctx, program, args...) //nolint:gosec // see above
	HideWindow(cmd)
	// Once nvidia-smi is killed, wait at most a second for its output to
	// close, in case a child it started keeps it open.
	cmd.WaitDelay = time.Second
	out, err := cmd.Output()
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	return string(out), err
}
