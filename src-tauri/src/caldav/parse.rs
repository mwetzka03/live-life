use crate::models::SyncedEventDto;
use crate::caldav::rrule_expand::{expand_rrule, parse_iso_date, parse_rrule, RRuleFreq};
use crate::caldav::xml::CalendarResource;
use chrono::{Datelike, NaiveDate};

pub fn parse_ics_resources(
  resources: &[CalendarResource],
  range_start: &str,
  range_end: &str,
) -> Vec<SyncedEventDto> {
  let range_start_date = parse_iso_date(range_start).unwrap_or_else(|| NaiveDate::from_ymd_opt(2000, 1, 1).unwrap());
  let range_end_date = parse_iso_date(range_end).unwrap_or_else(|| NaiveDate::from_ymd_opt(2100, 12, 31).unwrap());

  let mut events = Vec::new();
  for resource in resources {
    events.extend(parse_ics_block(
      &resource.ics,
      &resource.href,
      range_start_date,
      range_end_date,
    ));
  }
  events.sort_by(|a, b| a.date.cmp(&b.date).then(a.start_time.cmp(&b.start_time)));
  events
}

pub fn parse_todo_resources(
  resources: &[CalendarResource],
  range_start: &str,
  range_end: &str,
) -> Vec<SyncedEventDto> {
  let range_start_date = parse_iso_date(range_start).unwrap_or_else(|| NaiveDate::from_ymd_opt(2000, 1, 1).unwrap());
  let range_end_date = parse_iso_date(range_end).unwrap_or_else(|| NaiveDate::from_ymd_opt(2100, 12, 31).unwrap());

  let mut todos = Vec::new();
  for resource in resources {
    todos.extend(parse_todo_block(
      &resource.ics,
      &resource.href,
      range_start_date,
      range_end_date,
    ));
  }
  todos.sort_by(|a, b| a.date.cmp(&b.date).then(a.start_time.cmp(&b.start_time)));
  todos
}

fn parse_todo_block(
  ics: &str,
  resource_href: &str,
  range_start: NaiveDate,
  range_end: NaiveDate,
) -> Vec<SyncedEventDto> {
  let unfolded = unfold_ics(ics);
  let mut todos = Vec::new();
  let mut in_todo = false;
  let mut current: TodoBuilder = TodoBuilder::default();

  for line in unfolded.lines() {
    let line = line.trim();
    if line == "BEGIN:VTODO" {
      in_todo = true;
      current = TodoBuilder::default();
      continue;
    }
    if line == "END:VTODO" {
      todos.extend(current.build_occurrences(resource_href, range_start, range_end));
      in_todo = false;
      current = TodoBuilder::default();
      continue;
    }
    if !in_todo {
      continue;
    }
    if let Some((key, value)) = line.split_once(':') {
      let key = key.split(';').next().unwrap_or(key).to_uppercase();
      current.apply(&key, value);
    }
  }

  todos
}

#[derive(Default)]
struct TodoBuilder {
  uid: Option<String>,
  title: Option<String>,
  description: Option<String>,
  due: Option<String>,
  dtstart: Option<String>,
  rrule: Option<String>,
  exdates: Vec<String>,
  completed: bool,
}

impl TodoBuilder {
  fn apply(&mut self, key: &str, value: &str) {
    match key {
      "UID" => self.uid = Some(value.to_string()),
      "SUMMARY" => self.title = Some(unescape_ics_text(value)),
      "DESCRIPTION" => self.description = Some(unescape_ics_text(value)),
      "DUE" => self.due = Some(value.to_string()),
      "DTSTART" => {
        if self.due.is_none() {
          self.dtstart = Some(value.to_string());
        }
      }
      "RRULE" => self.rrule = Some(value.to_string()),
      "EXDATE" => self.exdates.push(value.to_string()),
      "STATUS" => {
        if value.eq_ignore_ascii_case("COMPLETED") || value.eq_ignore_ascii_case("CANCELLED") {
          self.completed = true;
        }
      }
      "COMPLETED" => {
        if !value.trim().is_empty() {
          self.completed = true;
        }
      }
      "PERCENT-COMPLETE" => {
        if value.trim() == "100" {
          self.completed = true;
        }
      }
      _ => {}
    }
  }

  fn build_occurrences(
    &self,
    resource_href: &str,
    range_start: NaiveDate,
    range_end: NaiveDate,
  ) -> Vec<SyncedEventDto> {
    if self.completed {
      return Vec::new();
    }
    let Some(uid) = self.uid.clone() else {
      return Vec::new();
    };
    let title = self.title.clone().unwrap_or_else(|| "Erinnerung".into());
    let Some(due_raw) = self.due.clone().or_else(|| self.dtstart.clone()) else {
      return Vec::new();
    };
    let (base_date, start_time) = parse_ics_datetime(&due_raw);
    let Some(base_naive) = parse_iso_date(&base_date) else {
      return Vec::new();
    };
    let description = self.description.clone().filter(|d| !d.is_empty());
    let is_recurring = self.rrule.is_some();
    let (recurrence, weekly_days) = self
      .rrule
      .as_ref()
      .map(|raw| recurrence_from_rrule(raw))
      .unwrap_or((None, None));
    let weekly_days = weekly_days.or_else(|| {
      if recurrence.as_deref() == Some("weekly") {
        Some(vec![weekday_to_js(base_naive.weekday())])
      } else {
        None
      }
    });
    let series_uid = base_uid(&uid).to_string();

    let exdates: Vec<NaiveDate> = self
      .exdates
      .iter()
      .map(|raw| parse_ics_datetime(raw).0)
      .filter_map(|d| parse_iso_date(&d))
      .collect();

    let occurrence_dates = if let Some(rrule_raw) = &self.rrule {
      if let Some(rule) = parse_rrule(rrule_raw) {
        expand_rrule(base_naive, &rule, range_start, range_end, &exdates)
      } else {
        vec![base_naive]
      }
    } else {
      vec![base_naive]
    };

    occurrence_dates
      .into_iter()
      .filter(|d| *d >= range_start && *d <= range_end)
      .map(|date| {
        let date_str = format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day());
        let occurrence_uid = if is_recurring {
          format!("{series_uid}@{date_str}")
        } else {
          uid.clone()
        };
        SyncedEventDto {
          uid: occurrence_uid.clone(),
          href: occurrence_uid,
          resource_href: Some(resource_href.to_string()),
          title: title.clone(),
          description: description.clone(),
          date: Some(date_str),
          start_time: start_time.clone(),
          end_time: None,
          is_recurring,
          recurrence: recurrence.clone(),
          weekly_days: weekly_days.clone(),
          is_reminder: true,
        }
      })
      .collect()
  }
}

fn parse_ics_block(
  ics: &str,
  resource_href: &str,
  range_start: NaiveDate,
  range_end: NaiveDate,
) -> Vec<SyncedEventDto> {
  let unfolded = unfold_ics(ics);
  let mut events = Vec::new();
  let mut in_event = false;
  let mut current: EventBuilder = EventBuilder::default();

  for line in unfolded.lines() {
    let line = line.trim();
    if line == "BEGIN:VEVENT" {
      in_event = true;
      current = EventBuilder::default();
      continue;
    }
    if line == "END:VEVENT" {
      events.extend(current.build_occurrences(resource_href, range_start, range_end));
      in_event = false;
      current = EventBuilder::default();
      continue;
    }
    if !in_event {
      continue;
    }
    if let Some((key, value)) = line.split_once(':') {
      let key = key.split(';').next().unwrap_or(key).to_uppercase();
      current.apply(&key, value);
    }
  }

  events
}

fn unfold_ics(input: &str) -> String {
  let mut result = String::new();
  for line in input.lines() {
    if line.starts_with(' ') || line.starts_with('\t') {
      if let Some(stripped) = result.pop() {
        result.push(stripped);
      }
      result.push_str(line.trim_start());
    } else {
      if !result.is_empty() {
        result.push('\n');
      }
      result.push_str(line);
    }
  }
  result
}

#[derive(Default)]
struct EventBuilder {
  uid: Option<String>,
  title: Option<String>,
  description: Option<String>,
  dtstart: Option<String>,
  dtend: Option<String>,
  rrule: Option<String>,
  exdates: Vec<String>,
}

impl EventBuilder {
  fn apply(&mut self, key: &str, value: &str) {
    match key {
      "UID" => self.uid = Some(value.to_string()),
      "SUMMARY" => self.title = Some(unescape_ics_text(value)),
      "DESCRIPTION" => self.description = Some(unescape_ics_text(value)),
      "DTSTART" => {
        if self.dtstart.is_none() {
          self.dtstart = Some(value.to_string());
        }
      }
      "DTEND" => self.dtend = Some(value.to_string()),
      "RRULE" => self.rrule = Some(value.to_string()),
      "EXDATE" => self.exdates.push(value.to_string()),
      _ => {}
    }
  }

  fn build_occurrences(
    &self,
    resource_href: &str,
    range_start: NaiveDate,
    range_end: NaiveDate,
  ) -> Vec<SyncedEventDto> {
    let Some(uid) = self.uid.clone() else {
      return Vec::new();
    };
    let title = self.title.clone().unwrap_or_else(|| "Termin".into());
    let Some(dtstart) = self.dtstart.clone() else {
      return Vec::new();
    };
    let (base_date, start_time) = parse_ics_datetime(&dtstart);
    let Some(base_naive) = parse_iso_date(&base_date) else {
      return Vec::new();
    };
    let end_time = self.dtend.as_ref().and_then(|dt| parse_ics_datetime(dt).1);
    let description = self.description.clone().filter(|d| !d.is_empty());
    let is_recurring = self.rrule.is_some();
    let (recurrence, weekly_days) = self
      .rrule
      .as_ref()
      .map(|raw| recurrence_from_rrule(raw))
      .unwrap_or((None, None));
    let weekly_days = weekly_days.or_else(|| {
      if recurrence.as_deref() == Some("weekly") {
        Some(vec![weekday_to_js(base_naive.weekday())])
      } else {
        None
      }
    });
    let series_uid = base_uid(&uid).to_string();

    let exdates: Vec<NaiveDate> = self
      .exdates
      .iter()
      .map(|raw| parse_ics_datetime(raw).0)
      .filter_map(|d| parse_iso_date(&d))
      .collect();

    let occurrence_dates = if let Some(rrule_raw) = &self.rrule {
      if let Some(rule) = parse_rrule(rrule_raw) {
        expand_rrule(base_naive, &rule, range_start, range_end, &exdates)
      } else {
        vec![base_naive]
      }
    } else {
      vec![base_naive]
    };

    occurrence_dates
      .into_iter()
      .filter(|d| *d >= range_start && *d <= range_end)
      .map(|date| {
        let date_str = format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day());
        let occurrence_uid = if is_recurring {
          format!("{series_uid}@{date_str}")
        } else {
          uid.clone()
        };
        SyncedEventDto {
          uid: occurrence_uid.clone(),
          href: occurrence_uid,
          resource_href: Some(resource_href.to_string()),
          title: title.clone(),
          description: description.clone(),
          date: Some(date_str),
          start_time: start_time.clone(),
          end_time: end_time.clone(),
          is_recurring,
          recurrence: recurrence.clone(),
          weekly_days: weekly_days.clone(),
          is_reminder: false,
        }
      })
      .collect()
  }
}

fn parse_ics_datetime(raw: &str) -> (String, Option<String>) {
  let value = strip_datetime_suffix(raw.trim());

  if value.len() == 8 && value.chars().all(|c| c.is_ascii_digit()) {
    let date = format!("{}-{}-{}", &value[0..4], &value[4..6], &value[6..8]);
    return (date, None);
  }

  if let Some(t_idx) = value.find('T') {
    if t_idx == 8 && value.len() >= t_idx + 5 {
      let date = format!("{}-{}-{}", &value[0..4], &value[4..6], &value[6..8]);
      let time_part = &value[t_idx + 1..];
      let hh = &time_part[0..2];
      let mm = &time_part[2..4];
      return (date, Some(format!("{hh}:{mm}")));
    }
  }

  (value.to_string(), None)
}

fn strip_datetime_suffix(value: &str) -> &str {
  let mut end = value.len();
  if value.ends_with('Z') || value.ends_with('z') {
    end -= 1;
  } else if end >= 5 {
    let suffix = &value[end - 5..];
    if (suffix.starts_with('+') || suffix.starts_with('-'))
      && suffix[1..].chars().all(|c| c.is_ascii_digit())
    {
      end -= 5;
    }
  }
  &value[..end]
}

fn recurrence_from_rrule(raw: &str) -> (Option<String>, Option<Vec<u8>>) {
  let Some(rule) = parse_rrule(raw) else {
    return (None, None);
  };
  let freq = match rule.freq {
    RRuleFreq::Daily => "daily",
    RRuleFreq::Weekly => "weekly",
    RRuleFreq::Monthly => "monthly",
    RRuleFreq::Yearly => "yearly",
  };
  let weekly_days = if matches!(rule.freq, RRuleFreq::Weekly) {
    Some(
      rule.by_day
        .iter()
        .map(|d| weekday_to_js(*d))
        .collect(),
    )
  } else {
    None
  };
  (Some(freq.to_string()), weekly_days)
}

fn weekday_to_js(day: chrono::Weekday) -> u8 {
  match day {
    chrono::Weekday::Sun => 0,
    chrono::Weekday::Mon => 1,
    chrono::Weekday::Tue => 2,
    chrono::Weekday::Wed => 3,
    chrono::Weekday::Thu => 4,
    chrono::Weekday::Fri => 5,
    chrono::Weekday::Sat => 6,
  }
}

fn base_uid(uid: &str) -> &str {
  uid.split('@').next().unwrap_or(uid)
}

fn unescape_ics_text(input: &str) -> String {
  input
    .replace("\\n", "\n")
    .replace("\\,", ",")
    .replace("\\;", ";")
    .replace("\\\\", "\\")
}
