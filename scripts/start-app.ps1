# Starts Live Life: uses release binary if present, otherwise builds/launches via Tauri.
param(
  [switch]$SkipWinget,
  [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseExe = Join-Path $Root "release\LiveLife.exe"

Write-Host ""
Write-Host "  Live Life" -ForegroundColor Magenta
Write-Host "  ─────────────────────────────" -ForegroundColor DarkGray

if ((Test-Path $releaseExe) -and -not $BuildOnly) {
  Write-Host "`n==> Starte Live Life …" -ForegroundColor Green
  Start-Process -FilePath $releaseExe -WorkingDirectory $Root
  exit 0
}

& (Join-Path $PSScriptRoot "setup-deps.ps1") @PSBoundParameters

Set-Location $Root
& (Join-Path $PSScriptRoot "sync-app-icon.ps1")

$builtExe = Get-ChildItem -Path (Join-Path $Root "src-tauri\target\release\*.exe") -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notmatch 'wix|nsis|bundle' } |
  Select-Object -First 1

if ($BuildOnly) {
  Write-Host "`n==> Release-Build …" -ForegroundColor Cyan
  npm run build:win
  Write-Host "`nFertig. Installer: src-tauri\target\release\bundle\nsis\" -ForegroundColor Green
  exit 0
}

if (Test-Path $releaseExe) {
  Write-Host "`n==> Starte Live Life …" -ForegroundColor Green
  Start-Process -FilePath $releaseExe -WorkingDirectory $Root
  exit 0
}

if ($builtExe) {
  Write-Host "`n==> Starte Live Life …" -ForegroundColor Green
  Start-Process -FilePath $builtExe.FullName -WorkingDirectory $Root
  exit 0
}

Write-Host "`n==> Erster Start: Desktop-App wird gebaut (5–15 Min.) …" -ForegroundColor Yellow
npm run build:win

if (Test-Path $releaseExe) {
  Write-Host "`n==> Starte Live Life …" -ForegroundColor Green
  Start-Process -FilePath $releaseExe -WorkingDirectory $Root
} else {
  Write-Host "`nBuild abgeschlossen. EXE prüfen unter release\ oder src-tauri\target\release\" -ForegroundColor Yellow
}
