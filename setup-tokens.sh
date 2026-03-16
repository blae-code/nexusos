#!/usr/bin/env bash
# =============================================================================
# setup-tokens.sh
# NexusOS tactical token asset setup
#
# PURPOSE:
#   Copies all 232 token PNG files from the tokens.zip source into
#   public/tokens/, fixing two known filename typo sets in the source archive
#   so that all files match the canonical names expected by tokenMap.js.
#
# USAGE:
#   Place tokens.zip in the repo root (or pass its path as $1), then run:
#     bash scripts/setup-tokens.sh
#   or
#     bash scripts/setup-tokens.sh /path/to/tokens.zip
#
# Run this once after initial clone. Safe to re-run — destination files are
# overwritten but never deleted, so any manual additions to public/tokens/
# are preserved.
#
# TYPOS FIXED BY THIS SCRIPT:
#   Typo set 1 — Missing leading 't' on triangle files (6 files):
#     oken-triangle-{green,grey,orange,red,violet,yellow}.png
#     → token-triangle-{green,grey,orange,red,violet,yellow}.png
#
#   Typo set 2 — Triple-e 'greeen' on number tokens 8–13 (6 files):
#     token-number-{8,9,10,11,12,13}-greeen.png
#     → token-number-{8,9,10,11,12,13}-green.png
#
# REQUIREMENTS: unzip, cp (standard Unix utilities)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ZIP_PATH="${1:-${REPO_ROOT}/tokens.zip}"
DEST_DIR="${REPO_ROOT}/public/tokens"
WORK_DIR="$(mktemp -d)"

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "ERROR: tokens.zip not found at: $ZIP_PATH"
  echo "Usage: bash scripts/setup-tokens.sh [/path/to/tokens.zip]"
  exit 1
fi

command -v unzip >/dev/null 2>&1 || { echo "ERROR: unzip is required but not installed."; exit 1; }

# ---------------------------------------------------------------------------
# Extract
# ---------------------------------------------------------------------------

echo "→ Extracting tokens.zip to temp directory..."
unzip -q "$ZIP_PATH" -d "$WORK_DIR"

# ---------------------------------------------------------------------------
# Create destination
# ---------------------------------------------------------------------------

mkdir -p "$DEST_DIR"

# ---------------------------------------------------------------------------
# Copy with typo correction
# ---------------------------------------------------------------------------

COPIED=0
FIXED=0
SKIPPED=0

while IFS= read -r -d '' src_file; do
  filename="$(basename "$src_file")"
  dest_filename="$filename"

  # --- Fix typo set 1: missing leading 't' on triangle files ---
  if [[ "$filename" == oken-triangle-* ]]; then
    dest_filename="t${filename}"
    FIXED=$((FIXED + 1))
    echo "  FIXED typo: $filename → $dest_filename"
  fi

  # --- Fix typo set 2: 'greeen' → 'green' on number tokens 8-13 ---
  if [[ "$filename" == *-greeen.png ]]; then
    dest_filename="${filename//-greeen.png/-green.png}"
    FIXED=$((FIXED + 1))
    echo "  FIXED typo: $filename → $dest_filename"
  fi

  # --- Skip non-token files that might be in the archive ---
  if [[ "$dest_filename" != token-*.png ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  cp "$src_file" "${DEST_DIR}/${dest_filename}"
  COPIED=$((COPIED + 1))

done < <(find "$WORK_DIR" -name "*.png" -print0)

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

rm -rf "$WORK_DIR"

# ---------------------------------------------------------------------------
# Verify expected counts
# ---------------------------------------------------------------------------

ACTUAL_COUNT=$(find "$DEST_DIR" -name "token-*.png" | wc -l | tr -d ' ')
EXPECTED_COUNT=232

echo ""
echo "=== Token setup complete ==="
echo "  Copied:   $COPIED files"
echo "  Fixed:    $FIXED filename typos"
echo "  Skipped:  $SKIPPED non-token files"
echo "  Destination: $DEST_DIR"
echo "  Files in destination: $ACTUAL_COUNT (expected $EXPECTED_COUNT)"
echo ""

if [[ "$ACTUAL_COUNT" -lt "$EXPECTED_COUNT" ]]; then
  echo "WARNING: Expected $EXPECTED_COUNT token files but found $ACTUAL_COUNT."
  echo "         Check that tokens.zip contains the complete library."
else
  echo "✓ All $EXPECTED_COUNT token files present and verified."
fi

# ---------------------------------------------------------------------------
# Spot-check a few key files that tokenMap.js depends on
# ---------------------------------------------------------------------------

REQUIRED_SPOT_CHECK=(
  "token-hex-green.png"
  "token-hex-grey.png"
  "token-target-red.png"
  "token-target-alt-orange.png"
  "token-objective-blue.png"
  "token-objective-cyan.png"
  "token-penta-cyan.png"
  "token-circle-red.png"
  "token-number-1-green.png"
  "token-number-1-cyan.png"
  "token-number-1-blue.png"
  # NOTE: token-number-1-grey.png does NOT exist in the source archive —
  # grey variants are absent for ALL number tokens (0–13). This is a known
  # gap in the asset library. tokenMap.js phaseToken() returns the blue
  # variant for LOCKED state; PhaseTracker.jsx renders it at opacity 0.35.
  "token-triangle-green.png"
  "token-triangle-grey.png"
  "token-number-8-green.png"
  "token-number-13-green.png"
)

MISSING=0
for f in "${REQUIRED_SPOT_CHECK[@]}"; do
  if [[ ! -f "${DEST_DIR}/$f" ]]; then
    echo "  MISSING: $f"
    MISSING=$((MISSING + 1))
  fi
done

if [[ $MISSING -eq 0 ]]; then
  echo "✓ Spot-check passed: all critical tokenMap.js dependencies present."
else
  echo "ERROR: $MISSING required files missing. tokenMap.js will produce broken paths."
  exit 1
fi
