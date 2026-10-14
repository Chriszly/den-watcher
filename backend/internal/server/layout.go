package server

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/Chriszly/den-watcher/backend/internal/layout"
)

// maxLayoutBytes is the largest body of PUT /api/layout: room for every list
// of the layout at its longest.
const maxLayoutBytes = 128 << 10

// readLayout serves GET /api/layout: how the page is arranged.
func readLayout(store LayoutStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l, err := store.Read(r.Context())
		if err != nil {
			slog.Error("read the layout", "error", err)
			http.Error(w, "could not read the layout", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, l)
	}
}

// writeLayout serves PUT /api/layout, which keeps a new arrangement of the
// page. It needs no password: the layout changes only how the page looks,
// not what the hub collects, and only the local network reaches the page.
func writeLayout(store LayoutStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var l layout.Layout
		if !readJSON(w, r, &l, maxLayoutBytes) {
			return
		}
		err := store.Write(r.Context(), l)
		var input *layout.InputError
		switch {
		case errors.As(err, &input):
			writeJSON(w, http.StatusBadRequest, problemResponse{problemRequest, input.Message})
		case err != nil:
			slog.Error("store the layout", "error", err)
			http.Error(w, "could not store the layout", http.StatusInternalServerError)
		default:
			w.WriteHeader(http.StatusNoContent)
		}
	}
}
