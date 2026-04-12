[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('launch', 'restart', 'stop', 'status', 'logs', 'migrate', 'seed', 'reset')]
  [string]$Action = 'launch',

  [switch]$Seed,

  [switch]$NoBuild,

  [string]$LogFilePath
)

$ErrorActionPreference = 'Stop'

$script:RepoRoot = Split-Path -Parent $PSScriptRoot
$script:ComposeArgs = @('compose')
$script:LogsDirectory = Join-Path $script:RepoRoot 'logs'
$script:TranscriptStarted = $false

function Initialize-Logging {
  if (-not (Test-Path $script:LogsDirectory)) {
    New-Item -ItemType Directory -Path $script:LogsDirectory | Out-Null
  }

  if ([string]::IsNullOrWhiteSpace($LogFilePath)) {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $scriptName = "local-platform-$Action-$timestamp.log"
    $LogFilePath = Join-Path $script:LogsDirectory $scriptName
  }

  Start-Transcript -Path $LogFilePath -Force | Out-Null
  $script:TranscriptStarted = $true

  Write-Host "Log file : $LogFilePath" -ForegroundColor DarkYellow
}

function Complete-Logging {
  if ($script:TranscriptStarted) {
    Stop-Transcript | Out-Null
    $script:TranscriptStarted = $false
  }
}

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Docker {
  if (-not (Test-CommandExists 'docker')) {
    throw 'Docker CLI was not found in PATH. Install Docker Desktop or Docker Engine with Compose v2.'
  }
}

function Ensure-EnvFile {
  $envFile = Join-Path $script:RepoRoot '.env'
  $exampleFile = Join-Path $script:RepoRoot '.env.example'

  if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $exampleFile)) {
      throw '.env is missing and .env.example was not found.'
    }

    Copy-Item $exampleFile $envFile
    Write-Host 'Created .env from .env.example.' -ForegroundColor Yellow
  }
}

function Invoke-Compose {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Push-Location $script:RepoRoot
  try {
    & docker @script:ComposeArgs @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "docker compose $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }
}

function Show-Endpoints {
  $envFile = Join-Path $script:RepoRoot '.env'
  $envMap = @{}

  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') {
      return
    }

    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
      $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
  }

  $backendPort = if ($envMap.ContainsKey('BACKEND_PORT')) { $envMap['BACKEND_PORT'] } else { '3000' }
  $frontendPort = if ($envMap.ContainsKey('FRONTEND_PORT')) { $envMap['FRONTEND_PORT'] } else { '5173' }
  $apiPrefix = if ($envMap.ContainsKey('API_PREFIX')) { $envMap['API_PREFIX'] } else { 'api' }

  Write-Host ''
  Write-Host 'Frontend : ' -NoNewline
  Write-Host "http://localhost:$frontendPort" -ForegroundColor Green
  Write-Host 'Health   : ' -NoNewline
  Write-Host "http://localhost:$backendPort/$apiPrefix/health" -ForegroundColor Green
  Write-Host 'Readiness: ' -NoNewline
  Write-Host "http://localhost:$backendPort/$apiPrefix/readiness" -ForegroundColor Green
}

function Start-Platform {
  Ensure-Docker
  Ensure-EnvFile

  if (-not $NoBuild) {
    Write-Step 'Building Docker images'
    Invoke-Compose -Arguments @('build')
  }

  Write-Step 'Starting PostgreSQL'
  Invoke-Compose -Arguments @('up', '-d', 'postgres')

  Write-Step 'Applying Prisma migrations in Docker'
  Invoke-Compose -Arguments @('run', '--rm', 'migrate')

  if ($Seed) {
    Write-Step 'Seeding demo data in Docker'
    Invoke-Compose -Arguments @('--profile', 'tools', 'run', '--rm', 'seed')
  }

  Write-Step 'Starting backend and frontend'
  Invoke-Compose -Arguments @('up', '-d', 'backend', 'frontend')

  Write-Step 'Container status'
  Invoke-Compose -Arguments @('ps')
  Show-Endpoints
}

try {
  Initialize-Logging

  switch ($Action) {
    'launch' {
      Start-Platform
    }
    'restart' {
      Ensure-Docker
      Ensure-EnvFile
      Write-Step 'Stopping existing stack'
      Invoke-Compose -Arguments @('down')
      Start-Platform
    }
    'stop' {
      Ensure-Docker
      Ensure-EnvFile
      Write-Step 'Stopping containers'
      Invoke-Compose -Arguments @('down')
    }
    'status' {
      Ensure-Docker
      Ensure-EnvFile
      Invoke-Compose -Arguments @('ps')
      Show-Endpoints
    }
    'logs' {
      Ensure-Docker
      Ensure-EnvFile
      Invoke-Compose -Arguments @('logs', '-f', 'postgres', 'backend', 'frontend')
    }
    'migrate' {
      Ensure-Docker
      Ensure-EnvFile
      Write-Step 'Running migrations'
      Invoke-Compose -Arguments @('run', '--rm', 'migrate')
    }
    'seed' {
      Ensure-Docker
      Ensure-EnvFile
      Write-Step 'Running seed job'
      Invoke-Compose -Arguments @('--profile', 'tools', 'run', '--rm', 'seed')
    }
    'reset' {
      Ensure-Docker
      Ensure-EnvFile
      Write-Step 'Removing containers and volumes'
      Invoke-Compose -Arguments @('down', '-v', '--remove-orphans')
    }
  }
}
catch {
  Write-Host '' 
  Write-Host 'Platform command failed.' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if (-not [string]::IsNullOrWhiteSpace($LogFilePath)) {
    Write-Host "Saved log: $LogFilePath" -ForegroundColor Yellow
  }
  exit 1
}
finally {
  Complete-Logging
}
