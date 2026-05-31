; Run after NSIS install – silent Python + pyicloud for Apple Reminders (Beta).
!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Live Life: Apple Reminders Abhängigkeiten (Python) …"
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\scripts\install-reminders-deps.ps1" -Silent'
!macroend
