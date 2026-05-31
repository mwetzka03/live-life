use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;

static SETUP_ONCE: Mutex<Option<bool>> = Mutex::new(None);

pub fn scripts_dir() -> PathBuf {
  if let Some(dir) = bundled_scripts_dir() {
    return dir;
  }
  PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts")
}

fn bundled_scripts_dir() -> Option<PathBuf> {
  let exe = std::env::current_exe().ok()?;
  let parent = exe.parent()?;
  for candidate in [
    parent.join("resources/scripts"),
    parent.join("_up_/resources/scripts"),
    parent.join("resources"),
    parent.join("scripts"),
  ] {
    if candidate.join("apple_reminders_bridge.py").exists() {
      return Some(candidate);
    }
  }
  None
}

pub fn bridge_script_path() -> PathBuf {
  let dir = scripts_dir();
  dir.join("apple_reminders_bridge.py")
}

pub fn install_script_path() -> PathBuf {
  scripts_dir().join("install-reminders-deps.ps1")
}

fn pyicloud_ready() -> bool {
  for (exe, prefix) in [
    ("python", &[] as &[&str]),
    ("python3", &[]),
    ("py", &["-3"][..]),
    ("py", &[]),
  ] {
    let mut cmd = Command::new(exe);
    for arg in prefix {
      cmd.arg(arg);
    }
    let ok = cmd
      .args(["-c", "import pyicloud, tzlocal"])
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);
    if ok {
      return true;
    }
  }
  false
}

#[cfg(windows)]
fn run_hidden_powershell(script: &Path) -> Result<std::process::Output, String> {
  use std::os::windows::process::CommandExt;
  const CREATE_NO_WINDOW: u32 = 0x08000000;

  Command::new("powershell")
    .args([
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-WindowStyle",
      "Hidden",
      "-File",
    ])
    .arg(script)
    .arg("-Silent")
    .creation_flags(CREATE_NO_WINDOW)
    .output()
    .map_err(|e| format!("Reminders-Setup konnte nicht gestartet werden: {e}"))
}

#[cfg(not(windows))]
fn run_hidden_powershell(_script: &Path) -> Result<std::process::Output, String> {
  Err("Apple Reminders Setup ist nur unter Windows verfügbar.".into())
}

pub fn ensure_reminders_runtime() -> Result<String, String> {
  if pyicloud_ready() {
    return Ok("Apple Reminders Python-Runtime bereit.".into());
  }

  let mut guard = SETUP_ONCE.lock().map_err(|e| e.to_string())?;
  if *guard == Some(true) {
    if pyicloud_ready() {
      return Ok("Apple Reminders Python-Runtime bereit.".into());
    }
    return Err(
      "Apple Reminders Setup wurde bereits versucht. Details: %LOCALAPPDATA%\\live-life\\reminders-setup.log"
        .into(),
    );
  }

  let script = install_script_path();
  if !script.exists() {
    return Err(format!(
      "Setup-Skript nicht gefunden: {}. Bitte Release-Installer oder Start-LiveLife.cmd nutzen.",
      script.display()
    ));
  }

  let output = run_hidden_powershell(&script)?;
  *guard = Some(true);

  if pyicloud_ready() {
    return Ok("Apple Reminders Python-Runtime installiert.".into());
  }

  let stderr = String::from_utf8_lossy(&output.stderr);
  let hint = if stderr.trim().is_empty() {
    "Siehe %LOCALAPPDATA%\\live-life\\reminders-setup.log".to_string()
  } else {
    stderr.chars().filter(|c| !c.is_control()).take(180).collect()
  };

  Err(format!(
    "Apple Reminders Setup fehlgeschlagen (Exit {}). {hint}",
    output.status.code().unwrap_or(-1)
  ))
}
