#!/bin/sh
# Write a patch holding only the edits made to the listed files since the last patch.
# Usage: sh mkpatch.sh NN-name path/to/file1 path/to/file2 ...   (paths relative to the repo root)
# Baseline: ~/ux-audit-tools/baseline (copy of src/, content/, public/ and configs before any audit edit).
# Snapshot: ~/ux-audit-tools/snapshot rolls forward per file after every patch, so each patch is its own group.
# Apply from the repo root:  patch -p1 < docs/ux-audit/patches/NN-name.patch
# Revert:                    patch -R -p1 < docs/ux-audit/patches/NN-name.patch
set -e
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE="$HOME/ux-audit-tools/baseline"
SNAP="$HOME/ux-audit-tools/snapshot"
LINKS="$HOME/ux-audit-tools/difflinks"
OUT="$ROOT/docs/ux-audit/patches"
NAME="$1"; shift
mkdir -p "$OUT"
[ -d "$SNAP" ] || cp -R "$BASE" "$SNAP"
rm -rf "$LINKS"; mkdir -p "$LINKS"
ln -s "$SNAP" "$LINKS/a"
ln -s "$ROOT" "$LINKS/b"
cd "$LINKS"
: > "$OUT/$NAME.patch"
for f in "$@"; do
  diff -uN --label "a/$f" --label "b/$f" "a/$f" "b/$f" >> "$OUT/$NAME.patch" || true
done
cd "$ROOT"
for f in "$@"; do
  mkdir -p "$SNAP/$(dirname "$f")"
  if [ -e "$f" ]; then cp "$f" "$SNAP/$f"; else rm -f "$SNAP/$f"; fi
done
wc -l "$OUT/$NAME.patch"
