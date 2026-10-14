#!/usr/bin/env bash
# Full measurement pass. Usage: run-all.sh <label> [extra run.mjs args…]
#   1. (optional) BUILD=1 → npm run build in the repo first
#   2. assets.mjs → results/<label>/assets.json
#   3. run.mjs    → results/<label>/{desktop,mobile4,mobile6}.json, summary.json, shots/
# Then: node compare.mjs baseline <label>   and   node shotdiff.mjs baseline <label>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LABEL="${1:-latest}"; shift || true
ROOT="${ROOT:-/home/user/WEBSITES}"
OUT="$HERE/../results/$LABEL"
mkdir -p "$OUT"
if [[ "${BUILD:-0}" == "1" ]]; then (cd "$ROOT" && npm run build) > "$OUT/build.log" 2>&1; fi
node "$HERE/assets.mjs" --root="$ROOT" --out="$OUT" | tee "$OUT/assets.txt"
NODE_PATH="$(npm root -g)" node "$HERE/run.mjs" --root="$ROOT" --label="$LABEL" --cpuprofile "$@" 2>&1 | tee "$OUT/run.txt"
