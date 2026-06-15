## Live Life

A local-first desktop app (Tauri 2 + React) for gamifying everyday life: calendar, challenges, coins, shop, and vision board.

### Highlights (v0.2.5)

- **Challenge groups** – bundle one-time sub-challenges with shared icon/color, 2× card width, total coin display, detail view, and dissolve-into-singles (challenges are kept)
- **Challenge views** – filter active/completed lists by All / Groups / Single; fit-grid pagination with weighted column spans (groups count as 2 columns, max 5 columns)
- **Optional dates for one-time challenges** – date and time inputs are optional; undated one-time tasks stay in the challenge list without appearing on the calendar until a date is set
- **Completion date prompt** – when completing a task scheduled for another day (from the calendar, dashboard, groups, or synced events), choose whether it counts for **today** or the **planned date**
- **Undo in groups & dashboard** – revert completed sub-challenges from group cards, group detail, and “Completed challenges today”
- **Collapsible dashboard sections** – reminder suggestions, completed challenges today, and scheduled rewards collapse by default (show count + coins when collapsed); 5 items per page
- **Sync UX** – blocking startup sync (splash), full-screen overlay for manual sync, orange outbox bar with Upload / Full sync when local changes are pending; no sync-on-close
- **Instant local actions** – complete, save, and assign use the outbox pattern without blocking overlays
- **Shop grid** – larger cards (min 340×200 px), max 4 per row
- **Dark mode fixes** – challenge chip and dashboard text use theme foreground colors; group icon/color inherited on calendar and dashboard

### Core features

- **Calendar** – day, week, and month views with timed/untimed layout
- **CalDAV sync** – iCloud, Google, Outlook, and other providers (Settings)
- **Apple Reminders (beta)** – pull suggestions, link recurring series, per-challenge iCloud reminders for groups
- **Challenges** – one-time or recurring, streak multipliers, coin rewards, reminder suggestions with pagination
- **Shop & wallet** – spend earned coins on rewards; transaction history
- **Vision board** – bucket list items with straight/rounded arrows (docked or free)
- **Dark/light mode** and responsive fit-to-viewport layouts
- **100 % local** – data in `localStorage`; optional sync queues in outbox storage

---

## For users (recommended)

1. Open [Releases](https://github.com/mwetzka03/live-life/releases)
2. Download **`Live Life_*_x64-setup.exe`**
3. Run the installer → launch from the Start menu

No Node, Rust, or Git required.

**Apple Reminders (beta):** Python and pyicloud are installed **automatically** (silently in the background):

- during **NSIS setup** (post-install step)
- on **first app start** (splash: “Preparing Apple Reminders…”)

You may need to confirm a one-time **UAC / winget** dialog on Windows.

Log file if something fails: `%LOCALAPPDATA%\live-life\reminders-setup.log`

---

## One-click start from source (Windows)

Clone or unzip the repo, then double-click:

```
Start-LiveLife.vbs
```

(Or `Start-LiveLife.cmd` – shows a console window.)

First run (about 10–20 minutes):

- installs missing tools via **winget** (Node.js, Python, Rust – with confirmation)
- `npm install`
- `pip install pyicloud tzlocal` (Apple Reminders)
- builds and launches the desktop app

Later runs use `release\LiveLife.exe` when present.

Check dependencies only:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-deps.ps1
```

Build a local release installer:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-app.ps1 -BuildOnly
```

Output: `src-tauri\target\release\bundle\nsis\`

---

## Development

```powershell
npm install
npm run dev:win
```

Browser-only (no Tauri / CalDAV):

```powershell
npm run dev
```

Production build:

```powershell
npm run build
npm run build:app
```

### Publish a GitHub release

Push a version tag – GitHub Actions builds the Windows NSIS installer and attaches it to the release:

```powershell
git tag v0.2.5
git push origin v0.2.5
```

Workflow: `.github/workflows/release.yml` (triggered on `v*` tags).

### Architecture

```
src/domain/models/       – data models
src/domain/repositories/ – localStorage persistence
src/domain/services/     – business logic (calendar, challenges, coins, shop, sync)
src/components/          – UI components
src/pages/               – route pages
src/lib/                 – sync outbox, manual sync, challenge completion flow
```

### Sync behaviour (v0.2.5)

| Action | Behaviour |
|--------|-----------|
| App start | Splash → flush outbox + pull remote → UI |
| Manual sync (outbox empty) | Top-bar refresh with full-screen loading overlay |
| Pending outbox | Orange bar: **Upload** (push only) or **Full sync** (push + pull) |
| Local challenge/event edits | Instant UI update + outbox queue |
| App close | Normal close (no end-sync) |
