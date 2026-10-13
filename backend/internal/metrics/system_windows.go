package metrics

import (
	"context"
	"strings"

	"github.com/shirou/gopsutil/v4/host"
	"golang.org/x/sys/windows/registry"
)

// readOS returns the edition of Windows and its version, such as "Microsoft
// Windows 11 Pro 24H2".
func readOS(ctx context.Context) string {
	platform, _, version, err := host.PlatformInformationWithContext(ctx)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(platform + " " + version)
}

// readBoard reads the PC's maker and model from what the firmware told
// Windows, under HKLM\HARDWARE\DESCRIPTION\System\BIOS. The serial number is
// not kept there.
func readBoard() (maker, model string) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, `HARDWARE\DESCRIPTION\System\BIOS`, registry.QUERY_VALUE)
	if err != nil {
		return "", ""
	}
	defer func() { _ = key.Close() }()
	maker, _, _ = key.GetStringValue("SystemManufacturer")
	model, _, _ = key.GetStringValue("SystemProductName")
	return firmwareText(maker), firmwareText(model)
}
