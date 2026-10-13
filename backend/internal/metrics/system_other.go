//go:build !linux && !windows

package metrics

import (
	"context"
	"strings"

	"github.com/shirou/gopsutil/v4/host"
)

// readOS returns the operating system and its version as gopsutil tells
// them.
func readOS(ctx context.Context) string {
	platform, _, version, err := host.PlatformInformationWithContext(ctx)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(platform + " " + version)
}

// readBoard reports no maker or model: reading them is not supported on this
// system yet.
func readBoard() (maker, model string) { return "", "" }
