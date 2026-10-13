package metrics

import (
	"strings"
	"testing"
)

func TestFirmwareText(t *testing.T) {
	tests := map[string]string{
		"Raspberry Pi 5 Model B Rev 1.0\x00": "Raspberry Pi 5 Model B Rev 1.0",
		"  LENOVO \n":                        "LENOVO",
		"To Be Filled By O.E.M.":             "",
		"System manufacturer":                "",
		"Default string":                     "",
		"":                                   "",
	}
	for text, want := range tests {
		if got := firmwareText(text); got != want {
			t.Errorf("firmwareText(%q) = %q, want %q", text, got, want)
		}
	}
}

func TestCleanSystem(t *testing.T) {
	if got := CleanSystem(nil); got != nil {
		t.Errorf("CleanSystem(nil) = %+v, want nil", got)
	}
	if got := CleanSystem(&System{}); got != nil {
		t.Errorf("CleanSystem of an empty System = %+v, want nil", got)
	}
	long := strings.Repeat("x", MaxTextLength+10)
	got := CleanSystem(&System{OS: long, Model: "Pi\xff"})
	if got == nil || len([]rune(got.OS)) != MaxTextLength || got.Model != "Pi�" {
		t.Errorf("CleanSystem cut the texts to %+v", got)
	}
}
