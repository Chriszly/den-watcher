//go:build !linux

package bluetooth

import "context"

// NewReader returns what reads the connected devices, which only Linux has
// for now: elsewhere it reads nothing.
func NewReader(string) func(context.Context) *Reading {
	return func(context.Context) *Reading { return nil }
}
