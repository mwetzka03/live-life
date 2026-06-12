mod client;
mod delete;
mod parse;
mod rrule_expand;
mod xml;

pub use client::CalDavClient;

use crate::models::{CalDavCalendarDto, CalDavConfigDto, CalDavDeleteEventDto, SyncedEventDto};

pub fn discover_calendars(config: &CalDavConfigDto) -> Result<Vec<CalDavCalendarDto>, String> {
  let client = CalDavClient::new(&config.server_url, &config.username, &config.password)?;
  client.discover_calendars()
}

pub fn test_connection(config: &CalDavConfigDto) -> Result<String, String> {
  let client = CalDavClient::new(&config.server_url, &config.username, &config.password)?;
  let calendars = client.discover_calendars()?;
  if calendars.is_empty() {
    return Err(
      "Verbindung OK, aber keine Kalender gefunden. Prüfe, ob Kalender in iCloud aktiv sind."
        .into(),
    );
  }
  Ok(format!("Verbindung OK – {} Kalender gefunden.", calendars.len()))
}

pub fn fetch_events(
  config: &CalDavConfigDto,
  start: &str,
  end: &str,
) -> Result<Vec<SyncedEventDto>, String> {
  if config.calendar_href.trim().is_empty() {
    return Err("Kein Kalender ausgewählt.".into());
  }
  let client = CalDavClient::new(&config.server_url, &config.username, &config.password)?;
  let resources = client.fetch_calendar_resources(&config.calendar_href, start, end)?;
  Ok(parse::parse_ics_resources(&resources, start, end))
}

pub fn fetch_reminders(
  config: &CalDavConfigDto,
  start: &str,
  end: &str,
) -> Result<Vec<SyncedEventDto>, String> {
  if config.calendar_href.trim().is_empty() {
    return Err("Kein Kalender ausgewählt.".into());
  }
  let client = CalDavClient::new(&config.server_url, &config.username, &config.password)?;
  let resources = client.fetch_reminder_resources(&config.calendar_href, start, end)?;
  Ok(parse::parse_todo_resources(&resources, start, end))
}

pub fn delete_event(config: &CalDavConfigDto, request: &CalDavDeleteEventDto) -> Result<(), String> {
  if config.calendar_href.trim().is_empty() {
    return Err("Kein Kalender ausgewählt.".into());
  }
  if request.resource_href.trim().is_empty() {
    return Err("Kein Kalender-Eintrag zum Löschen.".into());
  }
  let client = CalDavClient::new(&config.server_url, &config.username, &config.password)?;
  client.delete_calendar_event(
    &request.resource_href,
    request.occurrence_date.as_deref(),
    request.start_time.as_deref(),
    request.is_recurring,
  )
}
