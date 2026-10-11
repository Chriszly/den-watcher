// Package reach checks whether things on the local network that cannot run
// den-watcher answer, such as a printer, a NAS or an IP camera, so a hub can
// show them as devices of their own: with a TCP connection to a port, or a
// ping where no port is given.
//
// It only connects: nothing is sent over a TCP connection, which is closed
// as soon as it is open. It only connects to the local network.
package reach

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/Chriszly/den-watcher/backend/internal/lan"
	"github.com/Chriszly/den-watcher/backend/internal/metrics"
)

// Config is a thing the hub checks, from HUB_CHECKS.
type Config struct {
	Name string
	// Host is its host name or IP address.
	Host string
	// Port is the TCP port that is connected to, or 0 to ping.
	Port int
}

// Address is the host with the port, as host:port, or the host alone for a
// ping.
func (c Config) Address() string {
	if c.Port == 0 {
		return c.Host
	}
	return net.JoinHostPort(c.Host, strconv.Itoa(c.Port))
}

// hostPattern matches a host name or IPv4 address, or an IPv6 address in
// brackets, with an optional port.
var hostPattern = regexp.MustCompile(`^([A-Za-z0-9.-]+|\[[0-9A-Fa-f:.]+\])(?::([0-9]{1,5}))?$`)

// ParseConfigs reads the things to check from a comma-separated list of
// entries such as "Printer=192.168.1.50:631" or "NAS=192.168.1.10".
func ParseConfigs(value string) ([]Config, error) {
	var configs []Config
	for _, entry := range strings.Split(value, ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		config, err := parseConfig(entry)
		if err != nil {
			return nil, fmt.Errorf("%q: %w", entry, err)
		}
		configs = append(configs, config)
	}
	return configs, nil
}

func parseConfig(entry string) (Config, error) {
	name, address, named := strings.Cut(entry, "=")
	if !named || strings.TrimSpace(name) == "" {
		return Config{}, errors.New("write each check as name=address:port, such as Printer=192.168.1.50:631, or name=address to ping, such as NAS=192.168.1.10")
	}
	match := hostPattern.FindStringSubmatch(strings.TrimSpace(address))
	if match == nil {
		return Config{}, errors.New("the address must be a host name or IP address, with a port to connect to or without one to ping, such as 192.168.1.50:631")
	}
	config := Config{Name: strings.TrimSpace(name), Host: strings.Trim(match[1], "[]")}
	if match[2] != "" {
		port, _ := strconv.Atoi(match[2])
		if port < 1 || port > 65535 {
			return Config{}, errors.New("the port must be a number from 1 to 65535")
		}
		config.Port = port
	}
	return config, nil
}

const (
	// timeout is how long a check waits for an answer.
	timeout = 4 * time.Second
	// interval is how often a thing that answered is checked again.
	interval = 15 * time.Second
)

// Reader checks one thing.
type Reader struct {
	config Config
	// ping sends one ping to addr and returns how long the answer took;
	// replaced in tests.
	ping func(ctx context.Context, addr netip.Addr) (time.Duration, error)
	// dial connects to address; replaced in tests.
	dial func(ctx context.Context, address string) (net.Conn, error)
	// local tells whether an address is on the local network.
	local func(addr netip.Addr) bool

	mu     sync.Mutex
	latest metrics.Snapshot
	at     time.Time
}

// New returns the reader that checks config.
func New(config Config) *Reader {
	dialer := &net.Dialer{Timeout: timeout, Control: localNetworkOnly}
	return &Reader{
		config: config,
		ping:   ping,
		dial: func(ctx context.Context, address string) (net.Conn, error) {
			return dialer.DialContext(ctx, "tcp", address)
		},
		local: lan.Default.Local,
	}
}

// localNetworkOnly refuses to connect to an address outside the local
// network, even when a host name resolves to one.
func localNetworkOnly(_, address string, _ syscall.RawConn) error {
	if !lan.Default.LocalAddrPort(address) {
		return fmt.Errorf("%s is not on the local network", address)
	}
	return nil
}

// Collect checks the thing, at most once per interval while it answers, and
// fails when it does not answer, which the hub counts as an outage. A failed
// check is not kept: the next one asks again.
func (r *Reader) Collect(ctx context.Context) (metrics.Snapshot, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.at.IsZero() && time.Since(r.at) < interval {
		return r.latest, nil
	}
	took, err := r.check(ctx)
	if err != nil {
		r.at = time.Time{}
		return metrics.Snapshot{}, err
	}
	r.latest, r.at = snapshot(r.config, took), time.Now()
	return r.latest, nil
}

// check connects to the port, or pings the host, and returns how long the
// answer took.
func (r *Reader) check(ctx context.Context) (time.Duration, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if r.config.Port != 0 {
		start := time.Now()
		conn, err := r.dial(ctx, r.config.Address())
		if err != nil {
			return 0, err
		}
		took := time.Since(start)
		_ = conn.Close()
		return took, nil
	}
	addr, err := r.resolve(ctx)
	if err != nil {
		return 0, err
	}
	return r.ping(ctx, addr)
}

// resolve returns the IPv4 address of the host to ping, which must be on the
// local network.
func (r *Reader) resolve(ctx context.Context) (netip.Addr, error) {
	addr, err := netip.ParseAddr(r.config.Host)
	if err != nil {
		addrs, err := net.DefaultResolver.LookupNetIP(ctx, "ip4", r.config.Host)
		if err != nil {
			return netip.Addr{}, err
		}
		if len(addrs) == 0 {
			return netip.Addr{}, fmt.Errorf("%s has no IPv4 address", r.config.Host)
		}
		addr = addrs[0]
	}
	addr = addr.Unmap()
	if !addr.Is4() {
		return netip.Addr{}, fmt.Errorf("%s: only IPv4 addresses can be pinged; give a port to connect to instead", r.config.Host)
	}
	if !r.local(addr) {
		return netip.Addr{}, fmt.Errorf("%s is not on the local network", addr)
	}
	return addr, nil
}

// snapshot is what the page shows of a thing that answered: how long the
// answer took, with its history, and how it is checked.
func snapshot(config Config, took time.Duration) metrics.Snapshot {
	ms := float64(took.Microseconds()) / 1000
	method := metrics.ExtraItem{
		ID: "method", Label: "Checked with", Unit: metrics.UnitText, Text: "Ping",
		Labels: map[string]string{"de": "Geprüft mit", "fr": "Vérifié par", "es": "Comprobado con"},
	}
	if config.Port != 0 {
		port := strconv.Itoa(config.Port)
		method.Text = "TCP port " + port
		method.Texts = map[string]string{"de": "TCP-Port " + port, "fr": "Port TCP " + port, "es": "Puerto TCP " + port}
	}
	return metrics.Snapshot{Extras: []metrics.Extra{{
		ID: "reachability", Title: "Reachability",
		Titles:      map[string]string{"de": "Erreichbarkeit", "fr": "Accessibilité", "es": "Accesibilidad"},
		Description: "How long it took to answer the hub, which checks it every 15 seconds. It runs no den-watcher, so this is all the hub knows of it.",
		Descriptions: map[string]string{
			"de": "Wie lange die Antwort an den Hub dauerte, der alle 15 Sekunden prüft. Hier läuft kein den-watcher, daher weiß der Hub nur das.",
			"fr": "Le temps de réponse au hub, qui vérifie toutes les 15 secondes. Aucun den-watcher n'y tourne, le hub ne sait donc que cela.",
			"es": "El tiempo que tardó en responder al hub, que lo comprueba cada 15 segundos. No ejecuta den-watcher, así que es todo lo que el hub sabe.",
		},
		Items: []metrics.ExtraItem{
			{
				ID: "response-time", Label: "Response time", Unit: metrics.UnitMilliseconds, Value: &ms, History: true,
				Labels: map[string]string{"de": "Antwortzeit", "fr": "Temps de réponse", "es": "Tiempo de respuesta"},
			},
			method,
		},
	}}}
}
