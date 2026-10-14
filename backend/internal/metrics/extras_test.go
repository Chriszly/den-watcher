package metrics

import (
	"math"
	"reflect"
	"strings"
	"testing"
)

func number(v float64) *float64 { return &v }

func TestCleanExtrasKeepsValidValues(t *testing.T) {
	extras := []Extra{{
		ID:     "pressure",
		Title:  "Pressure",
		Titles: map[string]string{"de": "Druck", "en-US": "Pressure"},
		Items: []ExtraItem{
			{ID: "cpu", Label: "CPU", Unit: UnitPercent, Value: number(3.5), History: true},
			{ID: "kernel", Label: "Kernel", Unit: UnitText, Text: "6.12"},
			{ID: "sda-temperature", Label: "WDC (sda): Temperature", Section: "WDC (sda)", Unit: UnitCelsius, Value: number(38)},
		},
	}}

	if got := CleanExtras(extras, 64); !reflect.DeepEqual(got, extras) {
		t.Errorf("CleanExtras() = %+v, want it unchanged", got)
	}
}

func TestCleanExtrasLeavesOutWhatCannotBeShown(t *testing.T) {
	extras := []Extra{
		{ID: "Bad ID", Title: "x", Items: []ExtraItem{{ID: "a", Unit: UnitNumber, Value: number(1)}}},
		{ID: "empty", Title: "No values"},
		{ID: "ok", Title: strings.Repeat("t", 200), Titles: map[string]string{"german": "x", "de": "y"}, Items: []ExtraItem{
			{ID: "a", Label: "A", Unit: UnitNumber, Value: number(1), Texts: map[string]string{"de": "x"}},
			{ID: "a", Label: "Again", Unit: UnitNumber, Value: number(2)},
			{ID: "missing", Label: "No value", Unit: UnitWatts},
			{ID: "nan", Label: "NaN", Unit: UnitWatts, Value: number(math.NaN())},
			{ID: "future", Label: "New unit", Unit: "lux", Value: number(300), History: true},
			{ID: "text", Label: "Text", Unit: UnitText, Text: "hi", Texts: map[string]string{"de": "hallo", "german": "x"}, Value: number(1), History: true},
		}},
		{ID: "ok", Title: "Same id", Items: []ExtraItem{{ID: "a", Unit: UnitNumber, Value: number(1)}}},
	}

	got := CleanExtras(extras, 64)

	want := []Extra{{ID: "ok", Title: strings.Repeat("t", MaxTextLength), Titles: map[string]string{"de": "y"}, Items: []ExtraItem{
		{ID: "a", Label: "A", Unit: UnitNumber, Value: number(1)},
		{ID: "future", Label: "New unit", Unit: UnitNumber, Value: number(300), History: true},
		{ID: "text", Label: "Text", Unit: UnitText, Text: "hi", Texts: map[string]string{"de": "hallo"}},
	}}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("CleanExtras() = %+v, want %+v", got, want)
	}
}

func TestCleanExtrasKeepsAtMostMaxEntries(t *testing.T) {
	items := []ExtraItem{
		{ID: "a", Unit: UnitNumber, Value: number(1)},
		{ID: "b", Unit: UnitNumber, Value: number(2)},
		{ID: "c", Unit: UnitNumber, Value: number(3)},
	}
	extras := []Extra{{ID: "one", Items: items}, {ID: "two", Items: items}, {ID: "three", Items: items}}

	got := CleanExtras(extras, 2)

	if len(got) != 2 || len(got[0].Items) != 2 || len(got[1].Items) != 2 {
		t.Errorf("CleanExtras() = %+v, want 2 groups of 2 values", got)
	}
}

func TestCleanExtrasKeepsTheOnesWithAHistoryFirstByID(t *testing.T) {
	text := ExtraItem{ID: "a", Unit: UnitText, Text: "hi"}
	extras := []Extra{
		{ID: "z", Items: []ExtraItem{text}},
		{ID: "y", Items: []ExtraItem{
			text,
			{ID: "d", Unit: UnitNumber, Value: number(1), History: true},
			{ID: "b", Unit: UnitNumber, Value: number(2)},
			{ID: "c", Unit: UnitNumber, Value: number(3), History: true},
		}},
		{ID: "x", Items: []ExtraItem{{ID: "a", Unit: UnitNumber, Value: number(4)}}},
		{ID: "w", Items: []ExtraItem{{ID: "a", Unit: UnitNumber, Value: number(5), History: true}}},
		{ID: "v", Items: []ExtraItem{text}},
	}

	got := CleanExtras(extras, 2)

	// In the order the device listed them.
	want := []Extra{
		{ID: "y", Items: []ExtraItem{
			{ID: "d", Unit: UnitNumber, Value: number(1), History: true},
			{ID: "c", Unit: UnitNumber, Value: number(3), History: true},
		}},
		{ID: "w", Items: []ExtraItem{{ID: "a", Unit: UnitNumber, Value: number(5), History: true}}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("CleanExtras() = %+v, want %+v", got, want)
	}
}

func TestCleanExtrasFillsUpWithTheOthersInTheDevicesOrder(t *testing.T) {
	item := func(id string) ExtraItem { return ExtraItem{ID: id, Unit: UnitNumber, Value: number(1)} }
	// Top processes, the busiest first, as the processes add-on lists them.
	extras := []Extra{
		{ID: "pid-900", Items: []ExtraItem{item("cpu"), item("memory"), item("disk")}},
		{ID: "pid-10", Items: []ExtraItem{item("cpu")}},
		{ID: "pid-1", Items: []ExtraItem{item("cpu")}},
		{ID: "history", Items: []ExtraItem{{ID: "a", Unit: UnitNumber, Value: number(1), History: true}}},
	}

	got := CleanExtras(extras, 2)

	if len(got) != 2 || got[0].ID != "pid-900" || got[1].ID != "history" {
		t.Fatalf("CleanExtras() = %+v, want the group with a history and then the busiest process", got)
	}
	if items := got[0].Items; len(items) != 2 || items[0].ID != "cpu" || items[1].ID != "memory" {
		t.Errorf("values of the busiest process = %+v, want the first two the device listed", items)
	}
}

func TestCleanTranslationsKeepsTheSameLanguagesEveryTime(t *testing.T) {
	texts := map[string]string{"af": ""}
	for _, language := range []string{"zu", "de", "fr", "es", "it", "nl", "pl", "pt", "sv", "da", "fi"} {
		texts[language] = "text " + language
	}
	want := cleanTranslations(texts, MaxTextLength)

	if len(want) != maxTranslations {
		t.Fatalf("cleanTranslations() kept %d languages, want %d", len(want), maxTranslations)
	}
	if _, ok := want["af"]; ok {
		t.Error("cleanTranslations() kept an empty text")
	}
	for range 20 {
		if got := cleanTranslations(texts, MaxTextLength); !reflect.DeepEqual(got, want) {
			t.Fatalf("cleanTranslations() = %v, then %v, want the same languages every time", want, got)
		}
	}
}

func TestCleanExtrasCutsTheSection(t *testing.T) {
	extras := []Extra{{ID: "smart", Title: "Disk health", Items: []ExtraItem{
		{ID: "a", Label: "x", Section: strings.Repeat("s", MaxTextLength+5), Unit: UnitNumber, Value: number(1)},
	}}}

	if got := CleanExtras(extras, 64)[0].Items[0].Section; len(got) != MaxTextLength {
		t.Errorf("section has %d characters, want %d", len(got), MaxTextLength)
	}
}

func TestCleanExtrasKeepsLongerDescriptions(t *testing.T) {
	long := strings.Repeat("d", MaxDescriptionLength+5)
	extras := []Extra{{
		ID: "power", Title: "Power", Description: long, Descriptions: map[string]string{"de": long, "bad code": "x"},
		Items: []ExtraItem{{ID: "a", Label: "x", Unit: UnitWatts, Value: number(1)}},
	}}

	got := CleanExtras(extras, 64)[0]
	if len(got.Description) != MaxDescriptionLength || len(got.Descriptions["de"]) != MaxDescriptionLength || len(got.Descriptions) != 1 {
		t.Errorf("CleanExtras() = %q %v, want the descriptions cut to %d characters", got.Description, got.Descriptions, MaxDescriptionLength)
	}
}

func TestShortID(t *testing.T) {
	tests := []struct {
		text  string
		limit int
		want  string
	}{
		{"Disk 0", 40, "disk-0"},
		{"  WD_Red  ", 40, "wd-red"},
		{"", 40, ""},
		{"a-very-long-serial-number-that-does-not-fit", 25, "a-very-long-seri-84380a07"},
	}
	for _, tt := range tests {
		if got := ShortID(tt.text, tt.limit); got != tt.want {
			t.Errorf("ShortID(%q, %d) = %q, want %q", tt.text, tt.limit, got, tt.want)
		}
	}
}
