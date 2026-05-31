Set shell = CreateObject("Wscript.Shell")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & root & "\scripts\start-app.ps1"""
shell.Run cmd, 0, False
