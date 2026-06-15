; Run after NSIS install – silent Python + pyicloud for Apple Reminders (Beta).
!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Live Life: Apple Reminders Abhängigkeiten (Python) …"
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\scripts\install-reminders-deps.ps1" -Silent'
  IfFileExists "$INSTDIR\scripts\install-reminders-deps.ps1" 0 +2
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\scripts\install-reminders-deps.ps1" -Silent'
!macroend
