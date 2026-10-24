package statuspage

import (
	"crypto/tls"
	"io"
	"log"
	"net"
	"net/http"
	"sync"
	"time"
)

// maxConnections is how many connections the page holds open at once; more
// are closed right away.
const maxConnections = 64

// Listen listens on addr for the page, over TLS with certs, with at most
// maxConnections connections open at once.
func Listen(addr string, certs *Certificates) (net.Listener, error) {
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	config := &tls.Config{
		MinVersion:     tls.VersionTLS12,
		GetCertificate: certs.GetCertificate,
	}
	return tls.NewListener(&limitListener{Listener: listener, open: make(chan struct{}, maxConnections)}, config), nil
}

// NewServer returns the server for the page, with short time limits, as
// anyone on the internet can connect. The errors of connections that fail,
// such as from scanners that do not speak TLS, are not logged: they would
// fill the log.
func NewServer(page *Page) *http.Server {
	return &http.Server{
		Handler:           page.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       10 * time.Second,
		MaxHeaderBytes:    8 << 10,
		ErrorLog:          log.New(io.Discard, "", 0),
	}
}

// limitListener closes a new connection right away while cap(open) are
// open, so a flood of connections cannot hold up the program.
type limitListener struct {
	net.Listener
	open chan struct{}
}

func (l *limitListener) Accept() (net.Conn, error) {
	for {
		conn, err := l.Listener.Accept()
		if err != nil {
			return nil, err
		}
		select {
		case l.open <- struct{}{}:
			return &limitConn{Conn: conn, release: func() { <-l.open }}, nil
		default:
			_ = conn.Close()
		}
	}
}

type limitConn struct {
	net.Conn
	once    sync.Once
	release func()
}

func (c *limitConn) Close() error {
	err := c.Conn.Close()
	c.once.Do(c.release)
	return err
}
