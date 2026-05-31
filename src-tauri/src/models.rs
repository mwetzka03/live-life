use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalDavConfigDto {
  pub server_url: String,
  pub username: String,
  pub password: String,
  pub calendar_href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalDavCalendarDto {
  pub href: String,
  pub name: String,
  pub color: Option<String>,
  #[serde(default = "default_calendar_kind")]
  pub calendar_kind: String,
  #[serde(default)]
  pub supports_vevent: bool,
  #[serde(default)]
  pub supports_vtodo: bool,
}

fn default_calendar_kind() -> String {
  "events".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncedEventDto {
  pub uid: String,
  pub href: String,
  pub title: String,
  pub description: Option<String>,
  #[serde(default)]
  pub date: Option<String>,
  pub start_time: Option<String>,
  pub end_time: Option<String>,
  #[serde(default)]
  pub is_recurring: bool,
  pub recurrence: Option<String>,
  pub weekly_days: Option<Vec<u8>>,
  #[serde(default)]
  pub is_reminder: bool,
}
