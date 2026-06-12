pub fn add_exdate_to_ics(ics: &str, occurrence_date: &str, start_time: Option<&str>) -> Result<String, String> {
  let unfolded = unfold_ics(ics);
  let dtstart_raw = find_dtstart(&unfolded).ok_or("DTSTART nicht gefunden.")?;
  let exdate_value = build_exdate_value(&dtstart_raw, occurrence_date, start_time)?;

  if ics_contains_exdate(&unfolded, &exdate_value) {
    return Ok(ics.to_string());
  }

  let exdate_line = format!("EXDATE:{exdate_value}");
  insert_exdate_before_end(&unfolded, &exdate_line)
}

pub fn is_recurring_ics(ics: &str) -> bool {
  unfold_ics(ics)
    .lines()
    .any(|line| line.trim_start().starts_with("RRULE:"))
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

fn find_dtstart(ics: &str) -> Option<String> {
  let mut in_event = false;
  for line in ics.lines() {
    let line = line.trim();
    if line == "BEGIN:VEVENT" {
      in_event = true;
      continue;
    }
    if line == "END:VEVENT" {
      in_event = false;
      continue;
    }
    if !in_event {
      continue;
    }
    if let Some((key, value)) = line.split_once(':') {
      let key = key.split(';').next().unwrap_or(key).to_uppercase();
      if key == "DTSTART" {
        return Some(value.to_string());
      }
    }
  }
  None
}

fn build_exdate_value(dtstart_raw: &str, occurrence_date: &str, start_time: Option<&str>) -> Result<String, String> {
  let value = strip_datetime_suffix(dtstart_raw.trim());

  if value.len() == 8 && value.chars().all(|c| c.is_ascii_digit()) {
    let compact = occurrence_date.replace('-', "");
    return Ok(compact);
  }

  if let Some(time) = start_time {
    let compact_date = occurrence_date.replace('-', "");
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() >= 2 {
      let hh = parts[0];
      let mm = parts[1];
      let mut ex = format!("{compact_date}T{hh}{mm}00");
      if dtstart_raw.ends_with('Z') || dtstart_raw.ends_with('z') {
        ex.push('Z');
      }
      return Ok(ex);
    }
  }

  if value.contains('T') && value.len() >= 15 {
    let compact_date = occurrence_date.replace('-', "");
    let time_part = value.get(8..).unwrap_or("T000000Z");
    return Ok(format!("{compact_date}{time_part}"));
  }

  Err("EXDATE konnte nicht aus DTSTART abgeleitet werden.".into())
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

fn ics_contains_exdate(ics: &str, exdate_value: &str) -> bool {
  ics.lines().any(|line| {
    let line = line.trim();
    line.starts_with("EXDATE:") && line.contains(exdate_value)
  })
}

fn insert_exdate_before_end(ics: &str, exdate_line: &str) -> Result<String, String> {
  let mut lines: Vec<&str> = ics.lines().collect();
  let end_idx = lines
    .iter()
    .position(|line| line.trim() == "END:VEVENT")
    .ok_or_else(|| "END:VEVENT nicht gefunden.".to_string())?;
  lines.insert(end_idx, exdate_line);
  Ok(lines.join("\r\n"))
}
