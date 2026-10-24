package statuspage

import (
	"net/netip"
	"strconv"
	"sync"
	"time"
)

const (
	// requestsPerMinute is how many requests each client may send a minute.
	requestsPerMinute = 60
	// maxWrong is how many wrong passwords a client may send before it may
	// guess no more for lockout.
	maxWrong = 5
	// lockout is how long a client that sent maxWrong wrong passwords waits.
	lockout = 15 * time.Minute
	// maxWrongAll is how many wrong passwords all clients together may send
	// within allWindow, so many addresses guessing together get no more
	// guesses. Once it is reached, nobody can sign in until the window
	// ends; visitors who are signed in already keep seeing the page.
	maxWrongAll = 50
	allWindow   = time.Hour
	// maxClients is how many clients are kept track of. Past it, new
	// clients may still ask, but not guess.
	maxClients = 10_000
)

// limiter keeps track of how often each client asks and guesses.
type limiter struct {
	mu      sync.Mutex
	clients map[netip.Addr]*clientLimits
	// allStart is when the window of the wrong passwords of all clients
	// started, and allWrong how many were sent since.
	allStart time.Time
	allWrong int
}

type clientLimits struct {
	// minute is when the client's current minute of requests started, and
	// requests how many it sent since.
	minute   time.Time
	requests int
	// wrong is how many wrong passwords the client sent in a row, the last
	// one at lastWrong.
	wrong     int
	lastWrong time.Time
}

func newLimiter() *limiter {
	return &limiter{clients: map[netip.Addr]*clientLimits{}}
}

// allow reports whether the client at addr may send another request at now,
// and counts it.
func (l *limiter) allow(addr netip.Addr, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	c := l.client(addr, now)
	if c == nil {
		return true
	}
	if now.Sub(c.minute) >= time.Minute {
		c.minute, c.requests = now, 0
	}
	c.requests++
	return c.requests <= requestsPerMinute
}

// mayGuess reports whether the client at addr may send a password at now.
func (l *limiter) mayGuess(addr netip.Addr, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if now.Sub(l.allStart) >= allWindow {
		l.allStart, l.allWrong = now, 0
	}
	if l.allWrong >= maxWrongAll {
		return false
	}
	c := l.client(addr, now)
	if c == nil {
		return false
	}
	if c.wrong >= maxWrong && now.Sub(c.lastWrong) >= lockout {
		c.wrong = 0
	}
	return c.wrong < maxWrong
}

// failed counts a wrong password from the client at addr.
func (l *limiter) failed(addr netip.Addr, now time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.allWrong++
	if c := l.client(addr, now); c != nil {
		c.wrong++
		c.lastWrong = now
	}
}

// succeeded forgets the wrong passwords of the client at addr.
func (l *limiter) succeeded(addr netip.Addr) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if c := l.clients[clientKey(addr)]; c != nil {
		c.wrong = 0
	}
}

// client returns what is kept of the client at addr, keeping track of it
// from now on; nil when too many clients are kept track of already.
func (l *limiter) client(addr netip.Addr, now time.Time) *clientLimits {
	key := clientKey(addr)
	if c := l.clients[key]; c != nil {
		return c
	}
	if len(l.clients) >= maxClients {
		for k, c := range l.clients {
			if now.Sub(c.minute) >= time.Minute && now.Sub(c.lastWrong) >= lockout {
				delete(l.clients, k)
			}
		}
		if len(l.clients) >= maxClients {
			return nil
		}
	}
	c := &clientLimits{minute: now}
	l.clients[key] = c
	return c
}

// clientKey is who sent a request from addr: the address itself, or for
// IPv6 its /64 network, as a device can pick any address in it.
func clientKey(addr netip.Addr) netip.Addr {
	addr = addr.Unmap().WithZone("")
	if addr.Is6() {
		return netip.PrefixFrom(addr, 64).Masked().Addr()
	}
	return addr
}

// retryAfter is d as the seconds of a Retry-After header.
func retryAfter(d time.Duration) string {
	return strconv.Itoa(int(d / time.Second))
}
