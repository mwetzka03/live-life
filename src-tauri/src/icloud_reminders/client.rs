use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

use serde::Deserialize;

use crate::models::SyncedEventDto;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppleRemindersConfigDto {
  pub apple_id: String,
  pub password: String,
  #[serde(default)]
  pub two_factor_code: Option<String>,
  #[allow(dead_code)]
  #[serde(default)]
  pub account_id: String,
  #[serde(default)]
  pub list_guid: Option<String>,
  #[serde(default)]
  pub start: Option<String>,
  #[serde(default)]
  pub end: Option<String>,
  #[serde(default)]
  pub reminder_href: Option<String>,
  #[serde(default)]
  pub list_guids: Option<String>,
  #[serde(default)]
  pub completed: Option<String>,
  #[serde(default)]
  pub title: Option<String>,
  #[serde(default)]
  pub description: Option<String>,
  #[serde(default)]
  pub due_date: Option<String>,
  #[serde(default)]
  pub due_time: Option<String>,
  #[serde(default)]
  pub subtasks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppleRemindersListDto {
  pub guid: String,
  pub name: String,
}

fn bridge_script_path() -> PathBuf {
  crate::icloud_reminders::runtime::bridge_script_path()
}

fn cookie_dir(apple_id: &str) -> Result<PathBuf, String> {
  let base = dirs::data_local_dir().ok_or_else(|| "App-Datenverzeichnis nicht gefunden.".to_string())?;
  let root = base.join("live-life").join("icloud-reminders");
  let slug: String = apple_id
    .trim()
    .to_lowercase()
    .chars()
    .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
    .collect();
  let target = root.join(&slug);

  if !target.exists() {
    let legacy_draft = root.join(format!("draft-{slug}"));
    if legacy_draft.exists() {
      std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
      std::fs::rename(&legacy_draft, &target).map_err(|e| {
        format!(
          "Session konnte nicht migriert werden ({} → {}): {e}",
          legacy_draft.display(),
          target.display()
        )
      })?;
    }
  }

  Ok(target)
}

fn find_python_with_pyicloud() -> Result<String, String> {
  let candidates: [(&str, &[&str]); 4] = [
    ("python", &[]),
    ("python3", &[]),
    ("py", &["-3"]),
    ("py", &[]),
  ];

  for (exe, prefix) in candidates {
    let mut check = Command::new(exe);
    for arg in prefix {
      check.arg(arg);
    }
    let ok = check
      .args(["-c", "import pyicloud, tzlocal"])
      .output()
      .map(|o| o.status.success())
      .unwrap_or(false);
    if ok {
      return Ok(if prefix.is_empty() {
        exe.to_string()
      } else {
        format!("{} {}", exe, prefix.join(" "))
      });
    }
  }

  Err("Python 3 mit pyicloud/tzlocal nicht gefunden.".into())
}

fn python_executable() -> Result<String, String> {
  if let Ok(p) = find_python_with_pyicloud() {
    return Ok(p);
  }
  crate::icloud_reminders::runtime::ensure_reminders_runtime()?;
  find_python_with_pyicloud().map_err(|_| {
    "Python/pyicloud nach automatischem Setup nicht verfügbar. Log: %LOCALAPPDATA%\\live-life\\reminders-setup.log"
      .into()
  })
}

fn run_python(
  python: &str,
  script: &PathBuf,
  command: &str,
  config: &AppleRemindersConfigDto,
  cookie: &PathBuf,
) -> Result<std::process::Output, String> {
  let parts: Vec<&str> = python.split_whitespace().collect();
  let (exe, prefix): (&str, &[&str]) = if parts.is_empty() {
    ("python", &[])
  } else if parts.len() == 1 {
    (parts[0], &[])
  } else {
    (parts[0], &parts[1..])
  };

  let mut cmd = Command::new(exe);
  for arg in prefix {
    cmd.arg(arg);
  }
  cmd.arg(script);
  cmd.arg(command);
  cmd.arg("--apple-id").arg(&config.apple_id);
  cmd.arg("--password").arg(&config.password);
  cmd.arg("--cookie-dir").arg(cookie);
  if let Some(code) = &config.two_factor_code {
    if !code.trim().is_empty() {
      cmd.arg("--two-factor-code").arg(code.trim());
    }
  }
  if let Some(guid) = &config.list_guid {
    cmd.arg("--list-guid").arg(guid);
  }
  if let Some(start) = &config.start {
    cmd.arg("--start").arg(start);
  }
  if let Some(end) = &config.end {
    cmd.arg("--end").arg(end);
  }
  if let Some(href) = &config.reminder_href {
    cmd.arg("--reminder-href").arg(href);
  }
  if let Some(guids) = &config.list_guids {
    cmd.arg("--list-guids").arg(guids);
  }
  if let Some(completed) = &config.completed {
    cmd.arg("--completed").arg(completed);
  }
  if let Some(title) = &config.title {
    if !title.trim().is_empty() {
      cmd.arg("--title").arg(title);
    }
  }
  if let Some(description) = &config.description {
    if !description.trim().is_empty() {
      cmd.arg("--description").arg(description);
    }
  }
  if let Some(due_date) = &config.due_date {
    if !due_date.trim().is_empty() {
      cmd.arg("--due-date").arg(due_date);
    }
  }
  if let Some(due_time) = &config.due_time {
    if !due_time.trim().is_empty() {
      cmd.arg("--due-time").arg(due_time);
    }
  }
  if let Some(subtasks) = &config.subtasks {
    if !subtasks.trim().is_empty() {
      cmd.arg("--subtasks").arg(subtasks);
    }
  }

  cmd.env("PYTHONIOENCODING", "utf-8");
  cmd.env("PYTHONUTF8", "1");

  cmd.output().map_err(|e| format!("Python-Aufruf fehlgeschlagen: {e}"))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeResponse {
  ok: Option<bool>,
  code: Option<String>,
  error: Option<String>,
  message: Option<String>,
  lists: Option<Vec<AppleRemindersListDto>>,
  reminders: Option<Vec<SyncedEventDto>>,
  #[serde(default)]
  completion_by_href: Option<HashMap<String, bool>>,
  list_results: Option<Vec<AppleRemindersListFetchDto>>,
  reminder: Option<CreatedReminderDto>,
  #[serde(default)]
  subtask_hrefs: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedReminderDto {
  pub uid: String,
  pub href: String,
  pub title: String,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedReminderGroupDto {
  pub uid: String,
  pub href: String,
  pub title: String,
  #[serde(default)]
  pub subtask_hrefs: HashMap<String, String>,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppleRemindersFetchResultDto {
  pub reminders: Vec<SyncedEventDto>,
  #[serde(default)]
  pub completion_by_href: HashMap<String, bool>,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppleRemindersListFetchDto {
  pub list_guid: String,
  pub reminders: Option<Vec<SyncedEventDto>>,
  #[serde(default)]
  pub completion_by_href: Option<HashMap<String, bool>>,
  pub error: Option<String>,
}

fn run_bridge(command: &str, config: &AppleRemindersConfigDto) -> Result<BridgeResponse, String> {
  let script = bridge_script_path();
  if !script.is_file() {
    return Err(format!(
      "Bridge-Skript nicht gefunden: {}. Bitte App neu installieren (Release mit gebündelten Skripten).",
      script.display()
    ));
  }

  let cookie = cookie_dir(&config.apple_id)?;
  std::fs::create_dir_all(&cookie).map_err(|e| e.to_string())?;

  let python = python_executable()?;

  let output = run_python(&python, &script, command, config, &cookie)?;
  let stdout = String::from_utf8(output.stdout).map_err(|e| {
    format!(
      "Bridge-Antwort ist kein gültiges UTF-8: {e}. stderr: {}",
      snippet(&String::from_utf8_lossy(&output.stderr))
    )
  })?;
  let stdout = stdout.trim().to_string();
  let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

  if stdout.is_empty() {
    return Err(if stderr.is_empty() {
      "Keine Antwort vom Apple-Reminders-Bridge.".into()
    } else {
      format!("Bridge-Fehler: {}", snippet(&stderr))
    });
  }

  let parsed: BridgeResponse = serde_json::from_str(&stdout).map_err(|e| {
    format!("Ungültige Bridge-Antwort: {e}. Ausgabe: {}", snippet(&stdout))
  })?;

  if parsed.ok != Some(true) {
    let code = parsed.code.unwrap_or_else(|| "BRIDGE_ERROR".into());
    let msg = parsed.error.unwrap_or_else(|| "Unbekannter Fehler".into());
    if code == "TWO_FACTOR_REQUIRED" {
      return Err(format!("TWO_FACTOR_REQUIRED:{msg}"));
    }
    if code == "TWO_FACTOR_PENDING" {
      return Err(format!("TWO_FACTOR_PENDING:{msg}"));
    }
    return Err(msg);
  }

  if !stderr.is_empty() {
    eprintln!("apple_reminders_bridge stderr: {stderr}");
  }

  Ok(parsed)
}

pub fn test_connection(config: &AppleRemindersConfigDto) -> Result<String, String> {
  let resp = run_bridge("test", config)?;
  Ok(resp.message.unwrap_or_else(|| "Verbindung OK.".into()))
}

pub fn discover_lists(config: &AppleRemindersConfigDto) -> Result<Vec<AppleRemindersListDto>, String> {
  let resp = run_bridge("discover", config)?;
  Ok(resp.lists.unwrap_or_default())
}

pub fn fetch_reminders(
  config: &AppleRemindersConfigDto,
  start: &str,
  end: &str,
) -> Result<AppleRemindersFetchResultDto, String> {
  let mut cfg = config.clone();
  cfg.start = Some(start.to_string());
  cfg.end = Some(end.to_string());
  let resp = run_bridge("fetch", &cfg)?;
  let reminders = resp
    .reminders
    .unwrap_or_default()
    .into_iter()
    .map(|mut r| {
      r.is_reminder = true;
      r
    })
    .collect();
  Ok(AppleRemindersFetchResultDto {
    reminders,
    completion_by_href: resp.completion_by_href.unwrap_or_default(),
  })
}

pub fn fetch_all_reminders(
  config: &AppleRemindersConfigDto,
  start: &str,
  end: &str,
  list_guids_json: &str,
) -> Result<Vec<AppleRemindersListFetchDto>, String> {
  let mut cfg = config.clone();
  cfg.start = Some(start.to_string());
  cfg.end = Some(end.to_string());
  cfg.list_guids = Some(list_guids_json.to_string());
  let resp = run_bridge("fetch-all", &cfg)?;
  Ok(resp
    .list_results
    .unwrap_or_default()
    .into_iter()
    .map(|mut item| {
      if let Some(reminders) = item.reminders.as_mut() {
        for r in reminders.iter_mut() {
          r.is_reminder = true;
        }
      }
      item
    })
    .collect())
}

pub fn complete_reminder(config: &AppleRemindersConfigDto) -> Result<String, String> {
  let mut cfg = config.clone();
  cfg.completed = Some("true".into());
  set_reminder_status(&cfg)
}

pub fn set_reminder_status(config: &AppleRemindersConfigDto) -> Result<String, String> {
  let resp = run_bridge("set-reminder-status", config)?;
  Ok(resp.message.unwrap_or_else(|| "Erinnerungsstatus aktualisiert.".into()))
}

pub fn create_reminder(config: &AppleRemindersConfigDto) -> Result<CreatedReminderDto, String> {
  let resp = run_bridge("create-reminder", config)?;
  resp.reminder
    .ok_or_else(|| "Bridge lieferte keine Erinnerung zurück.".to_string())
}

pub fn create_reminder_group(config: &AppleRemindersConfigDto) -> Result<CreatedReminderGroupDto, String> {
  let resp = run_bridge("create-reminder-group", config)?;
  let parent = resp
    .reminder
    .ok_or_else(|| "Bridge lieferte keine Erinnerung zurück.".to_string())?;

  let subtask_hrefs = resp.subtask_hrefs.unwrap_or_default();

  Ok(CreatedReminderGroupDto {
    uid: parent.uid,
    href: parent.href,
    title: parent.title,
    subtask_hrefs,
  })
}

pub fn delete_reminder(config: &AppleRemindersConfigDto) -> Result<String, String> {
  let resp = run_bridge("delete-reminder", config)?;
  Ok(resp.message.unwrap_or_else(|| "Erinnerung in iCloud gelöscht.".into()))
}

fn snippet(body: &str) -> String {
  body.chars().filter(|c| !c.is_control()).take(220).collect()
}
