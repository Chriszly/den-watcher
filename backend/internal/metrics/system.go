package metrics

import (
	"context"
	"slices"
	"strings"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/host"
)

// System is what the machine is: its operating system, kernel, CPU and the
// board or PC model, which change only with an update or new hardware, so
// they are read once at start. Each is left out where the machine does not
// tell it. Serial numbers and network addresses are never read.
type System struct {
	// OS is the operating system with its version, such as "Debian GNU/Linux
	// 13 (trixie)" or "Microsoft Windows 11 Pro 24H2". In a container it is
	// the host's, from HOST_ETC, and left out when that is not set.
	OS string `json:"os,omitempty"`
	// Kernel is the version of the kernel, such as "6.12.47+rpt-rpi-2712".
	Kernel string `json:"kernel,omitempty"`
	// Architecture is the machine's, such as "aarch64" or "x86_64".
	Architecture string `json:"architecture,omitempty"`
	// CPU is the processor's model, such as "Cortex-A76"; the models of the
	// cores are joined by commas where they differ.
	CPU string `json:"cpu,omitempty"`
	// Maker and Model are the board's or PC's, such as "Raspberry Pi 5 Model
	// B Rev 1.0", which names the maker in the model itself.
	Maker string `json:"maker,omitempty"`
	Model string `json:"model,omitempty"`
}

// readSystem reads what the machine is, or returns nil when it tells none of
// it.
func readSystem(ctx context.Context) *System {
	s := System{OS: readOS(ctx), CPU: cpuModels(ctx)}
	s.Kernel, _ = host.KernelVersionWithContext(ctx)
	// Windows adds the build again, as in "10.0.26100.4652 Build 26100.4652".
	s.Kernel, _, _ = strings.Cut(s.Kernel, " Build ")
	s.Architecture, _ = host.KernelArch()
	s.Maker, s.Model = readBoard()
	return CleanSystem(&s)
}

// cpuModels returns the models of the CPU's cores, each once.
func cpuModels(ctx context.Context) string {
	infos, _ := cpu.InfoWithContext(ctx)
	var models []string
	for _, info := range infos {
		// gopsutil names an ARM core it does not know "Undefined".
		model := strings.Join(strings.Fields(info.ModelName), " ")
		if model != "" && model != "Undefined" && !slices.Contains(models, model) {
			models = append(models, model)
		}
	}
	return strings.Join(models, ", ")
}

// placeholders are what PC makers leave in the firmware where they did not
// fill in the maker or model, which tell nothing.
var placeholders = []string{
	"to be filled by o.e.m.",
	"system manufacturer",
	"system product name",
	"default string",
	"not applicable",
	"not specified",
	"o.e.m.",
	"oem",
	"none",
}

// firmwareText returns a maker or model as the firmware tells it, without
// spaces and the zero bytes a device tree ends its texts with, or "" for a
// placeholder.
func firmwareText(text string) string {
	text = strings.Join(strings.Fields(strings.ReplaceAll(text, "\x00", " ")), " ")
	if slices.Contains(placeholders, strings.ToLower(text)) {
		return ""
	}
	return text
}

// CleanSystem returns s with every text cut to MaxTextLength characters, as
// a hub shows what another device reported, or nil when s tells nothing.
func CleanSystem(s *System) *System {
	if s == nil {
		return nil
	}
	clean := System{
		OS:           CleanText(s.OS),
		Kernel:       CleanText(s.Kernel),
		Architecture: CleanText(s.Architecture),
		CPU:          CleanText(s.CPU),
		Maker:        CleanText(s.Maker),
		Model:        CleanText(s.Model),
	}
	if clean == (System{}) {
		return nil
	}
	return &clean
}

// CleanText returns a text another device reported, such as its version, cut
// to MaxTextLength characters with invalid UTF-8 replaced, as a hub shows and
// stores it.
func CleanText(text string) string {
	return cutTo(text, MaxTextLength)
}
