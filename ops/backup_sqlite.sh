#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="$REPO_ROOT/data/remnant.sqlite"
BACKUP_DIR="$REPO_ROOT/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/remnant-$TIMESTAMP.sqlite"
GZIP=${GZIP:-true}
MAX_KEEP=${MAX_KEEP:-30}
RCLONE_REMOTE=${RCLONE_REMOTE:-}
KEEP_REMOTE=${KEEP_REMOTE:-4}

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" || true

# lock
LOCKFILE="$BACKUP_DIR/.backup.lock"
exec 9>"$LOCKFILE"
flock -n 9 || { echo "Backup already running, exiting."; exit 0; }

# free space check
MIN_FREE_MB=${MIN_FREE_MB:-512}
FREE_MB=$(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')
if [ "${FREE_MB:-0}" -lt "$MIN_FREE_MB" ]; then
  echo "Not enough free space ($FREE_MB MB) — skipping backup."
  exit 3
fi

[ -f "$DB_FILE" ] || { echo "Database not found: $DB_FILE" >&2; exit 2; }

# Flush WAL, then consistent backup (choose ONE of the next two)
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_FILE" 'PRAGMA wal_checkpoint(FULL);'
  # Recommended:
  sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
  # Or compaction instead:
  # sqlite3 "$DB_FILE" "VACUUM INTO '$BACKUP_FILE'"
else
  cp -p "$DB_FILE" "$BACKUP_FILE"
fi
echo "Saved backup: $BACKUP_FILE"

if [ "$GZIP" = true ] && command -v gzip >/dev/null 2>&1; then
  gzip -f "$BACKUP_FILE"
  BACKUP_FILE="$BACKUP_FILE.gz"
  echo "Compressed backup: $BACKUP_FILE"
fi

cd "$BACKUP_DIR"
shopt -s nullglob
to_delete=$(ls -1t remnant-*.sqlite* 2>/dev/null | sed -n "$((MAX_KEEP+1)),9999p") || true
[ -n "$to_delete" ] && echo "$to_delete" | xargs -r rm -- && echo "Pruned old backups"

if [ -n "$RCLONE_REMOTE" ] && command -v rclone >/dev/null 2>&1; then
  echo "Uploading $BACKUP_FILE to $RCLONE_REMOTE"
  rclone copyto "$BACKUP_FILE" "$RCLONE_REMOTE/$(basename "$BACKUP_FILE")" --quiet || echo "rclone upload failed"
  remote_files=$(rclone lsf --files-only "$RCLONE_REMOTE" | grep -E '^remnant-' | sort -r || true)
  if [ -n "$remote_files" ]; then
    to_delete=$(echo "$remote_files" | sed -n "$((KEEP_REMOTE+1)),9999p") || true
    [ -n "$to_delete" ] && while read -r f; do
      echo "Removing remote: $f"
      rclone deletefile "$RCLONE_REMOTE/$f" || echo "failed to delete $f"
    done <<< "$to_delete"
  fi
fi

exit 0