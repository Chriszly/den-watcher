//go:build !linux && !windows

package bluetooth

import "context"

// NewReader returns what reads the connected devices, which only Linux and
// Windows have: elsewhere it reads nothing.
func NewReader(string) func(context.Context) *Reading {
	return func(context.Context) *Reading { return nil }
}
