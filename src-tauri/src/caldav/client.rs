use reqwest::blocking::Client;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, HeaderMap, HeaderValue, USER_AGENT};
use reqwest::Method;
use url::Url;

use crate::models::CalDavCalendarDto;
use super::delete::{add_exdate_to_ics, is_recurring_ics};
use super::xml::{extract_calendar_data_blocks, extract_calendar_resources, extract_href_after_marker, parse_calendar_list, CalendarResource};

fn dav_method(name: &'static [u8]) -> Method {
  Method::from_bytes(name).expect("valid method")
}

pub struct CalDavClient {
  http: Client,
  root_url: Url,
  auth_header: String,
}

impl CalDavClient {
  pub fn new(server_url: &str, username: &str, password: &str) -> Result<Self, String> {
    let root_url = Url::parse(server_url.trim()).map_err(|e| format!("Ungültige Server-URL: {e}"))?;
    let http = Client::builder()
      .timeout(std::time::Duration::from_secs(45))
      .redirect(reqwest::redirect::Policy::limited(5))
      .build()
      .map_err(|e| e.to_string())?;

    let credentials = base64_encode(&format!("{username}:{password}"));
    let auth_header = format!("Basic {credentials}");

    Ok(Self {
      http,
      root_url,
      auth_header,
    })
  }

  pub fn discover_calendars(&self) -> Result<Vec<CalDavCalendarDto>, String> {
    let principal = self.discover_principal()?;
    let home = self.discover_calendar_home(&principal)?;
    let home_href = home.to_string();
    self.list_calendars(&home, &home_href)
  }

  pub fn fetch_calendar_data(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
  ) -> Result<Vec<String>, String> {
    let url = resolve_href(&self.root_url, calendar_href)?;
    let start_fmt = to_caldav_datetime(start, false)?;
    let end_fmt = to_caldav_datetime(end, true)?;

    let body = format!(
      r#"<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="{start_fmt}" end="{end_fmt}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>"#
    );

    let response = self
      .propfind_or_report(dav_method(b"REPORT"), &url, "1", &body)?
      .send()
      .map_err(|e| format!("Abruf fehlgeschlagen: {e}"))?;

    let status = response.status().as_u16();
    let text = response.text().map_err(|e| e.to_string())?;
    if !(200..300).contains(&status) && status != 207 {
      return Err(format_http_error("REPORT", status, &text));
    }

    Ok(extract_calendar_data_blocks(&text))
  }

  pub fn fetch_calendar_resources(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
  ) -> Result<Vec<CalendarResource>, String> {
    let text = self.fetch_calendar_report_body(calendar_href, start, end)?;
    Ok(extract_calendar_resources(&text))
  }

  pub fn fetch_reminder_resources(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
  ) -> Result<Vec<CalendarResource>, String> {
    for style in [
      ReminderQueryStyle::CompTimeRange,
      ReminderQueryStyle::PropDueTimeRange,
      ReminderQueryStyle::Unfiltered,
    ] {
      let text = self.fetch_reminder_report_body(calendar_href, start, end, style)?;
      let resources = extract_calendar_resources(&text);
      if !resources.is_empty() {
        return Ok(resources);
      }
    }
    Ok(Vec::new())
  }

  pub fn delete_calendar_event(
    &self,
    resource_href: &str,
    occurrence_date: Option<&str>,
    start_time: Option<&str>,
    is_recurring: bool,
  ) -> Result<(), String> {
    let url = resolve_href(&self.root_url, resource_href)?;

    if is_recurring {
      let Some(date) = occurrence_date else {
        return Err("Datum für Serien-Termin fehlt.".into());
      };
      let (ics, etag) = self.get_resource(&url)?;
      if !is_recurring_ics(&ics) {
        return self.delete_resource(&url);
      }
      let updated = add_exdate_to_ics(&ics, date, start_time)?;
      self.put_resource(&url, &updated, etag.as_deref())
    } else {
      self.delete_resource(&url)
    }
  }

  /// Prüft, ob im Sync-Zeitraum Termine bzw. Erinnerungen (VTODO) vorhanden sind.
  pub fn probe_calendar_content(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
  ) -> Result<(bool, bool), String> {
    let event_blocks = self.fetch_calendar_data(calendar_href, start, end).unwrap_or_default();
    let todo_blocks = self
      .fetch_reminder_query(calendar_href, start, end, ReminderQueryStyle::Unfiltered)
      .unwrap_or_default();
    let has_events = blocks_contain_component(&event_blocks, "BEGIN:VEVENT");
    let has_todos = blocks_contain_component(&todo_blocks, "BEGIN:VTODO");
    Ok((has_events, has_todos))
  }

  fn fetch_reminder_query(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
    style: ReminderQueryStyle,
  ) -> Result<Vec<String>, String> {
    let url = resolve_href(&self.root_url, calendar_href)?;
    let start_fmt = to_caldav_datetime(start, false)?;
    let end_fmt = to_caldav_datetime(end, true)?;

    let filter = match style {
      ReminderQueryStyle::CompTimeRange => format!(
        r#"<C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO">
        <C:time-range start="{start_fmt}" end="{end_fmt}"/>
      </C:comp-filter>
    </C:comp-filter>"#
      ),
      ReminderQueryStyle::PropDueTimeRange => format!(
        r#"<C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO">
        <C:prop-filter name="DUE">
          <C:time-range start="{start_fmt}" end="{end_fmt}"/>
        </C:prop-filter>
      </C:comp-filter>
    </C:comp-filter>"#
      ),
      ReminderQueryStyle::Unfiltered => r#"<C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO"/>
    </C:comp-filter>"#
        .to_string(),
    };

    let body = format!(
      r#"<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    {filter}
  </C:filter>
</C:calendar-query>"#
    );

    let response = self
      .propfind_or_report(dav_method(b"REPORT"), &url, "1", &body)?
      .send()
      .map_err(|e| format!("Abruf fehlgeschlagen: {e}"))?;

    let status = response.status().as_u16();
    let text = response.text().map_err(|e| e.to_string())?;
    if !(200..300).contains(&status) && status != 207 {
      return Err(format_http_error("REPORT", status, &text));
    }

    Ok(extract_calendar_data_blocks(&text))
  }

  fn discover_principal(&self) -> Result<Url, String> {
    let body = r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>"#;

    let text = self.propfind_text(&self.root_url, "0", body)?;
    let href = extract_href_after_marker(&text, "current-user-principal").ok_or_else(|| {
      if text.contains("401") || text.to_ascii_lowercase().contains("unauthorized") {
        "Anmeldung fehlgeschlagen. Für iCloud ein app-spezifisches Passwort verwenden.".into()
      } else {
        format!(
          "Benutzer-Principal nicht gefunden. Server-Antwort: {}",
          snippet(&text)
        )
      }
    })?;
    resolve_href(&self.root_url, &href)
  }

  fn discover_calendar_home(&self, principal: &Url) -> Result<Url, String> {
    let body = r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>"#;

    let text = self.propfind_text(principal, "0", body)?;
    let href = extract_href_after_marker(&text, "calendar-home-set").ok_or_else(|| {
      format!("Kalender-Home nicht gefunden. Antwort: {}", snippet(&text))
    })?;
    resolve_href(principal, &href)
  }

  fn list_calendars(&self, home: &Url, home_href: &str) -> Result<Vec<CalDavCalendarDto>, String> {
    let body = r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/" xmlns:ICAL="http://apple.com/ns/ical/">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
    <C:supported-calendar-component-set/>
    <CS:getctag/>
    <ICAL:calendar-color/>
  </D:prop>
</D:propfind>"#;

    let text = self.propfind_text(home, "1", body)?;
    let parsed = parse_calendar_list(&text, home_href);
    let (start, end) = default_sync_range();

    let calendars = parsed
      .into_iter()
      .map(|cal| {
        let calendar_kind = infer_calendar_kind(self, &cal, &start, &end);
        CalDavCalendarDto {
          href: cal.href,
          name: cal.name,
          color: cal.color,
          calendar_kind,
          supports_vevent: cal.supports_vevent,
          supports_vtodo: cal.supports_vtodo,
        }
      })
      .collect::<Vec<_>>();

    if calendars.is_empty() {
      return Err(format!(
        "Keine Kalender in der Server-Antwort erkannt. Home: {home_href}. Antwort-Ausschnitt: {}",
        snippet(&text)
      ));
    }

    Ok(calendars)
  }

  fn propfind_text(&self, url: &Url, depth: &str, body: &str) -> Result<String, String> {
    let response = self
      .propfind_or_report(dav_method(b"PROPFIND"), url, depth, body)?
      .send()
      .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let text = response.text().map_err(|e| e.to_string())?;

    if status == 401 {
      return Err(
        "Anmeldung fehlgeschlagen (401). Für iCloud bitte ein app-spezifisches Passwort nutzen – nicht dein normales Apple-Passwort."
          .into(),
      );
    }

    if !(200..300).contains(&status) && status != 207 {
      return Err(format_http_error("PROPFIND", status, &text));
    }

    Ok(text)
  }

  fn propfind_or_report(
    &self,
    method: Method,
    url: &Url,
    depth: &str,
    body: &str,
  ) -> Result<reqwest::blocking::RequestBuilder, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
      AUTHORIZATION,
      HeaderValue::from_str(&self.auth_header).map_err(|e| e.to_string())?,
    );
    headers.insert(
      CONTENT_TYPE,
      HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    headers.insert(
      USER_AGENT,
      HeaderValue::from_static("LiveLife/0.1 CalDAV"),
    );

    Ok(self
      .http
      .request(method, url.clone())
      .headers(headers)
      .header("Depth", depth)
      .body(body.to_string()))
  }

  fn fetch_calendar_report_body(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
  ) -> Result<String, String> {
    let url = resolve_href(&self.root_url, calendar_href)?;
    let start_fmt = to_caldav_datetime(start, false)?;
    let end_fmt = to_caldav_datetime(end, true)?;

    let body = format!(
      r#"<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="{start_fmt}" end="{end_fmt}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>"#
    );

    let response = self
      .propfind_or_report(dav_method(b"REPORT"), &url, "1", &body)?
      .send()
      .map_err(|e| format!("Abruf fehlgeschlagen: {e}"))?;

    let status = response.status().as_u16();
    let text = response.text().map_err(|e| e.to_string())?;
    if !(200..300).contains(&status) && status != 207 {
      return Err(format_http_error("REPORT", status, &text));
    }

    Ok(text)
  }

  fn fetch_reminder_report_body(
    &self,
    calendar_href: &str,
    start: &str,
    end: &str,
    style: ReminderQueryStyle,
  ) -> Result<String, String> {
    let url = resolve_href(&self.root_url, calendar_href)?;
    let start_fmt = to_caldav_datetime(start, false)?;
    let end_fmt = to_caldav_datetime(end, true)?;

    let filter = match style {
      ReminderQueryStyle::CompTimeRange => format!(
        r#"<C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO">
        <C:time-range start="{start_fmt}" end="{end_fmt}"/>
      </C:comp-filter>
    </C:comp-filter>"#
      ),
      ReminderQueryStyle::PropDueTimeRange => format!(
        r#"<C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO">
        <C:prop-filter name="DUE">
          <C:time-range start="{start_fmt}" end="{end_fmt}"/>
        </C:prop-filter>
      </C:comp-filter>
    </C:comp-filter>"#
      ),
      ReminderQueryStyle::Unfiltered => r#"<C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO"/>
    </C:comp-filter>"#
        .to_string(),
    };

    let body = format!(
      r#"<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    {filter}
  </C:filter>
</C:calendar-query>"#
    );

    let response = self
      .propfind_or_report(dav_method(b"REPORT"), &url, "1", &body)?
      .send()
      .map_err(|e| format!("Abruf fehlgeschlagen: {e}"))?;

    let status = response.status().as_u16();
    let text = response.text().map_err(|e| e.to_string())?;
    if !(200..300).contains(&status) && status != 207 {
      return Err(format_http_error("REPORT", status, &text));
    }

    Ok(text)
  }

  fn get_resource(&self, url: &Url) -> Result<(String, Option<String>), String> {
    let response = self
      .dav_request(dav_method(b"GET"), url, None, None)?
      .send()
      .map_err(|e| format!("GET fehlgeschlagen: {e}"))?;

    let status = response.status().as_u16();
    let etag = response
      .headers()
      .get("etag")
      .and_then(|v| v.to_str().ok())
      .map(|s| s.trim_matches('"').to_string());
    let text = response.text().map_err(|e| e.to_string())?;
    if !(200..300).contains(&status) {
      return Err(format_http_error("GET", status, &text));
    }
    Ok((text, etag))
  }

  fn put_resource(&self, url: &Url, body: &str, etag: Option<&str>) -> Result<(), String> {
    let mut request = self.dav_request(
      dav_method(b"PUT"),
      url,
      Some("text/calendar; charset=utf-8"),
      Some(body),
    )?;
    if let Some(tag) = etag {
      request = request.header("If-Match", format!("\"{tag}\""));
    }
    let response = request.send().map_err(|e| format!("PUT fehlgeschlagen: {e}"))?;
    let status = response.status().as_u16();
    let text = response.text().unwrap_or_default();
    if !(200..300).contains(&status) {
      return Err(format_http_error("PUT", status, &text));
    }
    Ok(())
  }

  fn delete_resource(&self, url: &Url) -> Result<(), String> {
    let response = self
      .dav_request(dav_method(b"DELETE"), url, None, None)?
      .send()
      .map_err(|e| format!("DELETE fehlgeschlagen: {e}"))?;
    let status = response.status().as_u16();
    let text = response.text().unwrap_or_default();
    if status == 404 {
      return Ok(());
    }
    if !(200..300).contains(&status) {
      return Err(format_http_error("DELETE", status, &text));
    }
    Ok(())
  }

  fn dav_request(
    &self,
    method: Method,
    url: &Url,
    content_type: Option<&str>,
    body: Option<&str>,
  ) -> Result<reqwest::blocking::RequestBuilder, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
      AUTHORIZATION,
      HeaderValue::from_str(&self.auth_header).map_err(|e| e.to_string())?,
    );
    if let Some(ct) = content_type {
      headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_str(ct).map_err(|e| e.to_string())?,
      );
    }
    headers.insert(
      USER_AGENT,
      HeaderValue::from_static("LiveLife/0.1 CalDAV"),
    );

    let mut builder = self.http.request(method, url.clone()).headers(headers);
    if let Some(payload) = body {
      builder = builder.body(payload.to_string());
    }
    Ok(builder)
  }
}

enum ReminderQueryStyle {
  CompTimeRange,
  PropDueTimeRange,
  Unfiltered,
}

fn infer_calendar_kind(
  client: &CalDavClient,
  cal: &super::xml::DiscoveredCalendar,
  start: &str,
  end: &str,
) -> String {
  if cal.supports_vtodo && !cal.supports_vevent {
    return "reminders".into();
  }
  if cal.supports_vevent && !cal.supports_vtodo {
    return "events".into();
  }
  if cal.supports_vtodo && cal.supports_vevent {
    if let Ok((has_events, has_todos)) = client.probe_calendar_content(&cal.href, start, end) {
      if has_todos && !has_events {
        return "reminders".into();
      }
    }
  }
  "events".into()
}

fn blocks_contain_component(blocks: &[String], marker: &str) -> bool {
  let needle = marker.to_ascii_uppercase();
  blocks
    .iter()
    .any(|block| block.to_ascii_uppercase().contains(&needle))
}

fn default_sync_range() -> (String, String) {
  use chrono::{Duration, Local};
  let today = Local::now().date_naive();
  let start = today - Duration::days(30);
  let end = today + Duration::days(365);
  (
    start.format("%Y-%m-%d").to_string(),
    end.format("%Y-%m-%d").to_string(),
  )
}

fn resolve_href(base: &Url, href: &str) -> Result<Url, String> {
  let trimmed = href.trim();
  if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
    Url::parse(trimmed).map_err(|e| e.to_string())
  } else {
    base.join(trimmed)
      .map_err(|e| format!("URL-Auflösung fehlgeschlagen für '{trimmed}': {e}"))
  }
}

fn format_http_error(method: &str, status: u16, body: &str) -> String {
  format!("{method} fehlgeschlagen ({status}): {}", snippet(body))
}

fn snippet(body: &str) -> String {
  body.chars().filter(|c| !c.is_control()).take(220).collect()
}

fn base64_encode(input: &str) -> String {
  use base64::Engine;
  base64::engine::general_purpose::STANDARD.encode(input.as_bytes())
}

fn to_caldav_datetime(iso_date: &str, end_of_day: bool) -> Result<String, String> {
  let date = iso_date.trim();
  if date.len() != 10 || !date.contains('-') {
    return Err(format!("Ungültiges Datum: {iso_date}"));
  }
  let compact = date.replace('-', "");
  if end_of_day {
    Ok(format!("{compact}T235959Z"))
  } else {
    Ok(format!("{compact}T000000Z"))
  }
}
