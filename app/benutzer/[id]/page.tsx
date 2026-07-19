"use client";

import Link from "next/link";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { useParams } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";

type Rolle =
  | "admin"
  | "verwaltung"
  | "annahmestelle"
  | "produktion"
  | "fahrer"
  | "mitarbeiter";

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
  rolle: Rolle;
  annahmestelleId: string;
};

const leeresFormular: BenutzerFormular = {
  benutzername: "",
  vorname: "",
  nachname: "",
  email: "",
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

function formularAusBenutzer(
  benutzer: Benutzer,
): BenutzerFormular {
  return {
    benutzername:
      benutzer.benutzername,
    vorname: benutzer.vorname,
    nachname: benutzer.nachname,
    email: benutzer.email,
    rolle: benutzer.rolle,
    annahmestelleId:
      benutzer.annahmestelleId !== null
        ? String(
            benutzer.annahmestelleId,
          )
        : "",
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

export default function BenutzerDetailPage() {
  const params = useParams<{
    id: string;
  }>();

  const [
    benutzer,
    setBenutzer,
  ] = useState<Benutzer | null>(null);

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
    datenGeladen,
    setDatenGeladen,
  ] = useState(false);

  const [speichert, setSpeichert] =
    useState(false);

  const [
    statusWirdGeaendert,
    setStatusWirdGeaendert,
  ] = useState(false);

  const [fehler, setFehler] =
    useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  useEffect(() => {
    let istAktiv = true;

    async function datenLaden() {
      setDatenGeladen(false);
      setFehler("");
      setErfolgsmeldung("");

      try {
        const benutzerId = Number(
          params.id,
        );

        if (
          !Number.isInteger(
            benutzerId,
          ) ||
          benutzerId <= 0
        ) {
          throw new Error(
            "Die Benutzer-ID ist ungültig.",
          );
        }

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
            .eq("id", benutzerId)
            .maybeSingle(),

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

        if (!istAktiv) {
          return;
        }

        if (benutzerErgebnis.error) {
          throw new Error(
            benutzerErgebnis.error
              .message,
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

        const geladeneAnnahmestellen =
          (
            (annahmestellenErgebnis.data ??
              []) as DatenbankAnnahmestelle[]
          ).map((annahmestelle) => ({
            id: annahmestelle.id,
            name: annahmestelle.name,
          }));

        setAnnahmestellen(
          geladeneAnnahmestellen,
        );

        if (!benutzerErgebnis.data) {
          setBenutzer(null);
          setFormular(
            leeresFormular,
          );
          return;
        }

        const geladenerBenutzer =
          benutzerUmwandeln(
            benutzerErgebnis.data as DatenbankBenutzer,
          );

        setBenutzer(
          geladenerBenutzer,
        );

        setFormular(
          formularAusBenutzer(
            geladenerBenutzer,
          ),
        );
      } catch (unbekannterFehler) {
        console.error(
          "Der Benutzer konnte nicht geladen werden:",
          unbekannterFehler,
        );

        if (!istAktiv) {
          return;
        }

        setFehler(
          unbekannterFehler instanceof
            Error
            ? unbekannterFehler.message
            : "Der Benutzer konnte nicht geladen werden.",
        );

        setBenutzer(null);
      } finally {
        if (istAktiv) {
          setDatenGeladen(true);
        }
      }
    }

    void datenLaden();

    return () => {
      istAktiv = false;
    };
  }, [params.id]);

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

  async function benutzerSpeichern(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!benutzer || speichert) {
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
      email &&
      !email.includes("@")
    ) {
      setFehler(
        "Bitte gib eine gültige E-Mail-Adresse ein.",
      );
      return;
    }

    if (
      formular.rolle ===
        "annahmestelle" &&
      !formular.annahmestelleId
    ) {
      setFehler(
        "Bitte ordne diesem Benutzer eine Annahmestelle zu.",
      );
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const { data, error } =
        await supabase
          .from("benutzer")
          .update({
            benutzername,
            vorname: vorname || null,
            nachname:
              nachname || null,
            email: email || null,
            rolle: formular.rolle,
            annahmestelle_id:
              formular.annahmestelleId
                ? Number(
                    formular.annahmestelleId,
                  )
                : null,
          })
          .eq("id", benutzer.id)
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
            "Der Benutzer konnte nicht gespeichert werden.",
        );
      }

      const aktualisierterBenutzer =
        benutzerUmwandeln(
          data as DatenbankBenutzer,
        );

      setBenutzer(
        aktualisierterBenutzer,
      );

      setFormular(
        formularAusBenutzer(
          aktualisierterBenutzer,
        ),
      );

      setErfolgsmeldung(
        `Die Daten von ${aktualisierterBenutzer.benutzername} wurden erfolgreich gespeichert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Der Benutzer konnte nicht gespeichert werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Benutzer konnte nicht gespeichert werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  async function benutzerStatusAendern() {
    if (
      !benutzer ||
      statusWirdGeaendert
    ) {
      return;
    }

    const neuerStatus =
      !benutzer.aktiv;

    const aktion = neuerStatus
      ? "aktivieren"
      : "deaktivieren";

    const bestaetigt =
      window.confirm(
        `Möchtest du den Benutzer ${benutzer.benutzername} wirklich ${aktion}?`,
      );

    if (!bestaetigt) {
      return;
    }

    setStatusWirdGeaendert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const { data, error } =
        await supabase
          .from("benutzer")
          .update({
            aktiv: neuerStatus,
          })
          .eq("id", benutzer.id)
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
        aktualisierterBenutzer,
      );

      setFormular(
        formularAusBenutzer(
          aktualisierterBenutzer,
        ),
      );

      setErfolgsmeldung(
        neuerStatus
          ? `Der Benutzer ${aktualisierterBenutzer.benutzername} wurde aktiviert.`
          : `Der Benutzer ${aktualisierterBenutzer.benutzername} wurde deaktiviert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
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
      setStatusWirdGeaendert(false);
    }
  }

  return (
    <ZugriffsSchutz
      berechtigung="benutzer_bearbeiten"
      titel="Benutzer-Details gesperrt"
      beschreibung="Nur Administratoren dürfen Benutzer bearbeiten."
      zurueckLink="/benutzer"
      zurueckText="Zur Benutzerübersicht"
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Benutzer-Details
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Stammdaten, Rolle und
              Annahmestelle bearbeiten
            </p>
          </div>

          <Link
            href="/benutzer"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Zurück zu den Benutzern
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {!datenGeladen && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Benutzer wird aus Supabase
              geladen ...
            </p>
          </div>
        )}

        {datenGeladen &&
          fehler && (
            <div className="mb-6 rounded-2xl bg-red-100 p-6 text-red-800 shadow">
              <h2 className="text-xl font-bold">
                Vorgang fehlgeschlagen
              </h2>

              <p className="mt-2">
                {fehler}
              </p>

              {!benutzer && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      window.location.reload()
                    }
                    className="rounded-xl bg-red-800 px-5 py-3 font-bold text-white"
                  >
                    Erneut versuchen
                  </button>

                  <Link
                    href="/benutzer"
                    className="rounded-xl border border-red-300 bg-white px-5 py-3 font-bold text-red-800"
                  >
                    Zurück zur Übersicht
                  </Link>
                </div>
              )}
            </div>
          )}

        {datenGeladen &&
          erfolgsmeldung && (
            <div className="mb-6 rounded-2xl bg-green-100 p-6 text-green-800 shadow">
              <h2 className="text-xl font-bold">
                Änderung gespeichert
              </h2>

              <p className="mt-2">
                {erfolgsmeldung}
              </p>
            </div>
          )}

        {datenGeladen &&
          !fehler &&
          !benutzer && (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <h2 className="text-xl font-bold text-slate-900">
                Benutzer nicht gefunden
              </h2>

              <p className="mt-2 text-slate-600">
                Unter dieser ID wurde kein
                Benutzer gefunden.
              </p>

              <Link
                href="/benutzer"
                className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Zurück zu den Benutzern
              </Link>
            </div>
          )}

        {datenGeladen &&
          benutzer && (
            <>
              <div className="mb-6 flex flex-wrap gap-3">
                <Link
                  href="/benutzer"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
                >
                  Zurück
                </Link>

                <button
                  type="button"
                  onClick={
                    benutzerStatusAendern
                  }
                  disabled={
                    statusWirdGeaendert
                  }
                  className={`rounded-xl px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    benutzer.aktiv
                      ? "bg-red-700"
                      : "bg-green-700"
                  }`}
                >
                  {statusWirdGeaendert
                    ? "Status wird geändert ..."
                    : benutzer.aktiv
                      ? "Benutzer deaktivieren"
                      : "Benutzer aktivieren"}
                </button>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-sm text-slate-600">
                      Benutzername
                    </p>

                    <h2 className="mt-1 text-3xl font-bold text-slate-900">
                      @{benutzer.benutzername}
                    </h2>

                    <p className="mt-3 text-xl font-semibold text-slate-700">
                      {benutzerNameErmitteln(
                        benutzer,
                      )}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Angelegt am{" "}
                      {datumFormatieren(
                        benutzer.erstelltAm,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${rollenKlassenErmitteln(
                        benutzer.rolle,
                      )}`}
                    >
                      {rolleFormatieren(
                        benutzer.rolle,
                      )}
                    </span>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        benutzer.aktiv
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {benutzer.aktiv
                        ? "Aktiv"
                        : "Inaktiv"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-600">
                      Rolle
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {rolleFormatieren(
                        benutzer.rolle,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-600">
                      Annahmestelle
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {
                        benutzer.annahmestelle
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-600">
                      E-Mail
                    </p>

                    <p className="mt-1 break-all font-bold text-slate-900">
                      {benutzer.email ||
                        "Nicht angegeben"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                <form
                  onSubmit={
                    benutzerSpeichern
                  }
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Benutzer bearbeiten
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Stammdaten und
                      Zuordnung ändern
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Zugangsdaten
                    </h3>

                    <label className="mt-4 block">
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
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      />

                      <p className="mt-2 text-sm text-slate-500">
                        Keine Leerzeichen
                        verwenden.
                      </p>
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Persönliche Daten
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

                    <label className="mt-4 block">
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
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      />
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Rolle und Zuordnung
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Rolle
                        </span>

                        <select
                          value={
                            formular.rolle
                          }
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
                    </div>

                    {formular.rolle ===
                      "annahmestelle" &&
                      !formular.annahmestelleId && (
                        <div className="mt-4 rounded-xl bg-orange-100 p-4 text-orange-800">
                          Für die Rolle
                          „Annahmestelle“ muss
                          eine Annahmestelle
                          ausgewählt werden.
                        </div>
                      )}
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <button
                      type="submit"
                      disabled={speichert}
                      className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {speichert
                        ? "Änderungen werden gespeichert ..."
                        : "Änderungen speichern"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
      </section>
      </main>
    </ZugriffsSchutz>
  );
}