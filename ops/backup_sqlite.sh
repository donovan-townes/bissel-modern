#!/usr/bin/env bash
set -euo pipefail

# ops/backup_sqlite.sh
# Copies the repository's SQLite database to the `backups/` folder with a timestamp
# and rotates older backups. Designed to be run from cron or a systemd timer.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="$REPO_ROOT/data/remnant.sqlite"
BACKUP_DIR="$REPO_ROOT/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/remnant-$TIMESTAMP.sqlite"
GZIP=true
MAX_KEEP=30

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
	echo "Database file not found: $DB_FILE" >&2
	exit 2
fi

# If sqlite3 is installed, issue a WAL checkpoint to flush WAL into the DB file
if command -v sqlite3 >/dev/null 2>&1; then
	sqlite3 "$DB_FILE" 'PRAGMA wal_checkpoint(FULL);'
fi

cp -p "$DB_FILE" "$BACKUP_FILE"
echo "Saved backup: $BACKUP_FILE"

if [ "$GZIP" = true ]; then
	if command -v gzip >/dev/null 2>&1; then
		gzip -f "$BACKUP_FILE"
		BACKUP_FILE="$BACKUP_FILE.gz"
		echo "Compressed backup: $BACKUP_FILE"
	fi
fi

# Rotation: keep the most recent $MAX_KEEP backups
cd "$BACKUP_DIR"
shopt -s nullglob
files=(remnant-*.sqlite* )
if [ ${#files[@]} -gt $MAX_KEEP ]; then
	# List sorted by newest first, skip the first $MAX_KEEP, delete the rest
	to_delete=$(ls -1t remnant-*.sqlite* 2>/dev/null | sed -n "$((MAX_KEEP+1)),9999p") || true
	if [ -n "$to_delete" ]; then
		echo "$to_delete" | xargs -r rm --
		echo "Pruned old backups"
	fi
fi

exit 0
