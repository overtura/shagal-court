#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DRY_RUN=""
STATUS_ONLY=""
FORCE_SIZE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN="-DryRun" ;;
    --status) STATUS_ONLY="-StatusOnly" ;;
    --force-size)
      shift
      FORCE_SIZE="$1"
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

if command -v pwsh >/dev/null 2>&1; then
  SHELL_EXE="pwsh"
elif command -v powershell.exe >/dev/null 2>&1; then
  SHELL_EXE="powershell.exe"
else
  echo "PowerShell is required because the central maintainer bot runner is a PowerShell script." >&2
  exit 1
fi

set -- -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/run-self-improvement.ps1"
if [ -n "$DRY_RUN" ]; then set -- "$@" "$DRY_RUN"; fi
if [ -n "$STATUS_ONLY" ]; then set -- "$@" "$STATUS_ONLY"; fi
if [ -n "$FORCE_SIZE" ]; then set -- "$@" -ForceSize "$FORCE_SIZE"; fi
exec "$SHELL_EXE" "$@"
