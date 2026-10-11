package reach

import (
	"context"
	"errors"
	"net"
	"net/netip"
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
	var pinged netip.Addr
	reader.ping = func(_ context.Context, addr netip.Addr) (time.Duration, error) {
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
	if *items[0].Value != 1.5 || items[1].Text != "Ping" {
		t.Errorf("got %+v", items)
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
