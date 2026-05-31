# Silent setup: Python 3 + pyicloud + tzlocal for Apple Reminders (Beta).
param(
  [switch]$Silent
)

$ErrorActionPreference = "Stop"
$LogDir = Join-Path $env:LOCALAPPDATA "live-life"
$LogFile = Join-Path $LogDir "reminders-setup.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Log([string]$Message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  if (-not $Silent) { Write-Host $Message }
}

function Refresh-PathEnv {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Find-Python {
  Refresh-PathEnv
  $candidates = @(
    "python",
    "python3",
    @{ Exe = "py"; Args = @("-3") }
  )
  foreach ($c in $candidates) {
    if ($c -is [hashtable]) {
      $cmd = Get-Command $c.Exe -ErrorAction SilentlyContinue
      if ($cmd) { return @{ Exe = $c.Exe; Args = $c.Args } }
    } else {
      $cmd = Get-Command $c -ErrorAction SilentlyContinue
      if ($cmd) { return @{ Exe = $c; Args = @() } }
    }
  }
  $known = @(
    "$env:LocalAppData\Programs\Python\Python312\python.exe",
    "$env:LocalAppData\Programs\Python\Python313\python.exe",
    "$env:ProgramFiles\Python312\python.exe",
    "$env:ProgramFiles\Python313\python.exe"
  )
  foreach ($p in $known) {
    if (Test-Path $p) { return @{ Exe = $p; Args = @() } }
  }
  return $null
}

function Test-Pyicloud([hashtable]$Py) {
  $args = @($Py.Args + @("-c", "import pyicloud, tzlocal"))
  & $Py.Exe @args 2>$null
  return $LASTEXITCODE -eq 0
}

function Install-Python {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "winget nicht verfügbar – Python kann nicht automatisch installiert werden."
  }
  Log "Installiere Python 3.12 (winget, silent) …"
  winget install --id Python.Python.3.12 -e --silent `
    --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
  Refresh-PathEnv
  Start-Sleep -Seconds 2
}

function Install-PipPackages([hashtable]$Py) {
  $req = Join-Path $PSScriptRoot "requirements-reminders.txt"
  Log "Installiere pyicloud + tzlocal …"
  $pipArgs = @($Py.Args + @("-m", "pip", "install", "--upgrade", "pip", "-q"))
  & $Py.Exe @pipArgs 2>&1 | Out-Null
  $pipArgs = @($Py.Args + @("-m", "pip", "install", "-r", $req, "-q"))
  & $Py.Exe @pipArgs 2>&1 | Out-Null
  if (-not (Test-Pyicloud $Py)) {
    throw "pyicloud/tzlocal nach pip install nicht verfügbar."
  }
  Log "Apple Reminders Python-Runtime bereit."
}

try {
  Log "=== Apple Reminders Setup ==="
  $py = Find-Python
  if (-not $py) {
    Install-Python
    $py = Find-Python
    if (-not $py) { throw "Python nach winget-Installation nicht gefunden." }
  }
  if (-not (Test-Pyicloud $py)) {
    Install-PipPackages $py
  } else {
    Log "pyicloud bereits installiert."
  }
  exit 0
} catch {
  Log "FEHLER: $($_.Exception.Message)"
  exit 1
}
