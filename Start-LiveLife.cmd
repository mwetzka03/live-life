@echo off
title Live Life – Setup & Start
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1"
if errorlevel 1 (
  echo.
  echo Fehler beim Start. Siehe Meldung oben.
  pause
)
