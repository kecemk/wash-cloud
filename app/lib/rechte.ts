export type BenutzerRolle =
  | "admin"
  | "verwaltung"
  | "annahmestelle"
  | "produktion"
  | "fahrer"
  | "mitarbeiter";

export type Berechtigung =
  | "dashboard_anzeigen"
  | "annahmestellen_anzeigen"
  | "annahmestellen_bearbeiten"
  | "kasse_anzeigen"
  | "lieferscheine_anzeigen"
  | "lieferscheine_bearbeiten"
  | "lieferungen_anzeigen"
  | "lieferungen_bearbeiten"
  | "kunden_anzeigen"
  | "kunden_bearbeiten"
  | "rechnungen_anzeigen"
  | "rechnungen_bearbeiten"
  | "produktion_anzeigen"
  | "berichte_anzeigen"
  | "benutzer_anzeigen"
  | "benutzer_bearbeiten"
  | "lager_anzeigen"
  | "lager_verbrauch_buchen"
  | "lager_verwalten"
  | "chat_anzeigen"
  | "chat_schreiben"
  | "einstellungen_anzeigen";

export type RollenInformation = {
  rolle: BenutzerRolle;
  name: string;
  beschreibung: string;
};

export const rollenInformationen: Record<
  BenutzerRolle,
  RollenInformation
> = {
  admin: {
    rolle: "admin",
    name: "Administrator",
    beschreibung:
      "Vollständiger Zugriff auf alle Bereiche und Einstellungen.",
  },

  verwaltung: {
    rolle: "verwaltung",
    name: "Verwaltung",
    beschreibung:
      "Zugriff auf Kunden, Rechnungen, Berichte und betriebliche Übersichten.",
  },

  annahmestelle: {
    rolle: "annahmestelle",
    name: "Annahmestelle",
    beschreibung:
      "Lesezugriff ausschließlich auf die eigenen Lieferscheine und Rechnungen sowie Zugriff auf den eigenen Chat.",
  },

  produktion: {
    rolle: "produktion",
    name: "Produktion",
    beschreibung:
      "Zugriff auf Produktionsabläufe und Lieferscheine.",
  },

  fahrer: {
    rolle: "fahrer",
    name: "Fahrer",
    beschreibung:
      "Zugriff auf Lieferungen und zugehörige Lieferscheine.",
  },

  mitarbeiter: {
    rolle: "mitarbeiter",
    name: "Mitarbeiter",
    beschreibung:
      "Zugriff auf Kasse, Kunden, Lieferscheine, Lagerverbrauch und den Chat mit Annahmestellen.",
  },
};

const rechteJeRolle: Record<
  BenutzerRolle,
  Berechtigung[]
> = {
  admin: [
    "dashboard_anzeigen",
    "annahmestellen_anzeigen",
    "annahmestellen_bearbeiten",
    "kasse_anzeigen",
    "lieferscheine_anzeigen",
    "lieferscheine_bearbeiten",
    "lieferungen_anzeigen",
    "lieferungen_bearbeiten",
    "kunden_anzeigen",
    "kunden_bearbeiten",
    "rechnungen_anzeigen",
    "rechnungen_bearbeiten",
    "produktion_anzeigen",
    "berichte_anzeigen",
    "benutzer_anzeigen",
    "benutzer_bearbeiten",
    "lager_anzeigen",
    "lager_verbrauch_buchen",
    "lager_verwalten",
    "chat_anzeigen",
    "chat_schreiben",
    "einstellungen_anzeigen",
  ],

  verwaltung: [
    "dashboard_anzeigen",
    "annahmestellen_anzeigen",
    "lieferscheine_anzeigen",
    "lieferungen_anzeigen",
    "kunden_anzeigen",
    "kunden_bearbeiten",
    "rechnungen_anzeigen",
    "rechnungen_bearbeiten",
    "berichte_anzeigen",
  ],

  annahmestelle: [
    "lieferscheine_anzeigen",
    "rechnungen_anzeigen",
    "chat_anzeigen",
    "chat_schreiben",
  ],

  produktion: [
    "dashboard_anzeigen",
    "lieferscheine_anzeigen",
    "lieferscheine_bearbeiten",
    "lieferungen_anzeigen",
    "produktion_anzeigen",
  ],

  fahrer: [
    "dashboard_anzeigen",
    "lieferscheine_anzeigen",
    "lieferungen_anzeigen",
    "lieferungen_bearbeiten",
  ],

  mitarbeiter: [
    "dashboard_anzeigen",
    "kasse_anzeigen",
    "lieferscheine_anzeigen",
    "lieferscheine_bearbeiten",
    "kunden_anzeigen",
    "kunden_bearbeiten",
    "lager_anzeigen",
    "lager_verbrauch_buchen",
    "chat_anzeigen",
    "chat_schreiben",
  ],
};

export function rolleIstGueltig(
  rolle: string,
): rolle is BenutzerRolle {
  return (
    rolle === "admin" ||
    rolle === "verwaltung" ||
    rolle === "annahmestelle" ||
    rolle === "produktion" ||
    rolle === "fahrer" ||
    rolle === "mitarbeiter"
  );
}

export function rolleFormatieren(
  rolle: BenutzerRolle,
) {
  return rollenInformationen[rolle].name;
}

export function rollenBeschreibungErmitteln(
  rolle: BenutzerRolle,
) {
  return rollenInformationen[rolle].beschreibung;
}

export function berechtigungenErmitteln(
  rolle: BenutzerRolle,
): Berechtigung[] {
  return [...rechteJeRolle[rolle]];
}

export function hatBerechtigung(
  rolle: BenutzerRolle,
  berechtigung: Berechtigung,
) {
  return rechteJeRolle[rolle].includes(
    berechtigung,
  );
}

export function hatMindestensEineBerechtigung(
  rolle: BenutzerRolle,
  berechtigungen: Berechtigung[],
) {
  return berechtigungen.some(
    (berechtigung) =>
      hatBerechtigung(
        rolle,
        berechtigung,
      ),
  );
}

export function hatAlleBerechtigungen(
  rolle: BenutzerRolle,
  berechtigungen: Berechtigung[],
) {
  return berechtigungen.every(
    (berechtigung) =>
      hatBerechtigung(
        rolle,
        berechtigung,
      ),
  );
}

export function darfBenutzerVerwalten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "benutzer_bearbeiten",
  );
}

export function darfRechnungenVerwalten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "rechnungen_bearbeiten",
  );
}

export function darfKundenVerwalten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "kunden_bearbeiten",
  );
}

export function darfLieferscheineBearbeiten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "lieferscheine_bearbeiten",
  );
}

export function darfLieferungenBearbeiten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "lieferungen_bearbeiten",
  );
}

export function darfAnnahmestellenBearbeiten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "annahmestellen_bearbeiten",
  );
}

export function darfLagerVerwalten(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "lager_verwalten",
  );
}

export function darfLagerverbrauchBuchen(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "lager_verbrauch_buchen",
  );
}

export function darfChatAnzeigen(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "chat_anzeigen",
  );
}

export function darfChatSchreiben(
  rolle: BenutzerRolle,
) {
  return hatBerechtigung(
    rolle,
    "chat_schreiben",
  );
}

export function istAdministrator(
  rolle: BenutzerRolle,
) {
  return rolle === "admin";
}