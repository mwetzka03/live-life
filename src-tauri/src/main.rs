#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod caldav;
mod icloud_reminders;
mod models;

use icloud_reminders::{AppleRemindersConfigDto, AppleRemindersListDto, AppleRemindersListFetchDto, init_scripts_dir};
use models::{CalDavCalendarDto, CalDavConfigDto, SyncedEventDto};
use tauri::Manager;
use tauri::image::Image;
use tauri::path::BaseDirectory;

#[tauri::command]
fn caldav_discover_calendars(config: CalDavConfigDto) -> Result<Vec<CalDavCalendarDto>, String> {
  caldav::discover_calendars(&config)
}

#[tauri::command]
fn caldav_test_connection(config: CalDavConfigDto) -> Result<String, String> {
  caldav::test_connection(&config)
}

#[tauri::command]
fn caldav_fetch_events(
  config: CalDavConfigDto,
  start: String,
  end: String,
) -> Result<Vec<SyncedEventDto>, String> {
  caldav::fetch_events(&config, &start, &end)
}

#[tauri::command]
fn caldav_fetch_reminders(
  config: CalDavConfigDto,
  start: String,
  end: String,
) -> Result<Vec<SyncedEventDto>, String> {
  caldav::fetch_reminders(&config, &start, &end)
}

#[tauri::command]
fn apple_reminders_test_connection(config: AppleRemindersConfigDto) -> Result<String, String> {
  icloud_reminders::test_connection(&config)
}

#[tauri::command]
fn apple_reminders_discover_lists(
  config: AppleRemindersConfigDto,
) -> Result<Vec<AppleRemindersListDto>, String> {
  icloud_reminders::discover_lists(&config)
}

#[tauri::command]
fn apple_reminders_fetch(
  config: AppleRemindersConfigDto,
  start: String,
  end: String,
) -> Result<icloud_reminders::AppleRemindersFetchResultDto, String> {
  icloud_reminders::fetch_reminders(&config, &start, &end)
}

#[tauri::command]
fn apple_reminders_fetch_all(
  config: AppleRemindersConfigDto,
  start: String,
  end: String,
  listGuids: Vec<String>,
) -> Result<Vec<AppleRemindersListFetchDto>, String> {
  let guids_json = serde_json::to_string(&listGuids).map_err(|e| e.to_string())?;
  icloud_reminders::fetch_all_reminders(&config, &start, &end, &guids_json)
}

#[tauri::command]
fn apple_reminders_complete(config: AppleRemindersConfigDto) -> Result<String, String> {
  icloud_reminders::complete_reminder(&config)
}

#[tauri::command]
fn apple_reminders_set_status(config: AppleRemindersConfigDto) -> Result<String, String> {
  icloud_reminders::set_reminder_status(&config)
}

#[tauri::command]
fn apple_reminders_create(config: AppleRemindersConfigDto) -> Result<icloud_reminders::CreatedReminderDto, String> {
  icloud_reminders::create_reminder(&config)
}

#[tauri::command]
fn apple_reminders_delete(config: AppleRemindersConfigDto) -> Result<String, String> {
  icloud_reminders::delete_reminder(&config)
}

#[tauri::command]
fn apple_reminders_ensure_runtime() -> Result<String, String> {
  icloud_reminders::ensure_reminders_runtime()
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      if let Ok(script) = app
        .path()
        .resolve("scripts/apple_reminders_bridge.py", BaseDirectory::Resource)
      {
        if let Some(parent) = script.parent() {
          init_scripts_dir(parent.to_path_buf());
        }
      } else if let Ok(resource_dir) = app.path().resource_dir() {
        let scripts = resource_dir.join("scripts");
        if scripts.join("apple_reminders_bridge.py").is_file() {
          init_scripts_dir(scripts);
        }
      }

      let icon = Image::from_bytes(include_bytes!("../icons/128x128@2x.png"))
        .expect("App-Icon konnte nicht geladen werden");
      if let Some(window) = app.get_webview_window("main") {
        window.set_icon(icon).expect("Fenster-Icon konnte nicht gesetzt werden");
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      caldav_discover_calendars,
      caldav_test_connection,
      caldav_fetch_events,
      caldav_fetch_reminders,
      apple_reminders_test_connection,
      apple_reminders_discover_lists,
      apple_reminders_fetch,
      apple_reminders_fetch_all,
      apple_reminders_complete,
      apple_reminders_set_status,
      apple_reminders_create,
      apple_reminders_delete,
      apple_reminders_ensure_runtime,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
