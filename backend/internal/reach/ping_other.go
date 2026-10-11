//go:build !linux && !darwin && !windows

package reach

import (
	"context"
	"errors"
	"net/netip"
	"time"
)

// ping is not available here.
func ping(context.Context, netip.Addr) (time.Duration, error) {
	return 0, errors.New("pinging is not supported on this system; give a port to connect to instead")
}
