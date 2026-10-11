//go:build linux || darwin

package reach

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand/v2"
	"net"
	"net/netip"
	"os"
	"time"

	"golang.org/x/sys/unix"
)

// ping sends one ping to addr over an ICMP datagram socket, which needs no
// root: on Linux every group in net.ipv4.ping_group_range may open one
// (Docker allows every group in its containers), and on macOS anyone.
func ping(ctx context.Context, addr netip.Addr) (time.Duration, error) {
	fd, err := unix.Socket(unix.AF_INET, unix.SOCK_DGRAM, unix.IPPROTO_ICMP)
	if errors.Is(err, unix.EACCES) || errors.Is(err, unix.EPERM) || errors.Is(err, unix.EPROTONOSUPPORT) {
		return 0, fmt.Errorf("this system does not let den-watcher ping (on Linux, add its group to net.ipv4.ping_group_range); give a port to connect to instead: %w", err)
	}
	if err != nil {
		return 0, fmt.Errorf("open a socket to ping: %w", err)
	}
	unix.CloseOnExec(fd)
	file := os.NewFile(uintptr(fd), "ping")
	conn, err := net.FilePacketConn(file)
	_ = file.Close()
	if err != nil {
		return 0, fmt.Errorf("open a socket to ping: %w", err)
	}
	defer func() { _ = conn.Close() }()
	deadline, ok := ctx.Deadline()
	if !ok {
		deadline = time.Now().Add(timeout)
	}
	if err := conn.SetDeadline(deadline); err != nil {
		return 0, err
	}
	stop := context.AfterFunc(ctx, func() { _ = conn.SetDeadline(time.Now()) })
	defer stop()

	// The kernel sets the identifier of the echo to the socket's own, and
	// passes the socket only the answers to it.
	sequence := rand.N[uint16](math.MaxUint16)
	start := time.Now()
	if _, err := conn.WriteTo(echoRequest(sequence), &net.UDPAddr{IP: addr.AsSlice()}); err != nil {
		return 0, err
	}
	buffer := make([]byte, 1500)
	for {
		n, _, err := conn.ReadFrom(buffer)
		if err != nil {
			return 0, fmt.Errorf("no answer to the ping: %w", err)
		}
		if isEchoReply(buffer[:n], sequence) {
			return time.Since(start), nil
		}
	}
}
