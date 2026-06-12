use quick_xml::events::Event;
use quick_xml::Reader;

pub fn local_name(raw: &str) -> String {
  raw.rsplit(':').next().unwrap_or(raw).to_string()
}

pub fn extract_href_after_marker(xml: &str, marker: &str) -> Option<String> {
  let lower = xml.to_ascii_lowercase();
  let marker_lower = marker.to_ascii_lowercase();
  let marker_pos = lower.find(&marker_lower)?;
  let slice = &xml[marker_pos..];

  for tag in ["href", "d:href", "D:href"] {
    if let Some(pos) = slice.find(tag) {
      let after = &slice[pos..];
      if let Some(open_end) = after.find('>') {
        let content_start = open_end + 1;
        if let Some(close) = after[content_start..].find('<') {
          let href = after[content_start..content_start + close].trim();
          if !href.is_empty() {
            return Some(href.to_string());
          }
        }
      }
    }
  }

  None
}

pub fn extract_calendar_data_blocks(xml: &str) -> Vec<String> {
  let mut reader = Reader::from_str(xml);
  reader.config_mut().trim_text(true);
  let mut buf = Vec::new();
  let mut in_calendar_data = false;
  let mut current = String::new();
  let mut blocks = Vec::new();

  loop {
    match reader.read_event_into(&mut buf) {
      Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref()));
        if name == "calendar-data" {
          in_calendar_data = true;
          current.clear();
        }
      }
      Ok(Event::Text(e)) if in_calendar_data => {
        current.push_str(&e.unescape().unwrap_or_default());
      }
      Ok(Event::CData(e)) if in_calendar_data => {
        current.push_str(&String::from_utf8_lossy(&e.into_inner()));
      }
      Ok(Event::End(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref()));
        if name == "calendar-data" {
          in_calendar_data = false;
          let trimmed = current.trim();
          if !trimmed.is_empty() {
            blocks.push(trimmed.to_string());
          }
        }
      }
      Ok(Event::Eof) => break,
      Err(_) => break,
      _ => {}
    }
    buf.clear();
  }

  blocks
}

#[derive(Debug, Clone)]
pub struct CalendarResource {
  pub href: String,
  pub ics: String,
  #[allow(dead_code)]
  pub etag: Option<String>,
}

pub fn extract_calendar_resources(xml: &str) -> Vec<CalendarResource> {
  let mut reader = Reader::from_str(xml);
  reader.config_mut().trim_text(true);
  let mut buf = Vec::new();
  let mut in_response = false;
  let mut in_href = false;
  let mut in_calendar_data = false;
  let mut in_etag = false;
  let mut current_href = String::new();
  let mut current_etag: Option<String> = None;
  let mut current_ics = String::new();
  let mut resources = Vec::new();

  loop {
    match reader.read_event_into(&mut buf) {
      Ok(Event::Start(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref()));
        match name.as_str() {
          "response" => {
            in_response = true;
            current_href.clear();
            current_etag = None;
            current_ics.clear();
          }
          "href" if in_response => in_href = true,
          "getetag" if in_response => in_etag = true,
          "calendar-data" => {
            in_calendar_data = true;
            current_ics.clear();
          }
          _ => {}
        }
      }
      Ok(Event::Text(e)) => {
        let text = e.unescape().unwrap_or_default().to_string();
        if in_href {
          current_href.push_str(&text);
        } else if in_etag {
          current_etag = Some(text);
        } else if in_calendar_data {
          current_ics.push_str(&text);
        }
      }
      Ok(Event::CData(e)) if in_calendar_data => {
        current_ics.push_str(&String::from_utf8_lossy(&e.into_inner()));
      }
      Ok(Event::End(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref()));
        match name.as_str() {
          "href" => in_href = false,
          "getetag" => in_etag = false,
          "calendar-data" => in_calendar_data = false,
          "response" => {
            in_response = false;
            let href = current_href.trim().to_string();
            let ics = current_ics.trim().to_string();
            if !href.is_empty() && !ics.is_empty() && ics.contains("BEGIN:VCALENDAR") {
              resources.push(CalendarResource {
                href,
                ics,
                etag: current_etag.clone(),
              });
            }
          }
          _ => {}
        }
      }
      Ok(Event::Eof) => break,
      Err(_) => break,
      _ => {}
    }
    buf.clear();
  }

  resources
}

#[derive(Default, Clone)]
struct ResponseBlock {
  href: Option<String>,
  name: Option<String>,
  color: Option<String>,
  is_calendar: bool,
  has_vevent: bool,
  has_vtodo: bool,
  status_ok: bool,
}

#[derive(Debug, Clone)]
pub struct DiscoveredCalendar {
  pub href: String,
  pub name: String,
  pub color: Option<String>,
  pub supports_vevent: bool,
  pub supports_vtodo: bool,
}

pub fn parse_calendar_list(xml: &str, home_href_hint: &str) -> Vec<DiscoveredCalendar> {
  let mut reader = Reader::from_str(xml);
  reader.config_mut().trim_text(true);
  let mut buf = Vec::new();

  let mut results = Vec::new();
  let mut block = ResponseBlock::default();
  let mut current_tag: Option<String> = None;
  let mut in_propstat = false;
  let mut propstat_ok = false;

  loop {
    match reader.read_event_into(&mut buf) {
      Ok(Event::Start(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref())).to_string();
        current_tag = Some(name.clone());

        if name == "response" {
          block = ResponseBlock::default();
        }
        if name == "propstat" {
          in_propstat = true;
          propstat_ok = false;
        }
        if name == "calendar" {
          block.is_calendar = true;
        }
        if name == "comp" {
          for attr in e.attributes().flatten() {
            let key = local_name(&String::from_utf8_lossy(attr.key.as_ref()));
            if key == "name" {
              let val = String::from_utf8_lossy(&attr.value).to_ascii_uppercase();
              if val == "VEVENT" {
                block.has_vevent = true;
              }
              if val == "VTODO" {
                block.has_vtodo = true;
              }
            }
          }
        }
      }
      Ok(Event::Empty(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref())).to_string();
        if name == "calendar" {
          block.is_calendar = true;
        }
      }
      Ok(Event::Text(e)) => {
        let text = e.unescape().unwrap_or_default().trim().to_string();
        if text.is_empty() {
          buf.clear();
          continue;
        }
        if let Some(tag) = &current_tag {
          match tag.as_str() {
            "href" if block.href.is_none() => block.href = Some(text),
            "displayname" => block.name = Some(text),
            "calendar-color" => block.color = Some(text),
            "status" if in_propstat && text.contains("200") => propstat_ok = true,
            _ => {}
          }
        }
      }
      Ok(Event::End(e)) => {
        let name = local_name(&String::from_utf8_lossy(e.name().as_ref())).to_string();
        if name == "propstat" {
          in_propstat = false;
          if propstat_ok {
            block.status_ok = true;
          }
        }
        if name == "response" {
          if let Some(href) = block.href.clone() {
            if should_include_calendar(&block, &href, home_href_hint) {
              let cal_name = block.name.clone().unwrap_or_else(|| "Kalender".into());
              results.push(DiscoveredCalendar {
                href,
                name: cal_name,
                color: block.color.clone(),
                supports_vevent: block.has_vevent,
                supports_vtodo: block.has_vtodo,
              });
            }
          }
        }
        if matches!(name.as_str(), "href" | "displayname" | "calendar-color" | "status") {
          current_tag = None;
        }
      }
      Ok(Event::Eof) => break,
      Err(_) => break,
      _ => {}
    }
    buf.clear();
  }

  if results.is_empty() {
    results = parse_calendar_list_fallback(xml, home_href_hint);
  }

  dedupe_calendars(results)
}

fn parse_calendar_list_fallback(
  xml: &str,
  home_href_hint: &str,
) -> Vec<DiscoveredCalendar> {
  let mut results = Vec::new();
  let chunks: Vec<&str> = xml.split("<response").collect();

  for chunk in chunks.iter().skip(1) {
    let href = extract_href_after_marker(chunk, "href");
    let Some(href) = href else { continue };

    if is_home_or_principal_href(&href, home_href_hint) {
      continue;
    }

    if !is_probable_calendar_href(&href, home_href_hint) {
      continue;
    }

    let name = extract_tag_text(chunk, "displayname").unwrap_or_else(|| "Kalender".into());
    let has_vtodo = chunk.to_ascii_lowercase().contains("vtodo");
    let has_vevent = chunk.to_ascii_lowercase().contains("vevent");
    let block = ResponseBlock {
      href: Some(href.clone()),
      name: Some(name.clone()),
      color: None,
      is_calendar: true,
      has_vevent,
      has_vtodo,
      status_ok: true,
    };
    if should_include_calendar(&block, &href, home_href_hint) {
      let color = extract_tag_text(chunk, "calendar-color");
      results.push(DiscoveredCalendar {
        href,
        name,
        color,
        supports_vevent: has_vevent,
        supports_vtodo: has_vtodo,
      });
    }
  }

  results
}

fn should_include_calendar(
  block: &ResponseBlock,
  href: &str,
  home_href_hint: &str,
) -> bool {
  if is_home_or_principal_href(href, home_href_hint) {
    return false;
  }
  block.has_vevent
    || block.has_vtodo
    || block.is_calendar
    || is_probable_calendar_href(href, home_href_hint)
}

fn extract_tag_text(xml: &str, tag: &str) -> Option<String> {
  let lower = xml.to_ascii_lowercase();
  let open = format!("<{tag}");
  let start = lower.find(&open)?;
  let after = &xml[start..];
  let open_end = after.find('>')? + 1;
  let close = after[open_end..].find('<')? + open_end;
  let text = after[open_end..close].trim();
  if text.is_empty() {
    None
  } else {
    Some(text.to_string())
  }
}

fn is_home_or_principal_href(href: &str, home_hint: &str) -> bool {
  let h = normalize_href(href);
  let home = normalize_href(home_hint);
  h == home
    || h.ends_with("/calendars")
    || h.ends_with("/calendars/")
    || h.contains("/principal")
    || h.ends_with("/inbox/")
    || h.ends_with("/outbox/")
    || h.contains("/notification/")
}

fn is_probable_calendar_href(href: &str, home_hint: &str) -> bool {
  let h = normalize_href(href);
  if !h.contains("/calendars/") {
    return false;
  }
  if is_home_or_principal_href(href, home_hint) {
    return false;
  }
  let segments: Vec<&str> = h.trim_end_matches('/').split('/').collect();
  let last = segments.last().copied().unwrap_or("");
  last.len() >= 8 && last != "calendars"
}

fn normalize_href(href: &str) -> String {
  href.trim().trim_end_matches('/').to_ascii_lowercase()
}

fn dedupe_calendars(items: Vec<DiscoveredCalendar>) -> Vec<DiscoveredCalendar> {
  let mut seen = std::collections::HashSet::new();
  let mut out = Vec::new();
  for cal in items {
    let key = normalize_href(&cal.href);
    if seen.insert(key) {
      out.push(cal);
    }
  }
  out
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn detects_calendar_href() {
    assert!(is_probable_calendar_href(
      "/123/calendars/086e6106-1c0d-4301-a99d-5c5ebbcc5079/",
      "/123/calendars/"
    ));
    assert!(!is_probable_calendar_href("/123/calendars/", "/123/calendars/"));
  }
}
