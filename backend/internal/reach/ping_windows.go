package reach

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"net/netip"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	iphlpapi            = windows.NewLazySystemDLL("iphlpapi.dll")
	procIcmpCreateFile  = iphlpapi.NewProc("IcmpCreateFile")
	procIcmpCloseHandle = iphlpapi.NewProc("IcmpCloseHandle")
	procIcmpSendEcho    = iphlpapi.NewProc("IcmpSendEcho")
)

// echoReply is ICMP_ECHO_REPLY, as IcmpSendEcho fills it in.
type echoReply struct {
	Address       uint32
	Status        uint32
	RoundTripTime uint32
	DataSize      uint16
	Reserved      uint16
	Data          uintptr
	Options       [8]byte
}

// ping sends one ping to addr with IcmpSendEcho, which any user may call,
// the Local Service account of the Windows service too.
//
//nolint:gosec // IcmpSendEcho takes pointers to its buffers, which needs unsafe.
func ping(ctx context.Context, addr netip.Addr) (time.Duration, error) {
	wait := timeout
	if deadline, ok := ctx.Deadline(); ok {
		wait = time.Until(deadline)
	}
	if wait < time.Millisecond {
		return 0, context.DeadlineExceeded
	}
	handle, _, err := procIcmpCreateFile.Call()
	if windows.Handle(handle) == windows.InvalidHandle {
		return 0, fmt.Errorf("open a handle to ping: %w", err)
	}
	defer func() { _, _, _ = procIcmpCloseHandle.Call(handle) }()

	data := []byte("denwatch")
	// The answer holds the reply, the data sent back and room for an ICMP
	// error message.
	answer := make([]byte, int(unsafe.Sizeof(echoReply{}))+len(data)+8+16)
	ip := addr.As4()
	start := time.Now()
	count, _, err := procIcmpSendEcho.Call(
		handle,
		uintptr(binary.LittleEndian.Uint32(ip[:])), // IPAddr is in network byte order in memory
		uintptr(unsafe.Pointer(&data[0])), uintptr(len(data)),
		0,
		uintptr(unsafe.Pointer(&answer[0])), uintptr(len(answer)),
		uintptr(wait/time.Millisecond),
	)
	took := time.Since(start)
	if count == 0 {
		if errors.Is(err, windows.Errno(11010)) { // IP_REQ_TIMED_OUT
			return 0, errors.New("no answer to the ping")
		}
		return 0, fmt.Errorf("no answer to the ping: %w", err)
	}
	reply := (*echoReply)(unsafe.Pointer(&answer[0]))
	if reply.Status != 0 {
		return 0, fmt.Errorf("no answer to the ping (IP status %d)", reply.Status)
	}
	// RoundTripTime is in whole milliseconds, 0 for most answers on a local
	// network, so the time measured here is shown instead.
	return took, nil
}
