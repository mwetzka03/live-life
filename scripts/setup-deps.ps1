# Installs / verifies dependencies for Live Life (Node, Python + Apple Reminders libs).
param(
  [switch]$SkipWinget,
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  if (-not $Quiet) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
}

function Test-Command([string]$Name) {
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-WingetInstall([string]$Id, [string]$Label) {
  if ($SkipWinget -or -not (Test-Command winget)) {
    throw "$Label fehlt. Bitte manuell installieren (winget nicht verfügbar oder -SkipWinget)."
  }
  Write-Step "$Label wird installiert (winget) …"
  winget install --id $Id -e --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Ensure-Node {
  if (Test-Command npm) { return }
  Invoke-WingetInstall "OpenJS.NodeJS.LTS" "Node.js LTS"
  if (-not (Test-Command npm)) {
    throw "Node.js/npm nach Installation nicht im PATH. Terminal neu öffnen und erneut starten."
  }
}

function Ensure-Rust {
  if (Test-Command cargo) { return }
  if ($SkipWinget -or -not (Test-Command winget)) {
    throw @"
Rust (cargo) fehlt – wird für den Desktop-Build aus dem Quellcode benötigt.
Optionen:
  1) winget install Rustlang.Rustup  (danach Terminal neu öffnen)
  2) Release-Installer von GitHub laden (kein Rust nötig):
     https://github.com/mwetzka03/live-life/releases
"@
  }
  Write-Step "Rust wird installiert (winget, kann einige Minuten dauern) …"
  winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (Test-Command cargo)) {
    throw "Rust nach Installation nicht im PATH. Terminal neu öffnen und erneut starten."
  }
}

Write-Step "Live Life – Abhängigkeiten prüfen"
Ensure-Node
& (Join-Path $PSScriptRoot "install-reminders-deps.ps1") @PSBoundParameters

Set-Location (Join-Path $PSScriptRoot "..")
Write-Step "npm install …"
npm install

Write-Step "Abhängigkeiten bereit"
Ensure-Rust
