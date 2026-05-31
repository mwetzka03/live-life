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

### Entwickeln

```powershell
cd C:\Users\mawet\live-life
npm install
npm run dev:win
```

Alternativ nur im Browser (ohne Tauri-Fenster):

```powershell
npm run dev
```

### Release-EXE bauen

```powershell
npm run build:win
```

Die EXE liegt danach unter `release/LiveLife.exe`.

### Architektur

```
src/domain/models/       – Datenmodelle
src/domain/repositories/ – LocalStorage-Persistenz
src/domain/services/     – Geschäftslogik (Calendar, Challenge, Coin, Shop)
src/components/          – UI-Komponenten
src/pages/               – Seiten
```
