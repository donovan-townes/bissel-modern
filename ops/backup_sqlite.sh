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
# Optional rclone remote (set RCLONE_REMOTE in environment, e.g. 'gdrive:remnant')
RCLONE_REMOTE=${RCLONE_REMOTE:-}
KEEP_REMOTE=${KEEP_REMOTE:-4}

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

# Upload to remote via rclone if configured
if [ -n "$RCLONE_REMOTE" ] && command -v rclone >/dev/null 2>&1; then
	echo "Uploading $BACKUP_FILE to remote: $RCLONE_REMOTE"
	rclone copyto "$BACKUP_FILE" "$RCLONE_REMOTE/$(basename "$BACKUP_FILE")" --quiet || echo "rclone upload failed"

	# Prune remote: keep most recent $KEEP_REMOTE files
	remote_files=$(rclone lsf --files-only --max-age 3650d "$RCLONE_REMOTE" | grep -E '^remnant-' | sort -r)
	if [ -n "$remote_files" ]; then
		# list in chronological order (newest first), skip KEEP_REMOTE, delete the rest
		to_delete=$(echo "$remote_files" | sed -n "$((KEEP_REMOTE+1)),9999p") || true
		if [ -n "$to_delete" ]; then
			echo "$to_delete" | while read -r f; do
				echo "Removing remote file: $f"
				rclone deletefile "$RCLONE_REMOTE/$f" || echo "failed to delete $f"
			done
		fi
	fi
fi

exit 0
