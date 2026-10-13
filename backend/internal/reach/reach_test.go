package reach

import (
	"context"
	"errors"
	"net"
	"net/netip"
	"sync"
	"testing"
	"time"
)

func TestParseConfigs(t *testing.T) {
	configs, err := ParseConfigs(" Printer = 192.168.1.50:631 , NAS=nas.local,, Camera=[fd00::7]:554")
	if err != nil {
		t.Fatal(err)
	}
	want := []Config{
		{Name: "Printer", Host: "192.168.1.50", Port: 631},
		{Name: "NAS", Host: "nas.local"},
		{Name: "Camera", Host: "fd00::7", Port: 554},
	}
	if len(configs) != len(want) {
		t.Fatalf("got %+v, want %+v", configs, want)
	}
	for i := range want {
		if configs[i] != want[i] {
			t.Errorf("entry %d: got %+v, want %+v", i, configs[i], want[i])
		}
	}
	if got := configs[2].Address(); got != "[fd00::7]:554" {
		t.Errorf("Address() = %q", got)
	}
	if got := configs[1].Address(); got != "nas.local" {
		t.Errorf("Address() = %q", got)
	}
}

func TestParseConfigsRefusesWrongEntries(t *testing.T) {
	for _, value := range []string{
		"192.168.1.50:631",
		"=192.168.1.50",
		"Printer=http://192.168.1.50",
		"Printer=192.168.1.50:0",
		"Printer=192.168.1.50:70000",
		"Printer=admin@192.168.1.50",
	} {
		if _, err := ParseConfigs(value); err == nil {
			t.Errorf("ParseConfigs(%q) took it", value)
		}
	}
}

// fakeConn is a connection that only closes.
type fakeConn struct{ net.Conn }

func (fakeConn) Close() error { return nil }

func TestCollectConnectsToThePort(t *testing.T) {
	reader := New(Config{Name: "Printer", Host: "192.168.1.50", Port: 631})
	var asked []string
	reader.dial = func(_ context.Context, address string) (net.Conn, error) {
		asked = append(asked, address)
		return fakeConn{}, nil
	}
	snapshot, err := reader.Collect(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(asked) != 1 || asked[0] != "192.168.1.50:631" {
		t.Errorf("connected to %v", asked)
	}
	if len(snapshot.Extras) != 1 || snapshot.Extras[0].ID != "reachability" {
		t.Fatalf("got %+v", snapshot.Extras)
	}
	items := snapshot.Extras[0].Items
	if items[0].ID != "response-time" || items[0].Value == nil || !items[0].History {
		t.Errorf("response time: %+v", items[0])
	}
	if items[1].Text != "TCP port 631" || items[1].Texts["de"] != "TCP-Port 631" {
		t.Errorf("method: %+v", items[1])
	}

	// Within the interval, the reading from before is kept.
	if _, err := reader.Collect(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(asked) != 1 {
		t.Errorf("connected %d times within the interval, want 1", len(asked))
	}
}

func TestCollectFailsWhenNothingAnswers(t *testing.T) {
	reader := New(Config{Name: "Printer", Host: "192.168.1.50", Port: 631})
	calls := 0
	reader.dial = func(context.Context, string) (net.Conn, error) {
		calls++
		return nil, errors.New("connection refused")
	}
	for range 2 {
		if _, err := reader.Collect(context.Background()); err == nil {
			t.Fatal("Collect() answered for a closed port")
		}
	}
	// A failed check is not kept, so the next one asks again.
	if calls != 2 {
		t.Errorf("connected %d times, want 2", calls)
	}
}

func TestCollectPingsWithoutAPort(t *testing.T) {
	reader := New(Config{Name: "NAS", Host: "192.168.1.10"})
	reader.local = func(netip.Addr) bool { return true }
	reader.spacing = time.Millisecond
	var (
		mu     sync.Mutex
		pinged netip.Addr
	)
	reader.ping = func(_ context.Context, addr netip.Addr) (time.Duration, error) {
		mu.Lock()
		defer mu.Unlock()
		pinged = addr
		return 1500 * time.Microsecond, nil
	}
	snapshot, err := reader.Collect(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if pinged != netip.MustParseAddr("192.168.1.10") {
		t.Errorf("pinged %v", pinged)
	}
	items := snapshot.Extras[0].Items
	if len(items) != 4 || *items[0].Value != 1.5 || items[3].Text != "Ping" {
		t.Fatalf("got %+v", items)
	}
	if items[1].ID != "packet-loss" || *items[1].Value != 0 || !items[1].History {
		t.Errorf("packet loss: %+v", items[1])
	}
	if items[2].ID != "jitter" || *items[2].Value != 0 || !items[2].History {
		t.Errorf("jitter: %+v", items[2])
	}
}

func TestCollectSendsABurstOfPings(t *testing.T) {
	reader := New(Config{Name: "NAS", Host: "192.168.1.10"})
	reader.local = func(netip.Addr) bool { return true }
	// Far enough apart that the pings are sent in order.
	reader.spacing = 20 * time.Millisecond
	var (
		mu   sync.Mutex
		sent int
	)
	// The 2nd and 4th pings get no answer; the others take 1, 3 and 2 ms in
	// the order they were sent.
	reader.ping = func(context.Context, netip.Addr) (time.Duration, error) {
		mu.Lock()
		defer mu.Unlock()
		sent++
		return []time.Duration{time.Millisecond, 0, 3 * time.Millisecond, 0, 2 * time.Millisecond}[sent-1],
			[]error{nil, errLost, nil, errLost, nil}[sent-1]
	}

	snapshot, err := reader.Collect(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	if sent != pings {
		t.Errorf("sent %d pings, want %d", sent, pings)
	}
	items := snapshot.Extras[0].Items
	if *items[0].Value != 2 || *items[1].Value != 40 || *items[2].Value != 1.5 {
		t.Errorf("response time %v, loss %v, jitter %v; want 2 ms, 40 %%, 1.5 ms", *items[0].Value, *items[1].Value, *items[2].Value)
	}
}

var errLost = errors.New("no answer to the ping")

func TestBurstResult(t *testing.T) {
	ms := time.Millisecond
	found, err := burstResult([]time.Duration{4 * ms, 0, 0, 0, 0}, []error{nil, errLost, errLost, errLost, errLost})
	if err != nil || found.took != 4*ms || *found.lossPercent != 80 || found.jitter != nil {
		t.Errorf("one answer of five: %+v, %v; want 4 ms, 80 %% lost and no jitter", found, err)
	}
	found, err = burstResult([]time.Duration{ms, 5 * ms, 2 * ms}, []error{nil, nil, nil})
	if err != nil || *found.lossPercent != 0 || *found.jitter != 3500*time.Microsecond {
		t.Errorf("1, 5 and 2 ms: %+v, %v; want no loss and a jitter of 3.5 ms", found, err)
	}
	if _, err := burstResult([]time.Duration{0, 0}, []error{errLost, errLost}); !errors.Is(err, errLost) {
		t.Errorf("no answers: error %v, want the pings' error", err)
	}
}

func TestATCPCheckHasNoLossOrJitter(t *testing.T) {
	snapshot := snapshot(Config{Name: "Printer", Host: "192.168.1.50", Port: 631}, result{took: time.Millisecond})
	for _, item := range snapshot.Extras[0].Items {
		if item.ID == "packet-loss" || item.ID == "jitter" {
			t.Errorf("a TCP check has %s", item.ID)
		}
	}
}

func TestCollectPingsOnlyTheLocalNetwork(t *testing.T) {
	for _, host := range []string{"8.8.8.8", "fd00::1"} {
		reader := New(Config{Name: "Outside", Host: host})
		reader.ping = func(context.Context, netip.Addr) (time.Duration, error) {
			t.Errorf("pinged %s", host)
			return 0, nil
		}
		if _, err := reader.Collect(context.Background()); err == nil {
			t.Errorf("Collect() pinged %s", host)
		}
	}
}

func TestEchoMessages(t *testing.T) {
	request := echoRequest(0x1234)
	if request[0] != icmpEchoRequest || checksum(request) != 0 {
		t.Errorf("request % x has a wrong type or checksum", request)
	}
	reply := append([]byte{}, request...)
	reply[0] = icmpEchoReply
	if !isEchoReply(reply, 0x1234) {
		t.Error("the reply was not taken")
	}
	if isEchoReply(reply, 0x1235) {
		t.Error("the reply to another sequence was taken")
	}
	// macOS passes the IPv4 header with the reply.
	withHeader := append(make([]byte, 20), reply...)
	withHeader[0] = 0x45
	if !isEchoReply(withHeader, 0x1234) {
		t.Error("the reply after an IPv4 header was not taken")
	}
	if isEchoReply(request, 0x1234) {
		t.Error("the request was taken as a reply")
	}
}
