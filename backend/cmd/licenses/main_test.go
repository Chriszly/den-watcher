package main

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestFindsTheLicenseFilesInAModulesRoot(t *testing.T) {
	dir := t.TempDir()
	for _, name := range []string{"LICENSE", "LICENSE-SQLITE", "COPYING", "notice.txt", "license.go", "README.md", "licenses_test.go"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(name), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.Mkdir(filepath.Join(dir, "LICENSES"), 0o700); err != nil {
		t.Fatal(err)
	}
	names, err := licenseFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"COPYING", "LICENSE", "LICENSE-SQLITE", "notice.txt"}
	if !slices.Equal(names, want) {
		t.Errorf("licenseFiles = %v, want %v", names, want)
	}
}

// Runs it on this module, whose modules are in the module cache once the
// tests build.
func TestWritesTheLicensesOfEveryModuleTheProgramsUse(t *testing.T) {
	if err := os.Chdir("../.."); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir("cmd/licenses") })
	out := filepath.Join(t.TempDir(), "go-licenses.txt")
	if err := run([]string{"linux", "windows"}, out); err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(out) //nolint:gosec // the test's own temporary file
	if err != nil {
		t.Fatal(err)
	}
	text := string(content)
	for _, heading := range []string{
		"\nGo standard library go",
		"\ngithub.com/shirou/gopsutil/v4 v",
		"\nmodernc.org/sqlite v",
		"\n--- LICENSE-SQLITE ---\n",
		// Only in the Windows programs.
		"\nfyne.io/systray v",
	} {
		if !strings.Contains(text, heading) {
			t.Errorf("the licenses have no %q", strings.TrimSpace(heading))
		}
	}
	if strings.Contains(text, "github.com/stretchr/testify") {
		t.Error("the licenses list a module only the tests use")
	}
}
