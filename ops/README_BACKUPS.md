# Backups

This folder contains utility scripts to back up the SQLite database (`data/remnant.sqlite`) into the `backups/` folder.

## Files

- `backup_sqlite.sh` — Bash script for Unix systems (cron, systemd timer). Use on Linux/macOS.
- `backup_sqlite.ps1` — PowerShell script for Windows; suitable for scheduled Task Scheduler jobs.

## Usage examples

### Cron (daily at 03:30)

```cron
30 3 * * * /path/to/bissel-modern/ops/backup_sqlite.sh
```

### Systemd timer example

1. Create a systemd unit `bissel-backup.service`:

```ini
[Unit]
Description=Remnant SQLite backup

[Service]
Type=oneshot
ExecStart=/path/to/bissel-modern/ops/backup_sqlite.sh
User=youruser
WorkingDirectory=/path/to/bissel-modern
```

1. Create a timer `bissel-backup.timer`:

```ini
[Unit]
Description=Run remnant backup daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

1. Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bissel-backup.timer
```

### Windows (Task Scheduler)

- Use Task Scheduler to run `powershell.exe -File "C:\path\to\bissel-modern\ops\backup_sqlite.ps1"` on a schedule (daily/weekly as you prefer).

## Notes

- The scripts attempt a WAL checkpoint before copying (if `sqlite3` is available) to ensure a consistent copy when using WAL mode.
- Backups are rotated; the scripts keep the most recent 30 backups by default.
- Modify `MAX_KEEP` (bash) or pass `-MaxKeep` (PowerShell) to adjust retention.
