use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};

use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

static SCRIPTS_DIR: OnceLock<PathBuf> = OnceLock::new();
static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();
static SETUP_ONCE: Mutex<Option<bool>> = Mutex::new(None);

const EMBEDDED_BRIDGE: &str =
  include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../scripts/apple_reminders_bridge.py"));
const EMBEDDED_INSTALL: &str =
  include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../scripts/install-reminders-deps.ps1"));
const EMBEDDED_REQUIREMENTS: &str =
  include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../scripts/requirements-reminders.txt"));
const EMBEDDED_VERSION: &str = env!("CARGO_PKG_VERSION");

pub fn set_app_handle(handle: AppHandle) {
  let _ = APP_HANDLE.set(handle);
}

pub fn init_scripts_dir(dir: PathBuf) {
  if has_bridge(&dir) {
    let _ = SCRIPTS_DIR.set(dir);
  }
}

fn has_bridge(dir: &Path) -> bool {
  dir.join("apple_reminders_bridge.py").is_file()
}

fn candidates_from(base: &Path) -> [PathBuf; 8] {
  [
    base.join("resources").join("scripts"),
    base.join("scripts"),
    base.join("_up_").join("resources").join("scripts"),
    base.join("_up_").join("scripts"),
    base.join("resources"),
    base.join("_up_").join("resources"),
    base.join("..").join("resources").join("scripts"),
    base.join("..").join("scripts"),
  ]
}

fn first_with_bridge(candidates: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
  candidates.into_iter().find(|dir| has_bridge(dir))
}

fn resolve_from_app_handle() -> Option<PathBuf> {
  let app = APP_HANDLE.get()?;

  if let Ok(script) = app
    .path()
    .resolve("scripts/apple_reminders_bridge.py", BaseDirectory::Resource)
  {
    if script.is_file() {
      return script.parent().map(|p| p.to_path_buf());
    }
  }

  if let Ok(resource_dir) = app.path().resource_dir() {
    if let Some(dir) = first_with_bridge(candidates_from(&resource_dir)) {
      return Some(dir);
    }
    if let Some(parent) = resource_dir.parent() {
      if let Some(dir) = first_with_bridge(candidates_from(parent)) {
        return Some(dir);
      }
    }
  }

  None
}

fn discover_scripts_dir() -> Option<PathBuf> {
  let exe = std::env::current_exe().ok()?;
  let mut dir = exe.parent()?.to_path_buf();

  for _ in 0..10 {
    if let Some(found) = first_with_bridge(candidates_from(&dir)) {
      return Some(found);
    }
    if !dir.pop() {
      break;
    }
  }

  None
}

fn extract_embedded_scripts() -> Option<PathBuf> {
  let base = dirs::data_local_dir()?.join("live-life").join("bridge-scripts");
  let version_file = base.join(".version");
  let bridge = base.join("apple_reminders_bridge.py");
  let install = base.join("install-reminders-deps.ps1");
  let requirements = base.join("requirements-reminders.txt");

  let version_ok = std::fs::read_to_string(&version_file)
    .map(|v| v.trim() == EMBEDDED_VERSION)
    .unwrap_or(false);

  if version_ok && bridge.is_file() && install.is_file() {
    return Some(base);
  }

  std::fs::create_dir_all(&base).ok()?;
  std::fs::write(&bridge, EMBEDDED_BRIDGE).ok()?;
  std::fs::write(&install, EMBEDDED_INSTALL).ok()?;
  std::fs::write(&requirements, EMBEDDED_REQUIREMENTS).ok()?;
  let _ = std::fs::write(&version_file, EMBEDDED_VERSION);

  if bridge.is_file() {
    Some(base)
  } else {
    None
  }
}

fn resolve_scripts_dir() -> Option<PathBuf> {
  resolve_from_app_handle()
    .or_else(discover_scripts_dir)
    .or_else(extract_embedded_scripts)
}

fn ensure_scripts_dir_cached() -> PathBuf {
  if let Some(dir) = SCRIPTS_DIR.get() {
    if has_bridge(dir) {
      return dir.clone();
    }
  }
  if let Some(dir) = resolve_scripts_dir() {
    let _ = SCRIPTS_DIR.set(dir.clone());
    return dir;
  }

  #[cfg(debug_assertions)]
  {
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts");
    if has_bridge(&dev) {
      let _ = SCRIPTS_DIR.set(dev.clone());
      return dev;
    }
  }

  extract_embedded_scripts().unwrap_or_else(|| PathBuf::from("scripts"))
}

pub fn scripts_dir() -> PathBuf {
  ensure_scripts_dir_cached()
}

pub fn bridge_script_path() -> PathBuf {
  scripts_dir().join("apple_reminders_bridge.py")
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
  let dir = ensure_scripts_dir_cached();
  if !has_bridge(&dir) {
    let exe = std::env::current_exe()
      .map(|p| p.display().to_string())
      .unwrap_or_else(|_| "?".into());
    return Err(format!(
      "Bridge-Skript nicht gefunden unter {}. App-Pfad: {exe}.",
      dir.display()
    ));
  }

  if pyicloud_ready() {
    return Ok(format!(
      "Apple Reminders Python-Runtime bereit (Skripte: {}).",
      dir.display()
    ));
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
  if !script.is_file() {
    let exe = std::env::current_exe()
      .map(|p| p.display().to_string())
      .unwrap_or_else(|_| "?".into());
    return Err(format!(
      "Setup-Skript nicht gefunden: {}. App-Pfad: {exe}.",
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
