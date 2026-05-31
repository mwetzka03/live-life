$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm ist nicht installiert."
}

npm install
powershell -ExecutionPolicy Bypass -File scripts/sync-app-icon.ps1
npm run build
npm run tauri build

New-Item -ItemType Directory -Force -Path release | Out-Null
$exe = Get-ChildItem -Path "src-tauri\target\release\*.exe" | Select-Object -First 1
if ($exe) {
  Copy-Item $exe.FullName "release\LiveLife.exe" -Force
  Write-Host "Fertig: release\LiveLife.exe"
} else {
  Write-Host "Build abgeschlossen - pruefe src-tauri\target\release\"
}
