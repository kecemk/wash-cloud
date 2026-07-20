"use client";

import Link from "next/link";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

type Rolle =
  | "admin"
  | "verwaltung"
  | "annahmestelle"
  | "produktion"
  | "fahrer"
  | "mitarbeiter";

type StatusFilter =
  | "alle"
  | "aktiv"
  | "inaktiv";

type RollenFilter =
  | "alle"
  | Rolle;

type DatenbankAnnahmestelle = {
  id: number;
  name: string;
};

type DatenbankBenutzer = {
  id: number;
  benutzername: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  rolle: Rolle;
  aktiv: boolean;
  annahmestelle_id: number | null;
  erstellt_am: string;
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null;
};

type Annahmestelle = {
  id: number;
  name: string;
};

type Benutzer = {
  id: number;
  benutzername: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: Rolle;
  aktiv: boolean;
  annahmestelleId: number | null;
  annahmestelle: string;
  erstelltAm: string;
};

type BenutzerFormular = {
  benutzername: string;
  vorname: string;
  nachname: string;
  email: string;
  startpasswort: string;
  rolle: Rolle;
  annahmestelleId: string;
};

const leeresFormular: BenutzerFormular = {
  benutzername: "",
  vorname: "",
  nachname: "",
  email: "",
  startpasswort: "",
  rolle: "mitarbeiter",
  annahmestelleId: "",
};

function einzelnesElementErmitteln<T>(
  wert: T | T[] | null,
): T | null {
  if (Array.isArray(wert)) {
    return wert[0] ?? null;
  }

  return wert;
}

function benutzerUmwandeln(
  daten: DatenbankBenutzer,
): Benutzer {
  const annahmestelle =
    einzelnesElementErmitteln(
      daten.annahmestellen,
    );

  return {
    id: daten.id,
    benutzername: daten.benutzername,
    vorname: daten.vorname ?? "",
    nachname: daten.nachname ?? "",
    email: daten.email ?? "",
    rolle: daten.rolle,
    aktiv: daten.aktiv,
    annahmestelleId:
      daten.annahmestelle_id,
    annahmestelle:
      annahmestelle?.name ??
      "Keine Annahmestelle",
    erstelltAm: daten.erstellt_am,
  };
}

function benutzerNameErmitteln(
  benutzer: Benutzer,
) {
  const name = [
    benutzer.vorname,
    benutzer.nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || benutzer.benutzername;
}

function rolleFormatieren(
  rolle: Rolle,
) {
  if (rolle === "admin") {
    return "Administrator";
  }

  if (rolle === "verwaltung") {
    return "Verwaltung";
  }

  if (rolle === "annahmestelle") {
    return "Annahmestelle";
  }

  if (rolle === "produktion") {
    return "Produktion";
  }

  if (rolle === "fahrer") {
    return "Fahrer";
  }

  return "Mitarbeiter";
}

function rollenKlassenErmitteln(
  rolle: Rolle,
) {
  if (rolle === "admin") {
    return "bg-purple-100 text-purple-700";
  }

  if (rolle === "verwaltung") {
    return "bg-blue-100 text-blue-700";
  }

  if (rolle === "annahmestelle") {
    return "bg-cyan-100 text-cyan-700";
  }

  if (rolle === "produktion") {
    return "bg-orange-100 text-orange-700";
  }

  if (rolle === "fahrer") {
    return "bg-green-100 text-green-700";
  }

  return "bg-slate-200 text-slate-700";
}

function datumFormatieren(
  datum: string,
) {
  const datumAlsObjekt =
    new Date(datum);

  if (
    Number.isNaN(
      datumAlsObjekt.getTime(),
    )
  ) {
    return "Unbekanntes Datum";
  }

  return datumAlsObjekt.toLocaleString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function sicheresStartpasswortErzeugen() {
  const grossbuchstaben =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const kleinbuchstaben =
    "abcdefghijkmnopqrstuvwxyz";
  const zahlen = "23456789";
  const sonderzeichen = "!@#$%&*-_";

  const alleZeichen =
    grossbuchstaben +
    kleinbuchstaben +
    zahlen +
    sonderzeichen;

  const zufaelligesZeichen = (
    zeichen: string,
  ) =>
    zeichen[
      Math.floor(
        Math.random() * zeichen.length,
      )
    ];

  const bestandteile = [
    zufaelligesZeichen(grossbuchstaben),
    zufaelligesZeichen(kleinbuchstaben),
    zufaelligesZeichen(zahlen),
    zufaelligesZeichen(sonderzeichen),
  ];

  while (bestandteile.length < 14) {
    bestandteile.push(
      zufaelligesZeichen(alleZeichen),
    );
  }

  return bestandteile
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function BenutzerPage() {
  const [
    benutzer,
    setBenutzer,
  ] = useState<Benutzer[]>([]);

  const [
    annahmestellen,
    setAnnahmestellen,
  ] = useState<Annahmestelle[]>([]);

  const [
    formular,
    setFormular,
  ] = useState<BenutzerFormular>(
    leeresFormular,
  );

  const [
    suchbegriff,
    setSuchbegriff,
  ] = useState("");

  const [
    rollenFilter,
    setRollenFilter,
  ] = useState<RollenFilter>("alle");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("alle");

  const [laedt, setLaedt] =
    useState(true);

  const [speichert, setSpeichert] =
    useState(false);

  const [
    statusWirdGeaendert,
    setStatusWirdGeaendert,
  ] = useState<number | null>(null);

  const [fehler, setFehler] =
    useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  useEffect(() => {
    void grunddatenLaden();
  }, []);

  async function grunddatenLaden() {
    setLaedt(true);
    setFehler("");

    try {
      const [
        benutzerErgebnis,
        annahmestellenErgebnis,
      ] = await Promise.all([
        supabase
          .from("benutzer")
          .select(`
            id,
            benutzername,
            vorname,
            nachname,
            email,
            rolle,
            aktiv,
            annahmestelle_id,
            erstellt_am,
            annahmestellen (
              id,
              name
            )
          `)
          .order("erstellt_am", {
            ascending: false,
          }),

        supabase
          .from("annahmestellen")
          .select(`
            id,
            name
          `)
          .order("name", {
            ascending: true,
          }),
      ]);

      if (benutzerErgebnis.error) {
        throw new Error(
          benutzerErgebnis.error.message,
        );
      }

      if (
        annahmestellenErgebnis.error
      ) {
        throw new Error(
          annahmestellenErgebnis.error
            .message,
        );
      }

      const geladeneBenutzer = (
        (benutzerErgebnis.data ??
          []) as DatenbankBenutzer[]
      ).map(benutzerUmwandeln);

      const geladeneAnnahmestellen = (
        (annahmestellenErgebnis.data ??
          []) as DatenbankAnnahmestelle[]
      ).map((annahmestelle) => ({
        id: annahmestelle.id,
        name: annahmestelle.name,
      }));

      setBenutzer(
        geladeneBenutzer,
      );

      setAnnahmestellen(
        geladeneAnnahmestellen,
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Benutzerverwaltung konnte nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Benutzerverwaltung konnte nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  function formularFeldAendern(
    feld: keyof BenutzerFormular,
    wert: string,
  ) {
    setFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]: wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  async function benutzerAnlegen(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (speichert) {
      return;
    }

    const benutzername =
      formular.benutzername
        .trim()
        .toLowerCase();

    const vorname =
      formular.vorname.trim();

    const nachname =
      formular.nachname.trim();

    const email =
      formular.email
        .trim()
        .toLowerCase();

    if (!benutzername) {
      setFehler(
        "Bitte gib einen Benutzernamen ein.",
      );
      return;
    }

    if (
      benutzername.includes(" ")
    ) {
      setFehler(
        "Der Benutzername darf keine Leerzeichen enthalten.",
      );
      return;
    }

    if (
      !email ||
      !email.includes("@")
    ) {
      setFehler(
        "Bitte gib eine gültige E-Mail-Adresse ein.",
      );
      return;
    }

    if (
      formular.startpasswort.length < 10 ||
      !/[A-Z]/.test(
        formular.startpasswort,
      ) ||
      !/[a-z]/.test(
        formular.startpasswort,
      ) ||
      !/\d/.test(
        formular.startpasswort,
      )
    ) {
      setFehler(
        "Das Startpasswort muss mindestens 10 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben sowie eine Zahl enthalten.",
      );
      return;
    }

    if (
      formular.rolle ===
        "annahmestelle" &&
      !formular.annahmestelleId
    ) {
      setFehler(
        "Bitte ordne dem Benutzer eine Annahmestelle zu.",
      );
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const {
        data: sitzungsDaten,
        error: sitzungsFehler,
      } =
        await supabase.auth.getSession();

      if (
        sitzungsFehler ||
        !sitzungsDaten.session
      ) {
        throw new Error(
          "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.",
        );
      }

      const antwort = await fetch(
        "/api/benutzer",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${sitzungsDaten.session.access_token}`,
          },
          body: JSON.stringify({
            benutzername,
            vorname,
            nachname,
            email,
            startpasswort:
              formular.startpasswort,
            rolle: formular.rolle,
            annahmestelleId:
              formular.annahmestelleId
                ? Number(
                    formular.annahmestelleId,
                  )
                : null,
          }),
        },
      );

      const antwortDaten: unknown =
        await antwort.json();

      if (!antwort.ok) {
        const apiFehler =
          typeof antwortDaten ===
            "object" &&
          antwortDaten !== null &&
          "fehler" in antwortDaten &&
          typeof antwortDaten.fehler ===
            "string"
            ? antwortDaten.fehler
            : "Der Benutzer konnte nicht angelegt werden.";

        throw new Error(apiFehler);
      }

      if (
        typeof antwortDaten !== "object" ||
        antwortDaten === null ||
        !("benutzer" in antwortDaten) ||
        typeof antwortDaten.benutzer !==
          "object" ||
        antwortDaten.benutzer === null
      ) {
        throw new Error(
          "Der Server hat keine gültigen Benutzerdaten zurückgegeben.",
        );
      }

      const neuerBenutzer =
        benutzerUmwandeln(
          antwortDaten.benutzer as
            DatenbankBenutzer,
        );

      const nachricht =
        "nachricht" in antwortDaten &&
        typeof antwortDaten.nachricht ===
          "string"
          ? antwortDaten.nachricht
          : `Der Benutzer ${neuerBenutzer.benutzername} wurde angelegt und eingeladen.`;

      setBenutzer(
        (aktuelleBenutzer) => [
          neuerBenutzer,
          ...aktuelleBenutzer,
        ],
      );

      setFormular(
        leeresFormular,
      );

      setErfolgsmeldung(nachricht);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Der Benutzer konnte nicht angelegt werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Benutzer konnte nicht angelegt werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  async function benutzerStatusAendern(
    ausgewählterBenutzer: Benutzer,
  ) {
    if (
      statusWirdGeaendert !== null
    ) {
      return;
    }

    const neuerStatus =
      !ausgewählterBenutzer.aktiv;

    const aktion = neuerStatus
      ? "aktivieren"
      : "deaktivieren";

    const bestaetigt =
      window.confirm(
        `Möchtest du den Benutzer ${ausgewählterBenutzer.benutzername} wirklich ${aktion}?`,
      );

    if (!bestaetigt) {
      return;
    }

    setStatusWirdGeaendert(
      ausgewählterBenutzer.id,
    );
    setFehler("");
    setErfolgsmeldung("");

    try {
      const { data, error } =
        await supabase
          .from("benutzer")
          .update({
            aktiv: neuerStatus,
          })
          .eq(
            "id",
            ausgewählterBenutzer.id,
          )
          .select(`
            id,
            benutzername,
            vorname,
            nachname,
            email,
            rolle,
            aktiv,
            annahmestelle_id,
            erstellt_am,
            annahmestellen (
              id,
              name
            )
          `)
          .single();

      if (error || !data) {
        throw new Error(
          error?.message ??
            "Der Benutzerstatus konnte nicht geändert werden.",
        );
      }

      const aktualisierterBenutzer =
        benutzerUmwandeln(
          data as DatenbankBenutzer,
        );

      setBenutzer(
        (aktuelleBenutzer) =>
          aktuelleBenutzer.map(
            (benutzerEintrag) =>
              benutzerEintrag.id ===
              aktualisierterBenutzer.id
                ? aktualisierterBenutzer
                : benutzerEintrag,
          ),
      );

      setErfolgsmeldung(
        neuerStatus
          ? `Der Benutzer ${aktualisierterBenutzer.benutzername} wurde aktiviert.`
          : `Der Benutzer ${aktualisierterBenutzer.benutzername} wurde deaktiviert.`,
      );
    } catch (unbekannterFehler) {
      console.error(
        "Der Benutzerstatus konnte nicht geändert werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Benutzerstatus konnte nicht geändert werden.",
      );
    } finally {
      setStatusWirdGeaendert(
        null,
      );
    }
  }

  const gefilterteBenutzer =
    useMemo(() => {
      const normalisierterSuchbegriff =
        suchbegriff
          .trim()
          .toLowerCase();

      return benutzer.filter(
        (benutzerEintrag) => {
          const rollePasst =
            rollenFilter === "alle" ||
            benutzerEintrag.rolle ===
              rollenFilter;

          const statusPasst =
            statusFilter === "alle" ||
            (statusFilter === "aktiv" &&
              benutzerEintrag.aktiv) ||
            (statusFilter ===
              "inaktiv" &&
              !benutzerEintrag.aktiv);

          if (
            !rollePasst ||
            !statusPasst
          ) {
            return false;
          }

          if (
            !normalisierterSuchbegriff
          ) {
            return true;
          }

          const suchtext = [
            benutzerEintrag.benutzername,
            benutzerEintrag.vorname,
            benutzerEintrag.nachname,
            benutzerEintrag.email,
            benutzerEintrag.annahmestelle,
            rolleFormatieren(
              benutzerEintrag.rolle,
            ),
          ]
            .join(" ")
            .toLowerCase();

          return suchtext.includes(
            normalisierterSuchbegriff,
          );
        },
      );
    }, [
      benutzer,
      rollenFilter,
      statusFilter,
      suchbegriff,
    ]);

  const aktiveBenutzer =
    useMemo(
      () =>
        benutzer.filter(
          (benutzerEintrag) =>
            benutzerEintrag.aktiv,
        ).length,
      [benutzer],
    );

  const inaktiveBenutzer =
    benutzer.length -
    aktiveBenutzer;

  const administratoren =
    useMemo(
      () =>
        benutzer.filter(
          (benutzerEintrag) =>
            benutzerEintrag.rolle ===
            "admin",
        ).length,
      [benutzer],
    );

  return (
    <ZugriffsSchutz
      berechtigung="benutzer_anzeigen"
      titel="Benutzerverwaltung gesperrt"
      beschreibung="Nur Administratoren dürfen die Benutzerverwaltung öffnen."
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Benutzerverwaltung
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Mitarbeiter, Rollen und
              Annahmestellen verwalten
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
            >
              Startseite
            </Link>

            <Link
              href="/annahmestellen"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              Annahmestellen
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {fehler && (
          <div className="mb-6 rounded-2xl bg-red-100 p-5 text-red-800 shadow">
            <p className="font-bold">
              Vorgang fehlgeschlagen
            </p>

            <p className="mt-1">
              {fehler}
            </p>
          </div>
        )}

        {erfolgsmeldung && (
          <div className="mb-6 rounded-2xl bg-green-100 p-5 text-green-800 shadow">
            <p className="font-bold">
              Änderung gespeichert
            </p>

            <p className="mt-1">
              {erfolgsmeldung}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Benutzer insgesamt
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {benutzer.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Aktive Benutzer
            </p>

            <p className="mt-1 text-3xl font-bold text-green-700">
              {aktiveBenutzer}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Inaktive Benutzer
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-700">
              {inaktiveBenutzer}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Administratoren
            </p>

            <p className="mt-1 text-3xl font-bold text-purple-700">
              {administratoren}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="h-fit rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold text-slate-900">
              Benutzer anlegen
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Auth-Konto mit E-Mail-Adresse und
              Startpasswort erstellen
            </p>

            <form
              onSubmit={
                benutzerAnlegen
              }
              className="mt-6 space-y-4"
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Benutzername
                </span>

                <input
                  type="text"
                  value={
                    formular.benutzername
                  }
                  onChange={(event) =>
                    formularFeldAendern(
                      "benutzername",
                      event.target.value,
                    )
                  }
                  placeholder="zum Beispiel m.mueller"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Vorname
                  </span>

                  <input
                    type="text"
                    value={
                      formular.vorname
                    }
                    onChange={(event) =>
                      formularFeldAendern(
                        "vorname",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Nachname
                  </span>

                  <input
                    type="text"
                    value={
                      formular.nachname
                    }
                    onChange={(event) =>
                      formularFeldAendern(
                        "nachname",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  E-Mail
                </span>

                <input
                  type="email"
                  value={formular.email}
                  onChange={(event) =>
                    formularFeldAendern(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="name@firma.de"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Startpasswort
                </span>

                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={
                      formular.startpasswort
                    }
                    onChange={(event) =>
                      formularFeldAendern(
                        "startpasswort",
                        event.target.value,
                      )
                    }
                    placeholder="Mindestens 10 Zeichen"
                    autoComplete="new-password"
                    required
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      formularFeldAendern(
                        "startpasswort",
                        sicheresStartpasswortErzeugen(),
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    Erzeugen
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Das Passwort jetzt sicher
                  notieren und der Person
                  persönlich mitteilen.
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Rolle
                </span>

                <select
                  value={formular.rolle}
                  onChange={(event) =>
                    formularFeldAendern(
                      "rolle",
                      event.target
                        .value as Rolle,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                >
                  <option value="mitarbeiter">
                    Mitarbeiter
                  </option>

                  <option value="annahmestelle">
                    Annahmestelle
                  </option>

                  <option value="produktion">
                    Produktion
                  </option>

                  <option value="fahrer">
                    Fahrer
                  </option>

                  <option value="verwaltung">
                    Verwaltung
                  </option>

                  <option value="admin">
                    Administrator
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Annahmestelle
                </span>

                <select
                  value={
                    formular.annahmestelleId
                  }
                  onChange={(event) =>
                    formularFeldAendern(
                      "annahmestelleId",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                >
                  <option value="">
                    Keine Annahmestelle
                  </option>

                  {annahmestellen.map(
                    (annahmestelle) => (
                      <option
                        key={
                          annahmestelle.id
                        }
                        value={
                          annahmestelle.id
                        }
                      >
                        {
                          annahmestelle.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <button
                type="submit"
                disabled={speichert}
                className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {speichert
                  ? "Benutzer wird angelegt ..."
                  : "Benutzer mit Zugang anlegen"}
              </button>
            </form>
          </div>

          <div>
            <div className="rounded-2xl bg-white p-5 shadow">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px]">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Benutzer suchen
                  </span>

                  <input
                    type="search"
                    value={suchbegriff}
                    onChange={(event) =>
                      setSuchbegriff(
                        event.target.value,
                      )
                    }
                    placeholder="Name, Benutzername oder E-Mail"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Rolle
                  </span>

                  <select
                    value={rollenFilter}
                    onChange={(event) =>
                      setRollenFilter(
                        event.target
                          .value as RollenFilter,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  >
                    <option value="alle">
                      Alle Rollen
                    </option>

                    <option value="admin">
                      Administrator
                    </option>

                    <option value="verwaltung">
                      Verwaltung
                    </option>

                    <option value="annahmestelle">
                      Annahmestelle
                    </option>

                    <option value="produktion">
                      Produktion
                    </option>

                    <option value="fahrer">
                      Fahrer
                    </option>

                    <option value="mitarbeiter">
                      Mitarbeiter
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Status
                  </span>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target
                          .value as StatusFilter,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  >
                    <option value="alle">
                      Alle
                    </option>

                    <option value="aktiv">
                      Aktiv
                    </option>

                    <option value="inaktiv">
                      Inaktiv
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Benutzer
                  </h2>

                  <p className="mt-1 text-slate-600">
                    {
                      gefilterteBenutzer.length
                    }{" "}
                    angezeigte Benutzer
                  </p>
                </div>

                {(suchbegriff ||
                  rollenFilter !==
                    "alle" ||
                  statusFilter !==
                    "alle") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuchbegriff("");
                      setRollenFilter(
                        "alle",
                      );
                      setStatusFilter(
                        "alle",
                      );
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>

              {laedt && (
                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-slate-600">
                    Benutzer werden geladen ...
                  </p>
                </div>
              )}

              {!laedt &&
                benutzer.length === 0 && (
                  <div className="rounded-2xl bg-white p-8 text-center shadow">
                    <h3 className="text-xl font-bold text-slate-900">
                      Noch keine Benutzer
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Lege links den ersten
                      Benutzer an.
                    </p>
                  </div>
                )}

              {!laedt &&
                benutzer.length > 0 &&
                gefilterteBenutzer.length ===
                  0 && (
                  <div className="rounded-2xl bg-white p-8 text-center shadow">
                    <h3 className="text-xl font-bold text-slate-900">
                      Keine Benutzer gefunden
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Ändere die Suche oder
                      die Filter.
                    </p>
                  </div>
                )}

              <div className="space-y-4">
                {!laedt &&
                  gefilterteBenutzer.map(
                    (benutzerEintrag) => (
                      <article
                        key={
                          benutzerEintrag.id
                        }
                        className="rounded-2xl bg-white p-6 shadow"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-900">
                                {benutzerNameErmitteln(
                                  benutzerEintrag,
                                )}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-semibold ${rollenKlassenErmitteln(
                                  benutzerEintrag.rolle,
                                )}`}
                              >
                                {rolleFormatieren(
                                  benutzerEintrag.rolle,
                                )}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                  benutzerEintrag.aktiv
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {benutzerEintrag.aktiv
                                  ? "Aktiv"
                                  : "Inaktiv"}
                              </span>
                            </div>

                            <p className="mt-2 font-semibold text-slate-700">
                              @
                              {
                                benutzerEintrag.benutzername
                              }
                            </p>

                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                              <div>
                                <p className="text-slate-500">
                                  E-Mail
                                </p>

                                <p className="mt-1 break-all font-semibold text-slate-900">
                                  {benutzerEintrag.email ||
                                    "Nicht angegeben"}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Annahmestelle
                                </p>

                                <p className="mt-1 font-semibold text-slate-900">
                                  {
                                    benutzerEintrag.annahmestelle
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Angelegt am
                                </p>

                                <p className="mt-1 font-semibold text-slate-900">
                                  {datumFormatieren(
                                    benutzerEintrag.erstelltAm,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <Link
                              href={`/benutzer/${benutzerEintrag.id}`}
                              className="rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white"
                            >
                              Benutzer öffnen
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                void benutzerStatusAendern(
                                  benutzerEintrag,
                                )
                              }
                              disabled={
                                statusWirdGeaendert !==
                                null
                              }
                              className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                                benutzerEintrag.aktiv
                                  ? "bg-red-700"
                                  : "bg-green-700"
                              }`}
                            >
                              {statusWirdGeaendert ===
                              benutzerEintrag.id
                                ? "Status wird geändert ..."
                                : benutzerEintrag.aktiv
                                  ? "Deaktivieren"
                                  : "Aktivieren"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ),
                  )}
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>
    </ZugriffsSchutz>
  );
}