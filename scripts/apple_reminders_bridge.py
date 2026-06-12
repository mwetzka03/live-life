#!/usr/bin/env python3
"""Bridge für Apple Reminders (Beta) via pyicloud – JSON stdout für Live Life."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

PENDING_STATE_FILE = ".pending_2fa_state.json"
DEFAULT_TZ = ZoneInfo("Europe/Berlin")


def emit(payload: dict) -> None:
    sys.stdout.buffer.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    sys.stdout.buffer.write(b"\n")
    sys.stdout.buffer.flush()


def fail(code: str, message: str, exit_code: int = 1) -> None:
    emit({"ok": False, "code": code, "error": message})
    sys.exit(exit_code)


def pending_path(cookie_dir: str) -> Path:
    return Path(cookie_dir) / PENDING_STATE_FILE


def clear_pending_state(cookie_dir: str) -> None:
    legacy = Path(cookie_dir) / ".pending_2fa_session.pkl"
    if legacy.exists():
        legacy.unlink()
    path = pending_path(cookie_dir)
    if path.exists():
        path.unlink()


def save_pending_state(api, cookie_dir: str) -> None:
    """Speichert MFA-Zustand als JSON (Pickle bricht PyiCloudSession)."""
    try:
        api.session._save_session_data()
    except Exception:  # noqa: BLE001
        pass

    state: dict = {
        "data": dict(getattr(api, "data", {}) or {}),
        "auth_data": dict(getattr(api, "_auth_data", {}) or {}),
        "delivery_method": getattr(api, "_two_factor_delivery_method", "unknown"),
        "delivery_notice": getattr(api, "_two_factor_delivery_notice", None),
        "requires_mfa": bool(
            getattr(api, "_requires_mfa", False)
            or getattr(api, "requires_2fa", False)
            or getattr(api, "requires_2sa", False)
        ),
    }

    boot = getattr(api, "_hsa2_boot_context", None)
    if boot is not None and hasattr(boot, "as_auth_data"):
        state["hsa2_boot"] = boot.as_auth_data()

    path = pending_path(cookie_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(state, handle)


def restore_pending_api(apple_id: str, password: str, cookie_dir: str):
    path = pending_path(cookie_dir)
    if not path.exists():
        return None

    with path.open(encoding="utf-8") as handle:
        state = json.load(handle)

    api = create_api(apple_id, password, cookie_dir, authenticate=False)

    if isinstance(state.get("data"), dict) and state["data"]:
        api.data = state["data"]

    api._auth_data = state.get("auth_data") or {}
    api._requires_mfa = bool(state.get("requires_mfa", True))

    method = state.get("delivery_method") or "unknown"
    api._set_two_factor_delivery_state(method, state.get("delivery_notice"))

    try:
        from pyicloud.hsa2_bridge import Hsa2BootContext

        if isinstance(state.get("hsa2_boot"), dict):
            api._hsa2_boot_context = Hsa2BootContext.from_auth_options(state["hsa2_boot"])
        elif api._auth_data:
            api._hsa2_boot_context = Hsa2BootContext.from_auth_options(api._auth_data)
    except Exception:  # noqa: BLE001
        api._hsa2_boot_context = None

    api._trusted_device_bridge_state = None
    api._update_state()
    return api


def parse_iso_date(value: str) -> date:
    return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()


def due_to_fields(due_raw) -> tuple[str, str | None] | None:
    if not due_raw or not isinstance(due_raw, list) or len(due_raw) < 4:
        return None
    year, month, day = int(due_raw[1]), int(due_raw[2]), int(due_raw[3])
    hour = int(due_raw[4]) if len(due_raw) > 4 else 0
    minute = int(due_raw[5]) if len(due_raw) > 5 else 0
    d = date(year, month, day)
    date_str = d.isoformat()
    if hour or minute:
        return date_str, f"{hour:02d}:{minute:02d}"
    return date_str, None


def import_pyicloud():
    try:
        from pyicloud import PyiCloudService
        from pyicloud.exceptions import (
            PyiCloud2FARequiredException,
            PyiCloud2SARequiredException,
            PyiCloudFailedLoginException,
        )
    except ImportError:
        fail(
            "PYICLOUD_MISSING",
            "Python-Paket pyicloud fehlt. Installiere: python -m pip install pyicloud tzlocal",
        )
    return PyiCloudService, PyiCloudFailedLoginException, (
        PyiCloud2FARequiredException,
        PyiCloud2SARequiredException,
    )


def create_api(apple_id: str, password: str, cookie_dir: str, *, authenticate: bool = True):
    PyiCloudService, PyiCloudFailedLoginException, mfa_exceptions = import_pyicloud()
    Path(cookie_dir).mkdir(parents=True, exist_ok=True)

    try:
        return PyiCloudService(
            apple_id,
            password,
            cookie_directory=cookie_dir,
            authenticate=authenticate,
        )
    except PyiCloudFailedLoginException as exc:
        fail("LOGIN_FAILED", str(exc) or "Apple-ID oder Passwort ungültig.")
    except mfa_exceptions:
        fail(
            "TWO_FACTOR_REQUIRED",
            "Zwei-Faktor-Code erforderlich. Klicke auf Anmelden und bestätige den Code separat.",
            exit_code=2,
        )
    except Exception as exc:  # noqa: BLE001
        msg = str(exc).strip() or exc.__class__.__name__
        fail("LOGIN_FAILED", f"Anmeldung fehlgeschlagen: {msg}")


def validate_two_factor(api, two_factor: str) -> None:
    code = two_factor.strip()
    if not code:
        fail("TWO_FACTOR_REQUIRED", "Zwei-Faktor-Code fehlt.")

    needs_2fa = getattr(api, "requires_2fa", False) or getattr(api, "_requires_mfa", False)
    needs_2sa = getattr(api, "requires_2sa", False)

    if not needs_2fa and not needs_2sa:
        return

    ok = False
    if needs_2fa:
        ok = bool(api.validate_2fa_code(code))
    elif needs_2sa:
        devices = api.trusted_devices
        if not devices:
            fail("TWO_FACTOR_REQUIRED", "Kein vertrauenswürdiges Gerät für 2SA gefunden.")
        ok = bool(api.validate_verification_code(devices[0], code))
    else:
        fail("NO_TWO_FACTOR", "Keine ausstehende Zwei-Faktor-Anfrage. Bitte erneut anmelden.")

    if not ok:
        fail("TWO_FACTOR_INVALID", "Ungültiger Zwei-Faktor-Code. Bitte erneut versuchen.")

    if needs_2fa and not api.is_trusted_session:
        try:
            api.trust_session()
        except Exception:  # noqa: BLE001
            pass

    try:
        api.session._save_session_data()
    except Exception:  # noqa: BLE001
        pass


def normalize_list_id(list_guid: str) -> str:
    guid = list_guid.strip()
    if guid.startswith("List/"):
        return guid
    return f"List/{guid}"


def list_id_variants(list_guid: str) -> list[str]:
    normalized = normalize_list_id(list_guid)
    variants = [normalized]
    if normalized.startswith("List/"):
        bare = normalized.split("/", 1)[1]
        variants.extend([bare, f"List/{bare}"])
    return list(dict.fromkeys(variants))


def fetch_reminders_for_list(service, list_guid: str) -> list:
    """Lädt Reminders einer Liste – inkl. erledigter für bidirektionalen Sync."""
    errors: list[str] = []
    include_completed = True
    results_limit = 1000

    for list_id in list_id_variants(list_guid):
        try:
            snapshot = service.list_reminders(
                list_id=list_id,
                include_completed=include_completed,
                results_limit=results_limit,
            )
            if snapshot.reminders:
                return list(snapshot.reminders)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{list_id}: {exc}")

    target_ids = set(list_id_variants(list_guid))
    try:
        collected: dict[str, object] = {}
        for event in service.iter_changes():
            if event.type == "deleted" or not event.reminder:
                continue
            reminder = event.reminder
            if reminder.list_id not in target_ids:
                continue
            collected[reminder.id] = reminder
        if collected:
            return list(collected.values())
    except Exception as exc:  # noqa: BLE001
        errors.append(f"iter_changes: {exc}")

    if errors:
        detail = "; ".join(errors)
        fail("FETCH_LIST_FAILED", f"Liste konnte nicht gelesen werden ({detail})")

    return []


def to_local_datetime(dt: datetime, tz_name: str | None) -> datetime:
    """pyicloud liefert naive Datetimes als UTC – in lokale Zeit umrechnen."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    tz = DEFAULT_TZ
    if tz_name:
        try:
            tz = ZoneInfo(tz_name)
        except Exception:  # noqa: BLE001
            pass
    return dt.astimezone(tz)


def recurrence_from_reminder(
    service,
    reminder,
    rule_cache: dict[str, tuple[bool, str | None]],
) -> tuple[bool, str | None]:
    if not reminder.recurrence_rule_ids:
        return False, None
    cached = rule_cache.get(reminder.id)
    if cached is not None:
        return cached
    try:
        rules = service.recurrence_rules_for(reminder)
    except Exception:  # noqa: BLE001
        rule_cache[reminder.id] = (False, None)
        return rule_cache[reminder.id]
    if not rules:
        rule_cache[reminder.id] = (False, None)
        return rule_cache[reminder.id]
    freq_map = {1: "daily", 2: "weekly", 3: "monthly", 4: "monthly"}
    frequency = int(getattr(rules[0].frequency, "value", rules[0].frequency))
    rule_cache[reminder.id] = (True, freq_map.get(frequency, "daily"))
    return rule_cache[reminder.id]


def reminder_to_event(
    service,
    reminder,
    start: date,
    end: date,
    rule_cache: dict[str, tuple[bool, str | None]],
) -> dict | None:
    if reminder.completed:
        return None

    uid = reminder.id.split("/", 1)[-1] if reminder.id else reminder.title
    description = reminder.desc.strip() if reminder.desc else None

    is_recurring, recurrence = recurrence_from_reminder(service, reminder, rule_cache)
    due_raw = reminder.due_date or reminder.start_date
    undated = due_raw is None

    if undated:
        event_date = None
        start_time = None
    else:
        local = to_local_datetime(due_raw, reminder.time_zone)
        event_date = local.date()
        start_time = None if reminder.all_day else local.strftime("%H:%M")
        if event_date < start or event_date > end:
            return None

    payload: dict = {
        "uid": str(uid),
        "href": str(reminder.id),
        "title": reminder.title or "Erinnerung",
        "description": description,
        "isReminder": True,
        "completed": False,
        "isRecurring": is_recurring,
    }
    if is_recurring and recurrence:
        payload["recurrence"] = recurrence
    if event_date is not None:
        payload["date"] = event_date.isoformat()
    if start_time is not None:
        payload["startTime"] = start_time
    return payload


def ensure_reminders(api):
    try:
        service = api.reminders
        # Kurzer Probe-Aufruf statt veraltetem service.refresh()
        next(iter(service.lists()), None)
        return service
    except AttributeError as exc:
        fail(
            "REMINDERS_API_MISMATCH",
            f"pyicloud-Reminders-API inkompatibel: {exc}. Bitte pyicloud aktualisieren: python -m pip install -U pyicloud tzlocal",
        )
    except Exception as exc:  # noqa: BLE001
        fail("REMINDERS_UNAVAILABLE", f"Apple Reminders nicht verfügbar: {exc}")


def cmd_prepare(args) -> None:
    clear_pending_state(args.cookie_dir)
    api = create_api(args.apple_id, args.password, args.cookie_dir)

    if getattr(api, "requires_2fa", False) or getattr(api, "requires_2sa", False):
        save_pending_state(api, args.cookie_dir)
        fail(
            "TWO_FACTOR_REQUIRED",
            "Code wurde an dein Apple-Gerät gesendet. Gib ihn ein und klicke auf „Code bestätigen“.",
            exit_code=2,
        )

    clear_pending_state(args.cookie_dir)
    ensure_reminders(api)
    emit({"ok": True, "message": "Verbindung zu Apple Reminders OK."})


def cmd_complete(args) -> None:
    api = restore_pending_api(args.apple_id, args.password, args.cookie_dir)
    if api is None:
        fail(
            "NO_PENDING_SESSION",
            "Keine ausstehende Anmeldung. Klicke zuerst auf „Anmelden“ und warte auf den Code.",
        )

    validate_two_factor(api, args.two_factor_code)
    clear_pending_state(args.cookie_dir)
    emit({
        "ok": True,
        "message": "Zwei-Faktor-Anmeldung erfolgreich. Jetzt „Listen laden“ klicken.",
    })


def connect_logged_in(apple_id: str, password: str, cookie_dir: str, two_factor: str | None):
    if pending_path(cookie_dir).exists():
        fail(
            "TWO_FACTOR_PENDING",
            "Zwei-Faktor-Code ausstehend. Bitte „Code bestätigen“ klicken.",
        )

    api = create_api(apple_id, password, cookie_dir)

    if getattr(api, "requires_2fa", False) or getattr(api, "requires_2sa", False):
        if two_factor and two_factor.strip():
            validate_two_factor(api, two_factor)
        else:
            save_pending_state(api, cookie_dir)
            fail(
                "TWO_FACTOR_REQUIRED",
                "Zwei-Faktor-Code erforderlich. Zuerst „Anmelden“, dann „Code bestätigen“.",
                exit_code=2,
            )

    ensure_reminders(api)
    return api


def cmd_test(args) -> None:
    if args.two_factor_code and args.two_factor_code.strip():
        cmd_complete(args)
        return
    if pending_path(args.cookie_dir).exists():
        fail(
            "TWO_FACTOR_PENDING",
            "Ein Code wurde bereits angefordert. Gib ihn ein und klicke auf „Code bestätigen“.",
        )
    cmd_prepare(args)


def cmd_discover(args) -> None:
    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)
    lists = [{"guid": lst.id, "name": lst.title} for lst in service.lists()]
    emit({"ok": True, "lists": lists})


def parse_list_guids(raw: str) -> list[str]:
    raw = raw.strip()
    if not raw:
        return []
    if raw.startswith("["):
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            fail("INVALID_LIST_GUIDS", "list_guids muss ein JSON-Array sein.")
        return [str(item).strip() for item in parsed if str(item).strip()]
    return [part.strip() for part in raw.split(",") if part.strip()]


def fetch_list_events(service, list_guid: str, start: date, end: date) -> tuple[list[dict], dict[str, bool]]:
    rule_cache: dict[str, tuple[bool, str | None]] = {}
    raw_reminders = fetch_reminders_for_list(service, list_guid)
    reminders: list[dict] = []
    completion_by_href: dict[str, bool] = {}
    for reminder in raw_reminders:
        href = str(reminder.id)
        completion_by_href[href] = bool(reminder.completed)
        event = reminder_to_event(service, reminder, start, end, rule_cache)
        if event:
            reminders.append(event)
    return reminders, completion_by_href


def cmd_fetch(args) -> None:
    if not args.list_guid:
        fail("MISSING_LIST", "list_guid fehlt.")
    if not args.start or not args.end:
        fail("MISSING_RANGE", "start/end fehlt.")

    start = parse_iso_date(args.start)
    end = parse_iso_date(args.end)
    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)
    reminders, completion_by_href = fetch_list_events(service, args.list_guid, start, end)
    emit({"ok": True, "reminders": reminders, "completionByHref": completion_by_href})


def cmd_fetch_all(args) -> None:
    list_guids = parse_list_guids(args.list_guids)
    if not list_guids:
        fail("MISSING_LISTS", "list_guids fehlt.")
    if not args.start or not args.end:
        fail("MISSING_RANGE", "start/end fehlt.")

    start = parse_iso_date(args.start)
    end = parse_iso_date(args.end)
    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)

    list_results = []
    for list_guid in list_guids:
        try:
            reminders, completion_by_href = fetch_list_events(service, list_guid, start, end)
            list_results.append({
                "listGuid": list_guid,
                "reminders": reminders,
                "completionByHref": completion_by_href,
            })
        except Exception as exc:  # noqa: BLE001
            list_results.append({"listGuid": list_guid, "error": str(exc).strip() or exc.__class__.__name__})

    emit({"ok": True, "listResults": list_results})


def normalize_reminder_id(reminder_href: str) -> str:
    href = reminder_href.strip()
    if href.startswith("Reminder/"):
        return href
    return f"Reminder/{href}"


def find_reminder_for_status(service, reminder_href: str, list_guid: str | None = None):
    reminder_id = normalize_reminder_id(reminder_href)
    try:
        return service.get(reminder_id)
    except LookupError:
        pass
    except Exception:  # noqa: BLE001
        pass

    if not list_guid:
        fail("REMINDER_NOT_FOUND", f"Erinnerung nicht gefunden: {reminder_id}")

    raw_id = reminder_id.split("/", 1)[-1]
    for list_id in list_id_variants(list_guid):
        try:
            result = service.list_reminders(list_id, include_completed=True)
            reminders = getattr(result, "reminders", None) or result
            if not isinstance(reminders, list):
                continue
            for reminder in reminders:
                rid = str(getattr(reminder, "id", ""))
                if rid == reminder_id or rid.endswith(raw_id) or rid.split("/", 1)[-1] == raw_id:
                    return reminder
        except Exception:  # noqa: BLE001
            continue

    fail("REMINDER_NOT_FOUND", f"Erinnerung nicht gefunden: {reminder_id}")


def update_reminder_status_only(service, reminder, completed: bool) -> None:
    """Nur Erledigt-Status ändern – TitleDocument/NotesDocument unangetastet lassen."""
    import time

    from pyicloud.services.reminders._protocol import _generate_resolution_token_map

    reminder_id = normalize_reminder_id(str(reminder.id))
    try:
        fresh = service.get(reminder_id)
        reminder.record_change_tag = fresh.record_change_tag
    except Exception:  # noqa: BLE001
        pass

    writes = service._writes
    reminder_record_name = writes._reminder_record_name(reminder.id)
    now_ms = int(time.time() * 1000)
    completion_date_ms = now_ms if completed else None

    fields_mod = ["completed", "completionDate", "lastModifiedDate"]
    fields = {
        "Completed": {"type": "INT64", "value": 1 if completed else 0},
        "CompletionDate": {"type": "TIMESTAMP", "value": completion_date_ms},
        "LastModifiedDate": {"type": "TIMESTAMP", "value": now_ms},
        "ResolutionTokenMap": {"type": "STRING", "value": _generate_resolution_token_map(fields_mod)},
    }

    writes._submit_single_record_update(
        operation_name="Update reminder status",
        record_name=reminder_record_name,
        record_type="Reminder",
        record_change_tag=reminder.record_change_tag,
        fields=fields,
        model_obj=reminder,
    )
    reminder.completed = completed
    reminder.completed_date = (
        datetime.fromtimestamp(now_ms / 1000.0, tz=timezone.utc) if completed else None
    )


def cmd_set_reminder_status(args) -> None:
    if not args.reminder_href:
        fail("MISSING_REMINDER", "reminder_href fehlt.")

    completed = (args.completed or "true").strip().lower() in ("true", "1", "yes")

    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)
    reminder = find_reminder_for_status(
        service,
        args.reminder_href,
        args.list_guid or None,
    )
    update_reminder_status_only(service, reminder, completed)

    fresh = find_reminder_for_status(
        service,
        args.reminder_href,
        args.list_guid or None,
    )
    if fresh.completed != completed:
        fail(
            "STATUS_MISMATCH",
            "Erinnerungsstatus konnte in iCloud nicht aktualisiert werden.",
        )

    message = "Erinnerung in iCloud abgehakt." if completed else "Erinnerung in iCloud wieder geöffnet."
    emit({"ok": True, "message": message})


def cmd_complete_reminder(args) -> None:
    args.completed = "true"
    cmd_set_reminder_status(args)


def parse_due_datetime(date_str: str | None, time_str: str | None) -> datetime | None:
    if not date_str:
        return None
    local_date = parse_iso_date(date_str)
    if time_str and time_str.strip():
        hours, minutes = map(int, time_str.strip().split(":")[:2])
        local = datetime(
            local_date.year,
            local_date.month,
            local_date.day,
            hours,
            minutes,
            tzinfo=DEFAULT_TZ,
        )
    else:
        local = datetime(
            local_date.year,
            local_date.month,
            local_date.day,
            9,
            0,
            tzinfo=DEFAULT_TZ,
        )
    return local.astimezone(timezone.utc)


def cmd_create_reminder(args) -> None:
    if not args.list_guid:
        fail("MISSING_LIST", "list_guid fehlt.")
    if not args.title or not args.title.strip():
        fail("MISSING_TITLE", "title fehlt.")

    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)
    list_id = normalize_list_id(args.list_guid)
    due_date = parse_due_datetime(args.due_date or None, args.due_time or None)

    try:
        created = service.create(
            list_id,
            args.title.strip(),
            (args.description or "").strip(),
            due_date=due_date,
        )
    except TypeError:
        created = service.create(
            list_id=list_id,
            title=args.title.strip(),
            desc=(args.description or "").strip(),
            due_date=due_date,
        )

    reminder_id = str(getattr(created, "id", created))
    uid = reminder_id.split("/", 1)[-1] if reminder_id else args.title.strip()
    emit({
        "ok": True,
        "reminder": {
            "uid": uid,
            "href": reminder_id,
            "title": args.title.strip(),
        },
    })


def create_single_reminder(service, list_id, title, description, due_date):
    try:
        created = service.create(
            list_id,
            title.strip(),
            (description or "").strip(),
            due_date=due_date,
        )
    except TypeError:
        created = service.create(
            list_id=list_id,
            title=title.strip(),
            desc=(description or "").strip(),
            due_date=due_date,
        )
    reminder_id = str(getattr(created, "id", created))
    uid = reminder_id.split("/", 1)[-1] if reminder_id else title.strip()
    return {"uid": uid, "href": reminder_id, "title": title.strip()}


def cmd_create_reminder_group(args) -> None:
    if not args.list_guid:
        fail("MISSING_LIST", "list_guid fehlt.")
    if not args.title or not args.title.strip():
        fail("MISSING_TITLE", "title fehlt.")

    try:
        subtasks_raw = json.loads(args.subtasks or "[]")
    except json.JSONDecodeError:
        fail("INVALID_SUBTASKS", "subtasks muss gültiges JSON sein.")

    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)
    list_id = normalize_list_id(args.list_guid)
    due_date = parse_due_datetime(args.due_date or None, args.due_time or None)

    subtask_lines = []
    for item in subtasks_raw:
        if isinstance(item, dict) and item.get("title"):
            subtask_lines.append(f"☐ {item['title'].strip()}")

    desc_parts = []
    if (args.description or "").strip():
        desc_parts.append(args.description.strip())
    if subtask_lines:
        desc_parts.append("Unteraufgaben:\n" + "\n".join(subtask_lines))
    combined_desc = "\n\n".join(desc_parts)

    parent = create_single_reminder(
        service,
        list_id,
        args.title.strip(),
        combined_desc,
        due_date,
    )

    subtask_hrefs = {}
    for item in subtasks_raw:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key", "")).strip()
        title = str(item.get("title", "")).strip()
        if not key or not title:
            continue
        child = create_single_reminder(
            service,
            list_id,
            f"↳ {title}",
            f"Teil von: {args.title.strip()}",
            due_date,
        )
        subtask_hrefs[key] = child["href"]

    emit({
        "ok": True,
        "reminder": parent,
        "subtaskHrefs": subtask_hrefs,
    })


def cmd_delete_reminder(args) -> None:
    if not args.reminder_href:
        fail("MISSING_REMINDER", "reminder_href fehlt.")

    api = connect_logged_in(
        args.apple_id,
        args.password,
        args.cookie_dir,
        args.two_factor_code or None,
    )
    service = ensure_reminders(api)
    reminder = find_reminder_for_status(
        service,
        args.reminder_href,
        args.list_guid or None,
    )
    service.delete(reminder)
    emit({"ok": True, "message": "Erinnerung in iCloud gelöscht."})


def run_command(args) -> None:
    if args.command == "test":
        cmd_test(args)
    elif args.command == "prepare":
        cmd_prepare(args)
    elif args.command == "complete":
        cmd_complete(args)
    elif args.command == "discover":
        cmd_discover(args)
    elif args.command == "fetch":
        cmd_fetch(args)
    elif args.command == "fetch-all":
        cmd_fetch_all(args)
    elif args.command == "complete-reminder":
        cmd_complete_reminder(args)
    elif args.command == "set-reminder-status":
        cmd_set_reminder_status(args)
    elif args.command == "create-reminder":
        cmd_create_reminder(args)
    elif args.command == "create-reminder-group":
        cmd_create_reminder_group(args)
    elif args.command == "delete-reminder":
        cmd_delete_reminder(args)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["test", "prepare", "complete", "discover", "fetch", "fetch-all", "complete-reminder", "set-reminder-status", "create-reminder", "create-reminder-group", "delete-reminder"])
    parser.add_argument("--apple-id", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--two-factor-code", default="")
    parser.add_argument("--cookie-dir", required=True)
    parser.add_argument("--list-guid", default="")
    parser.add_argument("--list-guids", default="")
    parser.add_argument("--start", default="")
    parser.add_argument("--end", default="")
    parser.add_argument("--reminder-href", default="")
    parser.add_argument("--completed", default="true")
    parser.add_argument("--title", default="")
    parser.add_argument("--description", default="")
    parser.add_argument("--due-date", default="")
    parser.add_argument("--due-time", default="")
    parser.add_argument("--subtasks", default="")
    args = parser.parse_args()

    try:
        run_command(args)
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        detail = str(exc).strip() or exc.__class__.__name__
        fail("BRIDGE_CRASH", detail)
    except BaseException as exc:  # pragma: no cover
        fail("BRIDGE_CRASH", str(exc))


if __name__ == "__main__":
    main()
