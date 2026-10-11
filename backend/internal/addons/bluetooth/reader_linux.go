package bluetooth

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/godbus/dbus/v5"
)

// callTimeout is how long BlueZ may take to answer, well within a read's
// interval.
const callTimeout = 2 * time.Second

// NewReader returns what reads the connected devices: from BlueZ over the
// system D-Bus (at DBUS_SYSTEM_BUS_ADDRESS, or where the system keeps it),
// and when BlueZ cannot be asked, as when it is not running or its D-Bus
// rules do not let the add-on's user ask it, by counting the connections in
// sysDir's class/bluetooth. Why BlueZ cannot be asked is logged once, and
// again when it changes.
//
// It keeps one D-Bus connection open, opened at the first read and again
// after it failed, and closed when ctx of the first read is done.
func NewReader(sysDir string) func(ctx context.Context) *Reading {
	var (
		conn   *dbus.Conn
		logged string
	)
	classDir := ClassDir(sysDir)
	return func(ctx context.Context) *Reading {
		reading, err := askBlueZ(ctx, &conn)
		if err == nil {
			if logged != "" {
				slog.Info("BlueZ answers again, so the devices' names are shown again")
				logged = ""
			}
			return reading
		}
		if problem := err.Error(); problem != logged {
			logged = problem
			slog.Warn("BlueZ cannot be asked for the connected devices, so only the kernel's count of connections is shown", "error", err)
		}
		reading, err = countLinks(classDir)
		if err != nil {
			if problem := err.Error(); problem != logged {
				logged = problem
				slog.Warn("the kernel's Bluetooth connections cannot be read", "folder", classDir, "error", err)
			}
		}
		return reading
	}
}

// askBlueZ asks BlueZ for its objects through *conn, connecting first when
// *conn is nil and closing it when the call fails, so the next read connects
// again.
func askBlueZ(ctx context.Context, conn **dbus.Conn) (*Reading, error) {
	if *conn == nil {
		c, err := dbus.ConnectSystemBus(dbus.WithContext(ctx))
		if err != nil {
			return nil, err
		}
		*conn = c
	}
	callCtx, cancel := context.WithTimeout(ctx, callTimeout)
	defer cancel()
	var objects managedObjects
	err := (*conn).Object("org.bluez", "/").
		CallWithContext(callCtx, "org.freedesktop.DBus.ObjectManager.GetManagedObjects", 0).
		Store(&objects)
	if err != nil {
		var dbusErr dbus.Error
		// An error BlueZ or the bus answered with leaves the connection
		// usable; any other one may not.
		if !errors.As(err, &dbusErr) {
			_ = (*conn).Close()
			*conn = nil
		}
		return nil, err
	}
	return readingOf(objects), nil
}
