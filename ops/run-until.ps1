param(
  [int]$CutoffHour = 4  # set 4 for 4am, 6 for 6am, etc.
)

# Compute next cutoff today or tomorrow at CutoffHour local time
$now = Get-Date
$cutoff = Get-Date -Hour $CutoffHour -Minute 0 -Second 0
if ($cutoff -le $now) { $cutoff = $cutoff.AddDays(1) }

# Log file
$logDir = "logs"
$null = New-Item -ItemType Directory -Force -Path $logDir
$log = Join-Path $logDir ("bissell-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

Write-Host "BISSELL runner starting. Cutoff: $cutoff`nLogging to: $log" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop early.`n"

while ((Get-Date) -lt $cutoff) {
  Write-Host ("[Start] " + (Get-Date)) -ForegroundColor Green
  # Run your bot once; if it crashes/exits, loop and restart after 5s
  try {
    npm run start 2>&1 | Tee-Object -FilePath $log -Append
  } catch {
    $_ | Out-String | Tee-Object -FilePath $log -Append | Out-Host
  }
  if ((Get-Date) -ge $cutoff) { break }
  Write-Host ("[Exit] " + (Get-Date) + " - restarting in 5s...") -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

Write-Host ("Cutoff reached @ " + (Get-Date) + ". Exiting.") -ForegroundColor Cyan
