#!/usr/bin/env bash
# check-demo-covers-addons.sh - fail when an add-on has no mock data in the demo.
#
# Each add-on is a folder in backend/internal/addons. The demo page
# (frontend/src/demo/fleet.ts) shows an add-on through a function named after
# its folder, such as bluetoothAddOn() for addons/bluetooth, that returns the
# cards the add-on reports. This check fails when that function is missing, or
# when no made-up device uses it, so a new add-on brings its demo along in the
# same pull request.
#
# Run: bash ci/check-demo-covers-addons.sh [DIR]
set -euo pipefail

DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$DIR"
fleet=frontend/src/demo/fleet.ts
problems=0
problem() { printf '[FAIL] %s\n' "$*" >&2; problems=$((problems + 1)); }

[[ -f "$fleet" ]] || { echo "[FAIL] $fleet not found; run this from the repository" >&2; exit 1; }

addons=0
for folder in backend/internal/addons/*/; do
  name="$(basename "$folder")"
  addons=$((addons + 1))
  if ! grep -qE "^function ${name}AddOn\(" "$fleet"; then
    problem "add-on $name: no ${name}AddOn() in $fleet; add the cards it reports to the demo"
  # Comments that name it are no use; only code lines count.
  elif [[ "$(grep -vE '^\s*(//|/?\*)' "$fleet" | grep -cE "\b${name}AddOn\(")" -lt 2 ]]; then
    problem "add-on $name: no device in $fleet uses ${name}AddOn(); add it to one, with its values"
  fi
done

if [[ "$addons" -eq 0 ]]; then
  echo "[FAIL] no add-ons found in backend/internal/addons" >&2
  exit 1
fi
if [[ "$problems" -gt 0 ]]; then
  echo "$problems add-on(s) missing from the demo" >&2
  exit 1
fi
echo "[PASS] The demo shows all $addons add-ons."
