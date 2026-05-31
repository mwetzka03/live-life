## Live Life

Lokale Desktop-App (Tauri + React) zur Gamification des Alltags: Kalender, Challenges, Coins und Shop.

### Features
- **Kalender** mit Tag-, Wochen- und Monatsansicht
- **CalDAV-Sync** mit iCloud, Google, Outlook & anderen Anbietern (Einstellungen)
- **Termine** anlegen, bearbeiten und löschen
- **Challenges** (einmalig oder wiederkehrend) mit Coin-Belohnung
- **Coin-Konto** mit Transaktionshistorie
- **Shop** für Belohnungen mit Coins
- **Dark/Light Mode** und adaptive UI
- **100 % lokal** – Daten in `localStorage`

---

## Für Nutzer (empfohlen)

1. Öffne [Releases](https://github.com/mwetzka03/live-life/releases)
2. Lade **`Live Life_*_x64-setup.exe`** herunter
3. Installer starten → App aus dem Startmenü öffnen

Kein Node, kein Rust, kein Git nötig.

**Apple Reminders (Beta):** Python + pyicloud werden **automatisch** installiert (still im Hintergrund):
- beim **Setup-Installer** (NSIS, nach der Installation)
- beim **ersten App-Start** (Splash: „Apple Reminders wird vorbereitet…“)

Keine Konsoleneingabe nötig. Einmalig ggf. **UAC-/winget-Dialog** von Windows bestätigen.

Log bei Problemen: `%LOCALAPPDATA%\live-life\reminders-setup.log`

---

## Ein-Klick-Start aus dem Quellcode (Windows)

Repo klonen oder ZIP entpacken, dann **eine Datei** doppelklicken:

```
Start-LiveLife.vbs
```

(Alternativ `Start-LiveLife.cmd` – zeigt ein Konsolenfenster.)

Das Skript (beim ersten Mal, ca. 10–20 Min.):

- installiert fehlende Tools per **winget** (Node.js, Python, Rust – mit Bestätigung)
- `npm install`
- `pip install pyicloud tzlocal` (Apple Reminders)
- baut die Desktop-App und startet sie

Weitere Starts: direkt die gebaute App, wenn `release\LiveLife.exe` existiert.

Nur Abhängigkeiten prüfen:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-deps.ps1
```

Release-Installer lokal bauen:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-app.ps1 -BuildOnly
```

Installer liegt unter `src-tauri\target\release\bundle\nsis\`.

---

## Entwickeln

```powershell
npm install
npm run dev:win
```

Alternativ nur im Browser (ohne Tauri/CalDAV):

```powershell
npm run dev
```

### Release auf GitHub veröffentlichen

```powershell
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions baut automatisch den Windows-Installer und hängt ihn ans Release.

### Architektur

```
src/domain/models/       – Datenmodelle
src/domain/repositories/ – LocalStorage-Persistenz
src/domain/services/     – Geschäftslogik (Calendar, Challenge, Coin, Shop)
src/components/          – UI-Komponenten
src/pages/               – Seiten
```
