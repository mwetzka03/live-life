use chrono::{Datelike, Duration, NaiveDate, Weekday};

#[derive(Debug, Clone)]
pub struct ParsedRRule {
  pub freq: RRuleFreq,
  pub interval: u32,
  pub until: Option<NaiveDate>,
  pub count: Option<u32>,
  pub by_day: Vec<Weekday>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RRuleFreq {
  Daily,
  Weekly,
  Monthly,
  Yearly,
}

pub fn parse_rrule(raw: &str) -> Option<ParsedRRule> {
  let mut freq = None;
  let mut interval = 1u32;
  let mut until = None;
  let mut count = None;
  let mut by_day = Vec::new();

  for part in raw.split(';') {
    let Some((key, value)) = part.split_once('=') else {
      continue;
    };
    match key.to_uppercase().as_str() {
      "FREQ" => {
        freq = Some(match value.to_uppercase().as_str() {
          "DAILY" => RRuleFreq::Daily,
          "WEEKLY" => RRuleFreq::Weekly,
          "MONTHLY" => RRuleFreq::Monthly,
          "YEARLY" => RRuleFreq::Yearly,
          _ => return None,
        });
      }
      "INTERVAL" => interval = value.parse().unwrap_or(1).max(1),
      "COUNT" => count = value.parse().ok(),
      "UNTIL" => until = parse_rrule_until(value),
      "BYDAY" => {
        by_day = value
          .split(',')
          .filter_map(parse_byday)
          .collect();
      }
      _ => {}
    }
  }

  Some(ParsedRRule {
    freq: freq?,
    interval,
    until,
    count,
    by_day,
  })
}

pub fn expand_rrule(
  start: NaiveDate,
  rule: &ParsedRRule,
  range_start: NaiveDate,
  range_end: NaiveDate,
  exdates: &[NaiveDate],
) -> Vec<NaiveDate> {
  let mut results = Vec::new();
  let mut count = 0u32;

  match rule.freq {
    RRuleFreq::Daily => {
      let mut current = start;
      while current <= range_end {
        if current >= range_start && !exdates.contains(&current) {
          results.push(current);
          count += 1;
          if rule.count.is_some_and(|c| count >= c) {
            break;
          }
        }
        if rule.until.is_some_and(|u| current >= u) {
          break;
        }
        current += Duration::days(rule.interval as i64);
      }
    }
    RRuleFreq::Weekly => {
      let days = if rule.by_day.is_empty() {
        vec![start.weekday()]
      } else {
        rule.by_day.clone()
      };
      let mut week_start = start - Duration::days(start.weekday().num_days_from_monday() as i64);
      if week_start > start {
        week_start -= Duration::days(7);
      }
      while week_start <= range_end {
        for day in &days {
          let offset = day.num_days_from_monday() as i64;
          let current = week_start + Duration::days(offset);
          if current < start || current > range_end {
            continue;
          }
          if rule.until.is_some_and(|u| current > u) {
            continue;
          }
          if current >= range_start && !exdates.contains(&current) {
            results.push(current);
            count += 1;
            if rule.count.is_some_and(|c| count >= c) {
              return results;
            }
          }
        }
        if rule.until.is_some_and(|u| week_start > u) {
          break;
        }
        week_start += Duration::days(7 * rule.interval as i64);
      }
    }
    RRuleFreq::Monthly => {
      let mut year = start.year();
      let mut month = start.month();
      let day = start.day();
      loop {
        let current = NaiveDate::from_ymd_opt(year, month, day);
        let Some(current) = current else {
          break;
        };
        if current > range_end {
          break;
        }
        if current >= start && current >= range_start && !exdates.contains(&current) {
          results.push(current);
          count += 1;
          if rule.count.is_some_and(|c| count >= c) {
            break;
          }
        }
        if rule.until.is_some_and(|u| current >= u) {
          break;
        }
        month += rule.interval;
        while month > 12 {
          month -= 12;
          year += 1;
        }
        if year > range_end.year() + 1 {
          break;
        }
      }
    }
    RRuleFreq::Yearly => {
      let mut year = start.year();
      let month = start.month();
      let day = start.day();
      loop {
        let current = NaiveDate::from_ymd_opt(year, month, day);
        let Some(current) = current else {
          break;
        };
        if current > range_end {
          break;
        }
        if current >= start && current >= range_start && !exdates.contains(&current) {
          results.push(current);
          count += 1;
          if rule.count.is_some_and(|c| count >= c) {
            break;
          }
        }
        if rule.until.is_some_and(|u| current >= u) {
          break;
        }
        year += rule.interval as i32;
      }
    }
  }

  results.sort();
  results.dedup();
  results
}

fn parse_rrule_until(value: &str) -> Option<NaiveDate> {
  let clean = value.trim().trim_end_matches('Z');
  if clean.len() >= 8 {
    let y: i32 = clean[0..4].parse().ok()?;
    let m: u32 = clean[4..6].parse().ok()?;
    let d: u32 = clean[6..8].parse().ok()?;
    return NaiveDate::from_ymd_opt(y, m, d);
  }
  None
}

fn parse_byday(token: &str) -> Option<Weekday> {
  let upper = token.to_uppercase();
  let day = upper.chars().rev().take(2).collect::<String>();
  match day.as_str() {
    "MO" => Some(Weekday::Mon),
    "TU" => Some(Weekday::Tue),
    "WE" => Some(Weekday::Wed),
    "TH" => Some(Weekday::Thu),
    "FR" => Some(Weekday::Fri),
    "SA" => Some(Weekday::Sat),
    "SU" => Some(Weekday::Sun),
    _ => None,
  }
}

pub fn parse_iso_date(iso: &str) -> Option<NaiveDate> {
  let parts: Vec<_> = iso.split('-').collect();
  if parts.len() != 3 {
    return None;
  }
  let y: i32 = parts[0].parse().ok()?;
  let m: u32 = parts[1].parse().ok()?;
  let d: u32 = parts[2].parse().ok()?;
  NaiveDate::from_ymd_opt(y, m, d)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn expands_weekly() {
    let rule = parse_rrule("FREQ=WEEKLY;BYDAY=FR").unwrap();
    let start = NaiveDate::from_ymd_opt(2025, 5, 23).unwrap();
    let range_start = NaiveDate::from_ymd_opt(2025, 5, 1).unwrap();
    let range_end = NaiveDate::from_ymd_opt(2025, 6, 30).unwrap();
    let dates = expand_rrule(start, &rule, range_start, range_end, &[]);
    assert!(dates.len() >= 5);
    assert!(dates.iter().all(|d| d.weekday() == Weekday::Fri));
  }
}
