# ops/backup_sqlite.ps1
# Copies the repository's SQLite database to the `backups/` folder with a timestamp.
# Designed for Windows (PowerShell) scheduled task or manual run.

param(
    [string]$RepoRoot,
    [object]$MaxKeep = 30,
    [System.Management.Automation.SwitchParameter]$Compress
)

$ErrorActionPreference = 'Stop'

# If RepoRoot wasn't provided, infer it as the parent folder of this script's directory
if (-not $RepoRoot) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Split-Path -Parent $scriptDir
}

$null = $MaxKeep
# Coerce MaxKeep to an integer safely (handles binding oddities)
try { $MaxKeep = [int]$MaxKeep } catch { $MaxKeep = 30 }

$DBFile = Join-Path $RepoRoot 'data\remnant.sqlite'
$BackupDir = Join-Path $RepoRoot 'backups'
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }

if (-not (Test-Path $DBFile)) {
    Write-Error "Database file not found: $DBFile"
    exit 2
}

# Attempt WAL checkpoint if sqlite3 is available
try {
    $sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if ($sqlite) { & sqlite3 $DBFile 'PRAGMA wal_checkpoint(FULL);' }
} catch { }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $BackupDir "remnant-$timestamp.sqlite"
Copy-Item -Path $DBFile -Destination $backupFile -Force
Write-Output "Saved backup: $backupFile"

if ($Compress.IsPresent) {
    try {
        if (Get-Command gzip -ErrorAction SilentlyContinue) {
            & gzip -f $backupFile
            $backupFile = "$backupFile.gz"
            Write-Output "Compressed backup: $backupFile"
        }
    } catch { }
}

# Rotation: keep the most recent $MaxKeep backups
$pattern = 'remnant-*.sqlite*'
$files = Get-ChildItem -Path $BackupDir -Filter $pattern | Sort-Object LastWriteTime -Descending
if ($files.Count -gt $MaxKeep) {
    $toDelete = $files | Select-Object -Skip $MaxKeep
    $toDelete | ForEach-Object { Remove-Item -Path $_.FullName -Force }
    Write-Output "Pruned old backups"
}
