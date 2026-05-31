$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm ist nicht installiert."
}

npm install
powershell -ExecutionPolicy Bypass -File scripts/sync-app-icon.ps1
npm run tauri dev
