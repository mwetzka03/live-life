export const de = {
  common: {
    coins: 'Münzen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    close: 'Schließen',
    later: 'Später',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    sync: 'Sync',
    active: 'Aktiv',
    autoSync: 'Auto-Sync',
    all: 'Alle',
    none: 'Keine',
    beta: 'Beta',
    today: 'Heute',
    title: 'Titel',
    description: 'Beschreibung',
    icon: 'Icon',
    color: 'Farbe',
    optional: 'Optional',
    preview: 'Vorschau',
    selectPlaceholder: '— auswählen —',
    noneOption: '— keine —',
    syncFailed: 'Sync fehlgeschlagen',
    saveFailed: 'Speichern fehlgeschlagen',
    connectionFailed: 'Verbindung fehlgeschlagen',
    action: 'Aktion',
    details: 'Details',
    showDetails: 'Details anzeigen',
    recurring: 'Wiederkehrend',
    off: 'Aus',
    on: 'An',
  },

  brand: {
    name: 'Live Life',
    tagline: 'Level up your day!',
  },

  nav: {
    calendar: 'Kalender',
    challenges: 'Challenges',
    bucketlist: 'Bucketlist',
    shop: 'Shop',
    wallet: '{{balance}} Münzen',
    settings: 'Einstellungen',
    settingsAria: 'Einstellungen öffnen',
    themeToggle: 'Theme wechseln',
  },

  labels: {
    categories: {
      health: 'Gesundheit',
      habit: 'Gewohnheit',
      sport: 'Sport',
      todo: 'To-Do',
      other: 'Sonstiges',
    },
    recurrence: {
      none: 'Einmalig',
      irregular: 'Unregelmäßig',
      daily: 'Täglich',
      weekly: 'Wöchentlich',
      monthly: 'Monatlich',
    },
    weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    monthWeekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  },

  help: {
    calendar:
      'Termine aus CalDAV-Kalendern (read-only) und deine manuellen Einträge. Challenges erscheinen hier als abhakbare Chips.',
    calendarSync:
      'CalDAV importiert Termine von iCloud, Google etc. Änderungen in Live Life werden nicht zurückgeschrieben.',
    challenges:
      'Wiederkehrende oder einmalige Aufgaben mit Coin-Belohnung. Streaks erhöhen den Multiplikator alle 5 Tage.',
    challengeSuggestions:
      'Offene Apple-Erinnerungen aus aktivierten Listen. Übernommene oder abgelehnte Vorschläge verschwinden hier.',
    challengeICloud:
      'Einmalige Challenges können als iCloud-Erinnerung angelegt werden. Abhaken syncet in beide Richtungen.',
    bucketlist:
      'Langfristige Wünsche und Ziele ohne Coin-Mechanik – optional mit Zieljahr sortiert.',
    shop: 'Belohne dich mit gesammelten Münzen. Artikel können Links zu Webseiten enthalten.',
    wallet:
      'Übersicht aller Münzen-Transaktionen – verdient durch Challenges, ausgegeben im Shop.',
    settings:
      'Verbinde Kalender und Apple Reminders. Zugangsdaten bleiben lokal auf deinem Rechner.',
    calDav:
      'Standard-Kalenderprotokoll für Termine. Wähle nach dem Verbinden die zu importierenden Kalender.',
    appleReminders:
      'Native Apple-Erinnerungen über iCloud (Beta, nur Desktop). Getrennt von CalDAV-Erinnerungs-Kalendern.',
    appleRemindersLists:
      'Nur aktivierte Listen werden synchronisiert. Vorschläge und Kalenderimport nutzen diese Daten.',
    autoSync:
      'Beim App-Start und im Hintergrund werden aktivierte Konten automatisch synchronisiert.',
    devLog:
      'Technisches Protokoll für Sync und Aktionen. Per Klick aufklappen – hilfreich bei Fehlern.',
    coins:
      'Münzen verdienst du durch erledigte Challenges. Streak-Bonus: +0,5× alle 5 Tage (max. ×5).',
  },

  calendar: {
    title: 'Kalender',
    subtitle: 'Termine & Challenges im Überblick',
    viewDay: 'Tag',
    viewWeek: 'Woche',
    viewMonth: 'Monat',
    addEvent: 'Termin',
    todayLabel: 'Heute',
    emptyDay: 'Keine Einträge',
    emptyWeek: '—',
    todayChallenges: 'Challenges heute',
    todayProgress: '{{done}}/{{total}} erledigt',
    scheduledRewards: 'Geplante Belohnungen',
    rewardsEnough: 'Du hast genug Münzen ({{balance}}) für alle {{count}} offenen Belohnungen.',
    rewardsShort:
      'Noch {{shortfall}} Münzen bis alle {{count}} Belohnungen ({{total}} Münzen gesamt).',
    rewardClaimed: 'Eingelöst',
    rewardReady: '{{price}} · bereit',
    rewardNeedMore: 'noch {{shortfall}} Münzen',
    eventModal: {
      syncedTitle: 'Synchronisierter Termin',
      editTitle: 'Termin bearbeiten',
      newTitle: 'Neuer Termin',
      readOnlyHint:
        'Dieser Termin stammt aus einem externen Kalender und kann hier nur angesehen werden.',
      titlePlaceholder: 'Meeting, Arzt, …',
      descriptionPlaceholder: 'Optional',
      date: 'Datum',
      from: 'Von',
      to: 'Bis',
      reminderHint:
        'Apple-Erinnerung – unter Challenges als Vorschlag übernehmen und Münzen zuweisen.',
    },
    challengeAssign: {
      title: 'Challenge zuweisen',
      recurring: 'Wiederkehrender Termin',
      hint: 'Verknüpfe diesen Termin mit einer Challenge, die du an diesem Tag noch nicht abgehakt hast.',
      recurringHint: ' Bei Serien wird die gesamte Wiederholung verknüpft.',
      doneOnDay: ' · an diesem Tag bereits erledigt',
      tapToComplete: ' · im Kalender antippen zum Abhaken',
      remove: 'Entfernen',
      existing: 'Bestehende Challenge',
      assign: 'Zuweisen',
      noOpen: 'Keine offenen Challenges für diesen Tag – lege eine neue an.',
      createNew: 'Neue Challenge anlegen',
      category: 'Kategorie',
      recurrence: 'Wiederholung',
      createAssign: 'Anlegen & zuweisen',
    },
    shopAssign: {
      title: 'Shop-Belohnung zuweisen',
      recurring: 'Wiederkehrender Termin – die gesamte Serie wird verknüpft.',
      hint: 'Beim Abhaken wird die Belohnung automatisch mit Münzen eingelöst. Artikel können mehrfach verschiedenen Terminen zugewiesen werden.',
      priceCoins: ' · {{price}} Münzen',
      alreadyClaimed: ' · bereits eingelöst',
      needMore: ' · noch {{shortfall}} Münzen nötig',
      tapToRedeem: ' · im Kalender antippen zum Einlösen',
      remove: 'Entfernen',
      existing: 'Bestehende Belohnung',
      assign: 'Zuweisen',
      createNew: 'Neue Belohnung anlegen',
      descriptionOptional: 'Beschreibung (optional)',
      priceLabel: 'Preis in Münzen',
      createAssign: 'Anlegen & zuweisen',
    },
  },

  challenges: {
    title: 'Challenges',
    subtitle: 'Erledige Aufgaben und sammle Münzen',
    add: 'Challenge',
    tabActive: 'Aktive Challenges',
    tabCompleted: 'Abgeschlossene Challenges',
    emptyCompleted: 'Noch keine abgeschlossenen einmaligen Challenges.',
    emptyActive: 'Noch keine aktiven Challenges – leg los!',
    coinsReward: '+{{amount}} Münzen',
    coinsEarned: '+{{amount}} Münzen erhalten',
    doneOn: 'Erledigt am {{date}}',
    streak: 'Streak: {{count}}',
    timesDone: '{{count}}× erledigt',
    reset: 'Zurücksetzen',
    completeToday: 'Heute ✓',
    modal: {
      editTitle: 'Challenge bearbeiten',
      newTitle: 'Neue Challenge',
      titlePlaceholder: 'Rauchfrei, Sport, Gesichtspflege…',
      category: 'Kategorie',
      coinsPerCompletion: 'Münzen pro Erledigung',
      recurrence: 'Wiederholung',
      date: 'Datum',
      start: 'Start',
      endOptional: 'Ende (optional)',
      streakTarget: 'Streak-Ziel (Tage)',
      streakPlaceholder: 'z. B. 30',
      timeFrom: 'Uhrzeit von (optional)',
      timeTo: 'Uhrzeit bis (optional)',
      appleReminder: 'Apple-Erinnerung (optional)',
      irregularHint:
        'Unregelmäßig: jederzeit abhakbar, beliebig oft – unabhängig vom Datum.',
      icloudOnceOnly: 'iCloud-Erinnerungen sind nur für einmalige Challenges verfügbar.',
      icloudNoEndTime:
        'Apple Reminders unterstützt keine Endzeit – nur Startdatum und optional Startuhrzeit.',
      icloudDelay:
        'Neue iCloud-Erinnerungen können einige Minuten brauchen, bis sie in der Apple-Reminders-App sichtbar sind.',
      icloudDeleteLinked:
        'Beim Löschen der Challenge wird die verknüpfte iCloud-Erinnerung ebenfalls gelöscht.',
      noListsCache:
        'Keine Listen im Cache – bitte in den Einstellungen Apple Reminders synchronisieren.',
      needAppleAccount:
        'Für iCloud-Erinnerungen zuerst ein Apple-Reminders-Konto in den Einstellungen anlegen.',
      icloudLinked: 'Mit iCloud-Erinnerung verknüpft – Abhaken syncet in beide Richtungen.',
      streakBonus:
        'Streak-Bonus: alle 5 Tage Streak +0,5× Münzen (max. ×5). Bei 50 Münzen und 5-Tage-Streak: 75 Münzen.',
    },
    suggestions: {
      title: 'Vorschläge aus Erinnerungen',
      openCount: '{{shown}} von {{total}} offen',
      dismiss: 'Ablehnen',
      accept: 'Übernehmen',
      acceptModalTitle: 'Erinnerung als Challenge übernehmen',
      acceptHint:
        'Vorschlag aus Apple-Erinnerungen – lege Münzen, Wiederholung und Details fest.',
      seriesLinked: ' Die gesamte Serie wird verknüpft.',
      startDate: 'Startdatum',
      timeOptional: 'Uhrzeit (optional)',
      dueOn: 'Fällig am {{date}}',
      takenFromReminder: ' – wird aus der Erinnerung übernommen.',
      icloudSyncHint:
        'Datum und Uhrzeit werden bei Änderungen in iCloud automatisch mit synchronisiert.',
      fromReminder: 'Aus Erinnerung übernommen: {{recurrence}}',
      createChallenge: 'Challenge anlegen',
    },
  },

  shop: {
    title: 'Shop',
    subtitle: 'Belohne dich selbst mit gesammelten Münzen',
    balanceAvailable: '{{balance}} Münzen verfügbar',
    addItem: 'Artikel',
    empty: 'Shop ist leer – füge Belohnungen hinzu!',
    priceCoins: '{{price}} Münzen',
    openLink: 'Link öffnen',
    buy: 'Kaufen',
    purchased: '„{{title}}" gekauft! 🎉',
    notEnoughCoins: 'Nicht genug Münzen!',
    modal: {
      editTitle: 'Artikel bearbeiten',
      newTitle: 'Neuer Shop-Artikel',
      titlePlaceholder: 'Kino, Snack, Spieleabend…',
      linkOptional: 'Link (optional)',
      linkPlaceholder: 'https://…',
      linkHint: 'Optionaler Internetlink – z. B. Shop, Streaming oder Ticketseite.',
      priceLabel: 'Preis (Münzen)',
    },
  },

  wallet: {
    title: 'Münzen-Konto',
    subtitle: 'Dein Fortschritt auf einen Blick',
    currentBalance: 'Aktueller Stand',
    earned: 'Verdient',
    spent: 'Ausgegeben',
    purchases: 'Käufe',
    transactions: 'Transaktionen',
    noTransactions: 'Noch keine Bewegungen',
    purchasesSection: 'Einkäufe',
    noPurchases: 'Noch keine Käufe',
    txChallenge: 'Challenge: {{title}}',
    txChallengeICloud: 'Challenge (iCloud): {{title}}',
    txChallengeUnknown: 'Challenge: Unbekannt',
    txShop: 'Shop: {{title}}',
    txReward: 'Belohnung: {{title}}',
  },

  bucketlist: {
    title: 'Bucketlist',
    subtitle: 'Träume und Ziele – unabhängig vom Kalender und iCloud',
    add: 'Eintrag',
    filterAll: 'Alle',
    unknownTime: 'Unbekannte Zeit',
    empty: 'Noch keine Bucketlist-Einträge – leg los!',
    doneOn: 'Erledigt {{date}}',
    open: 'Offen',
    done: 'Erledigt',
    modal: {
      editTitle: 'Eintrag bearbeiten',
      newTitle: 'Neuer Bucketlist-Eintrag',
      titlePlaceholder: 'Reise, Projekt, Erlebnis…',
      period: 'Zeitraum',
      specificYear: 'Bestimmtes Jahr',
      year: 'Jahr',
    },
  },

  settings: {
    title: 'Einstellungen',
    subtitle: 'CalDAV-Kalender und Apple Reminders (Beta) verbinden',
    addAccount: 'Konto hinzufügen',
    intro: {
      title: 'Kurzanleitung',
      desc: 'Live Life synchronisiert Termine und Erinnerungen von externen Quellen. Deine Challenges, Münzen und Shop-Einträge bleiben lokal – nur der Sync nutzt deine Zugangsdaten auf diesem Rechner.',
      caldav:
        'CalDAV importiert Termine (Google, iCloud-Kalender, Nextcloud …). Termine sind im Kalender read-only.',
      appleReminders:
        'Apple Reminders (Beta) sind echte iCloud-Erinnerungen – getrennt von CalDAV. Apple-ID, Passwort und ggf. Zwei-Faktor-Code nötig.',
      suggestions:
        'Unter Challenges → Vorschläge erscheinen offene Erinnerungen aus aktivierten Listen. Bereits übernommene tauchen nicht erneut auf.',
      autoSync:
        'Auto-Sync beim Start und im Hintergrund – Details im Developer Log bei Ladeanimationen (aufklappbar).',
    },
    desktopOnly:
      'Kalender-Sync funktioniert nur in der Desktop-App (npm run dev:win), nicht im Browser.',
    caldav: {
      title: 'CalDAV-Konten',
      desc: 'Termine werden importiert (read-only im Kalender). Nach dem Verbinden wählst du die Kalender pro Konto. Zugangsdaten werden nur lokal gespeichert.',
      empty: 'Noch kein Kalender verbunden',
      remindersSuffix: ' · Erinnerungen',
      lastSync: 'Zuletzt: {{datetime}}',
      neverSynced: 'Noch nie synchronisiert',
      syncAll: 'Alle synchronisieren',
      editAccountTitle: 'Konto bearbeiten',
    },
    guide: {
      title: 'Anleitung',
      icloudPassword:
        'CalDAV / iCloud: App-spezifisches Passwort unter appleid.apple.com → Anmelden & Sicherheit.',
      google:
        'Google CalDAV: 2FA aktivieren und App-Passwort in den Google-Kontoeinstellungen erstellen.',
      setup:
        'CalDAV: Konto hinzufügen → Verbindung testen → Kalender & Import-Typ wählen → Speichern & Sync.',
      appleReminders:
        'Apple Reminders (Beta): Separates Konto mit Apple-ID + Passwort + ggf. 2FA. Notizen werden mitimportiert; ohne Fälligkeitsdatum erscheinen Erinnerungen ohne Datum.',
    },
    language: {
      title: 'Sprache',
      desc: 'Oberflächensprache der App. Deine Daten und Sync-Konten bleiben unverändert.',
    },
    appearance: {
      title: 'Erscheinungsbild',
      desc: 'Helles oder dunkles Farbschema der App.',
      light: 'Hell',
      dark: 'Dunkel',
    },
    developerMode: {
      title: 'Developer-Modus',
      desc: 'Zeigt das Developer Log bei Ladeanimationen und hier in den Einstellungen.',
      enabled: 'Developer Log anzeigen',
    },
    sync: {
      okFull: 'Sync OK: {{imported}} neu, {{updated}} aktualisiert, {{removed}} entfernt',
      okSkipped: 'Sync OK: {{imported}} neu, {{updated}} aktualisiert. Übersprungen: {{skipped}}',
      allCalendars: 'Alle Kalender synchronisiert.',
      allApple: 'Alle Apple-Reminders-Konten synchronisiert.',
    },
    caldavModal: {
      editTitle: 'CalDAV-Konto bearbeiten',
      addTitle: 'CalDAV-Konto hinzufügen',
      provider: 'Anbieter',
      displayName: 'Anzeigename',
      displayNamePlaceholder: 'z. B. Mein iCloud',
      serverUrl: 'Server-URL',
      serverUrlPlaceholder: 'https://caldav.icloud.com/',
      password: 'Passwort / App-Passwort',
      passwordUnchanged: 'Leer lassen = unverändert',
      testConnection: 'Verbindung testen & Kalender laden',
      pickCalendars: 'Kalender übernehmen',
      pickHint:
        '{{selected}} von {{total}} Kalendern ausgewählt. „To-Do“-Kalender sind oft normale Termine – Import-Typ pro Zeile wählen.',
      mayContainReminders: ' · kann Erinnerungen enthalten',
      importType: 'Import-Typ',
      importEvents: 'Termine',
      importReminders: 'Erinnerungen',
      accountActive: 'Konto aktiv',
      syncOnStart: 'Beim App-Start synchronisieren',
      saveAndSync: 'Speichern & Sync',
      needCredentials: 'Bitte Benutzername und Passwort eingeben.',
      loadingProbe:
        'Kalender werden geladen und auf Inhalte geprüft – kann bei iCloud etwas dauern…',
      noCalendars: 'Keine Kalender gefunden. Prüfe dein app-spezifisches Passwort.',
      foundCalendars:
        '{{total}} Kalender gefunden – {{reminderCount}} mit Erinnerungs-Inhalt ({{names}}). Import-Typ pro Zeile anpassbar.',
      needFields: 'Bitte alle Pflichtfelder ausfüllen und mindestens einen Kalender wählen.',
    },
  },

  appleReminders: {
    title: 'Apple Reminders',
    desc: 'Echte Erinnerungen aus der Apple-Reminders-App über iCloud – getrennt von CalDAV-Erinnerungs-Kalendern – mithilfe der inoffiziellen iCloud-Web-API pyicloud. Apple-ID, Passwort und ggf. Zwei-Faktor-Code nötig.',
    delayHint:
      'Neu erstelle Challenges mit einer verlinkten iCloud Liste können einige Minuten brauchen, bis sie sichtbar in Reminders sind.',
    unofficialApi: 'Inoffizielle iCloud-Web-API.',
    addAccount: 'Konto hinzufügen',
    empty: 'Noch kein Apple-Reminders-Konto verbunden',
    syncAll: 'Alle synchronisieren',
    editAccountTitle: 'Konto bearbeiten',
    modal: {
      editTitle: 'Apple Reminders bearbeiten',
      connectTitle: 'Apple Reminders (Beta) verbinden',
      intro:
        'Verbinde dein iCloud-Konto direkt mit der Reminders-App. Auf Windows gibt es keine native EventKit-Anbindung – diese Beta nutzt Python/pyicloud (inoffizielle iCloud-Web-API).',
      security:
        'Sicherheit: Apple-ID und Passwort werden lokal gespeichert und nur an ein Python-Skript auf deinem PC übergeben. Kein Upload an unsere Server. Inoffizielle API – Apple kann sie jederzeit ändern. Für CalDAV reicht ein App-Passwort; hier brauchst du dein echtes iCloud-Passwort + 2FA.',
      displayName: 'Anzeigename',
      displayNamePlaceholder: 'z. B. Meine Erinnerungen',
      appleId: 'Apple-ID (E-Mail)',
      appleIdPlaceholder: 'name@icloud.com',
      password: 'iCloud-Passwort',
      passwordUnchanged: 'Leer lassen = unverändert',
      twoFactor: 'Zwei-Faktor-Code',
      twoFactorPlaceholder: '6-stelliger Code von deinem Apple-Gerät',
      step2Hint:
        'Schritt 2: Code eingeben und auf 2. Code bestätigen klicken – nicht erneut auf Anmelden (sonst kommt ein neuer Code).',
      step3Hint: 'Schritt 3: Listen laden, dann die gewünschten Listen auswählen.',
      stepLogin: '1. Anmelden',
      stepConfirm: '2. Code bestätigen',
      stepLists: '3. Listen laden',
      pickLists: 'Reminders-Listen übernehmen',
      accountActive: 'Konto aktiv',
      syncOnStart: 'Beim App-Start synchronisieren',
      saveAndSync: 'Speichern & Sync',
      needCredentials: 'Apple-ID und Passwort eingeben.',
      needCode: 'Bitte den 6-stelligen Code eingeben.',
      finishEarlier: 'Zuerst Schritt 1 (und ggf. Schritt 2) abschließen.',
      listsFound: '{{count}} Listen gefunden.',
      needNameAndId: 'Anzeigename und Apple-ID sind Pflicht.',
      needPassword: 'Passwort eingeben.',
      finishStep3: 'Zuerst Schritt 3 abschließen: Listen laden.',
      needList: 'Mindestens eine Liste auswählen.',
      loginFailed: 'Anmeldung fehlgeschlagen.',
      codeFailed: 'Code konnte nicht bestätigt werden.',
      listsFailed: 'Listen konnten nicht geladen werden.',
      twoFactorRequired: 'Zwei-Faktor-Code erforderlich.',
    },
  },

  syncAuth: {
    title: 'Synchronisation erfordert Aufmerksamkeit',
    hint: 'Mindestens ein Konto konnte nicht synchronisiert werden. Bitte Anmeldung prüfen oder Zwei-Faktor-Code bestätigen.',
    kindApple: 'Apple Reminders',
    kindCaldav: 'CalDAV',
    twoFactor: 'Zwei-Faktor-Code',
    twoFactorPlaceholder: '6-stelliger Code',
    confirmAndSync: 'Code bestätigen & syncen',
    retry: 'Erneut syncen',
    openSettings: 'In Einstellungen öffnen',
    needCode: 'Bitte Zwei-Faktor-Code eingeben.',
    confirmFailed: 'Bestätigung fehlgeschlagen',
    backgroundActive: 'Synchronisation läuft im Hintergrund…',
    backgroundExtended: 'Synchronisation dauert länger und läuft im Hintergrund weiter…',
  },

  loading: {
    challengeReset: 'Challenge wird zurückgesetzt…',
    challengeComplete: 'Challenge wird abgehakt…',
    challengeReopen: 'Challenge wird geöffnet…',
    challengeDelete: 'Challenge wird gelöscht…',
    challengeSave: 'Challenge wird gespeichert…',
    challengeAssign: 'Challenge wird zugewiesen…',
    challengeCreate: 'Challenge wird angelegt…',
    reminderAccept: 'Erinnerung wird übernommen…',
    rewardAssign: 'Belohnung wird zugewiesen…',
    rewardCreate: 'Belohnung wird angelegt…',
    rewardRedeem: 'Belohnung wird eingelöst…',
    rewardUndo: 'Einlösung wird zurückgenommen…',
    calendarSync: 'Kalender wird synchronisiert…',
    allCalendarsSync: 'Alle Kalender werden synchronisiert…',
    calendarsLoad: 'Kalender werden geladen…',
    accountSave: 'Konto wird gespeichert…',
    remindersSync: 'Erinnerungen werden synchronisiert…',
    allRemindersSync: 'Alle Erinnerungen werden synchronisiert…',
    icloudConnect: 'Verbindung zu iCloud wird hergestellt…',
    twoFactorConfirm: 'Zwei-Faktor-Code wird bestätigt…',
    listsLoad: 'Reminders-Listen werden geladen…',
    authConfirm: 'Anmeldung wird bestätigt…',
    syncRunning: 'Synchronisation läuft…',
  },

  boot: {
    starting: 'Live Life wird gestartet…',
    syncing: 'Kalender und Erinnerungen werden synchronisiert…',
  },

  modal: {
    closeAria: 'Schließen',
  },

  devLog: {
    title: 'Developer Log',
    empty: 'Keine Log-Einträge…',
  },

  caldav: {
    presets: {
      icloud: {
        label: 'iCloud',
        usernameLabel: 'Apple-ID (E-Mail)',
        hint: 'Apple-ID als Benutzername und ein app-spezifisches Passwort (appleid.apple.com → Anmelden & Sicherheit).',
      },
      google: {
        label: 'Google Kalender',
        usernameLabel: 'Google-E-Mail',
        hint: 'Google-Konto mit app-spezifischem Passwort (Google-Konto → Sicherheit → 2FA → App-Passwörter).',
      },
      outlook: {
        label: 'Outlook / Microsoft 365',
        usernameLabel: 'Microsoft-E-Mail',
        hint: 'CalDAV für Outlook-Konten. Ggf. app-spezifisches Passwort oder CalDAV-URL aus den Kontoeinstellungen.',
      },
      custom: {
        label: 'Anderer CalDAV-Server',
        usernameLabel: 'Benutzername',
        hint: 'CalDAV-URL deines Anbieters (z. B. Nextcloud, Fastmail, SOGo).',
      },
    },
  },

  accountSummary: {
    caldav: {
      noCalendars: 'Keine Kalender aktiv',
      eventsCount: '{{count}} Kalender',
      remindersCount: '{{count}} Erinnerungen',
      defaultName: 'Kalender',
    },
    appleReminders: {
      noLists: 'Keine Listen aktiv',
      listsCount: '{{count}} Listen',
    },
  },
} as const;

