$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

python (Join-Path $PSScriptRoot "regenerate-app-icon.py")

$source = Join-Path $PWD "app-icon\app-icon.png"
if (-not (Test-Path $source)) {
  throw "App-Icon nicht gefunden: $source"
}

npm run tauri -- icon $source

Write-Host "Tauri-Icons aus app-icon/app-icon.png aktualisiert."
