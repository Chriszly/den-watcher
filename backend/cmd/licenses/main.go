// Command licenses writes the licenses of the Go code compiled into the
// programs: the Go standard library and every module the programs import, for
// each operating system they are built for. The file is embedded into the
// programs with the website and served next to the website's own
// 3rdpartylicenses.txt, so the notices go wherever the programs go.
//
// Build the website first, then run it from backend/:
//
//	go run ./cmd/licenses
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

// licenseFile matches the files in a module's root that hold its license or
// its notices, such as LICENSE, LICENSE-SQLITE, COPYING or NOTICE.
var licenseFile = regexp.MustCompile(`(?i)^(licen[cs]e|copying|notice)([-._].*)?$`)

// module is what `go list -deps -json` says about a package's module.
type module struct {
	Path    string
	Version string
	Dir     string
	Main    bool
}

func main() {
	goos := flag.String("goos", "linux,windows", "the operating systems the programs are built for, comma-separated")
	out := flag.String("out", "internal/web/files/build/go-licenses.txt", "file to write the licenses to")
	flag.Parse()
	if err := run(strings.Split(*goos, ","), *out); err != nil {
		fmt.Fprintln(os.Stderr, "licenses:", err)
		os.Exit(1)
	}
}

func run(systems []string, out string) error {
	var modules []module
	for _, goos := range systems {
		found, err := listModules(goos)
		if err != nil {
			return err
		}
		for _, m := range found {
			if !slices.ContainsFunc(modules, func(have module) bool { return have.Path == m.Path }) {
				modules = append(modules, m)
			}
		}
	}
	slices.SortFunc(modules, func(a, b module) int { return strings.Compare(a.Path, b.Path) })

	goroot, err := goEnv("GOROOT")
	if err != nil {
		return err
	}
	version, err := goEnv("GOVERSION")
	if err != nil {
		return err
	}

	var text bytes.Buffer
	fmt.Fprintf(&text, "The Go code compiled into usage-control (%s) and its license notices.\n", strings.Join(systems, ", "))
	fmt.Fprintln(&text, "The website's own packages are listed in 3rdpartylicenses.txt.")
	if err := writeLicenses(&text, "Go standard library "+version, goroot, []string{"LICENSE"}); err != nil {
		return err
	}
	for _, m := range modules {
		names, err := licenseFiles(m.Dir)
		if err != nil {
			return err
		}
		if len(names) == 0 {
			return fmt.Errorf("%s %s has no license file in %s; check its license by hand before using it", m.Path, m.Version, m.Dir)
		}
		if err := writeLicenses(&text, m.Path+" "+m.Version, m.Dir, names); err != nil {
			return err
		}
	}

	if err := os.MkdirAll(filepath.Dir(out), 0o750); err != nil {
		return err
	}
	return os.WriteFile(out, text.Bytes(), 0o644) //nolint:gosec // a public file served with the website
}

// listModules returns the modules, other than this one, of the packages the
// programs import when built for goos. Tests are not included.
func listModules(goos string) ([]module, error) {
	cmd := exec.Command("go", "list", "-deps", "-json=Module", "./...")
	cmd.Env = append(os.Environ(), "GOOS="+goos, "CGO_ENABLED=0")
	cmd.Stderr = os.Stderr
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("go list for %s: %w", goos, err)
	}
	var modules []module
	decoder := json.NewDecoder(bytes.NewReader(output))
	for {
		var pkg struct{ Module *module }
		if err := decoder.Decode(&pkg); errors.Is(err, io.EOF) {
			return modules, nil
		} else if err != nil {
			return nil, fmt.Errorf("go list for %s: %w", goos, err)
		}
		if pkg.Module == nil || pkg.Module.Main {
			continue
		}
		if pkg.Module.Dir == "" {
			return nil, fmt.Errorf("%s is not downloaded; run go mod download", pkg.Module.Path)
		}
		modules = append(modules, *pkg.Module)
	}
}

// licenseFiles returns the names of the license files in a module's root.
func licenseFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, entry := range entries {
		// Skips Go files such as license.go, which are code, not notices.
		if !entry.IsDir() && licenseFile.MatchString(entry.Name()) && filepath.Ext(entry.Name()) != ".go" {
			names = append(names, entry.Name())
		}
	}
	return names, nil
}

// writeLicenses adds one module's license files under a heading.
func writeLicenses(text *bytes.Buffer, heading, dir string, names []string) error {
	rule := strings.Repeat("=", 78)
	fmt.Fprintf(text, "\n%s\n%s\n%s\n", rule, heading, rule)
	for _, name := range names {
		content, err := os.ReadFile(filepath.Join(dir, name)) //nolint:gosec // a license file in the module cache or GOROOT
		if err != nil {
			return err
		}
		if len(names) > 1 {
			fmt.Fprintf(text, "\n--- %s ---\n", name)
		}
		fmt.Fprintf(text, "\n%s\n", strings.TrimSpace(string(content)))
	}
	return nil
}

func goEnv(name string) (string, error) {
	output, err := exec.Command("go", "env", name).Output() //nolint:gosec // name is always GOROOT or GOVERSION
	if err != nil {
		return "", fmt.Errorf("go env %s: %w", name, err)
	}
	return strings.TrimSpace(string(output)), nil
}
