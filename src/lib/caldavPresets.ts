import type { CalDavProvider } from '../domain/models/AppData';

export interface CalDavProviderPreset {
  id: CalDavProvider;
  label: string;
  serverUrl: string;
  hint: string;
  usernameLabel: string;
}

export const CALDAV_PRESETS: CalDavProviderPreset[] = [
  {
    id: 'icloud',
    label: 'iCloud',
    serverUrl: 'https://caldav.icloud.com/',
    hint: 'Apple-ID als Benutzername und ein app-spezifisches Passwort (appleid.apple.com → Anmelden & Sicherheit).',
    usernameLabel: 'Apple-ID (E-Mail)',
  },
  {
    id: 'google',
    label: 'Google Kalender',
    serverUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
    hint: 'Google-Konto mit app-spezifischem Passwort (Google-Konto → Sicherheit → 2FA → App-Passwörter).',
    usernameLabel: 'Google-E-Mail',
  },
  {
    id: 'outlook',
    label: 'Outlook / Microsoft 365',
    serverUrl: 'https://outlook.office365.com/',
    hint: 'CalDAV für Outlook-Konten. Ggf. app-spezifisches Passwort oder CalDAV-URL aus den Kontoeinstellungen.',
    usernameLabel: 'Microsoft-E-Mail',
  },
  {
    id: 'custom',
    label: 'Anderer CalDAV-Server',
    serverUrl: '',
    hint: 'CalDAV-URL deines Anbieters (z. B. Nextcloud, Fastmail, SOGo).',
    usernameLabel: 'Benutzername',
  },
];

export function getPreset(provider: CalDavProvider): CalDavProviderPreset {
  return CALDAV_PRESETS.find((p) => p.id === provider) ?? CALDAV_PRESETS[3];
}
