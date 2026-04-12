$scriptPath = Join-Path $PSScriptRoot 'local-platform.ps1'
$logsDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'logs'
if (-not (Test-Path $logsDirectory)) {
  New-Item -ItemType Directory -Path $logsDirectory | Out-Null
}
$logFile = Join-Path $logsDirectory ("local-launch-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

& powershell -ExecutionPolicy Bypass -File $scriptPath launch -Seed -LogFilePath $logFile
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Host ''
  Write-Host 'Launch failed.' -ForegroundColor Red
  Write-Host "Saved log: $logFile" -ForegroundColor Yellow
  Read-Host 'Press Enter to close'
}

exit $exitCode
