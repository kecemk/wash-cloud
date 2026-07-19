"use client";

import Link from "next/link";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
};

type DatenbankAnnahmestelle = {
  name: string;
};

type Lieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  gesamtteile: number;
  fertiggestelltAm: string;
  annahmestelle: string;
};

type DatenbankLieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number | string;
  gesamtteile: number;
  fertiggestellt_am: string | null;
  erstellt_am: string;
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null;
};

type LieferungLieferscheinVerknuepfung = {
  lieferscheine:
    | {
        id: number;
        nummer: string;
        status: string;
        gesamtbetrag: number | string;
        gesamtteile: number;
      }
    | {
        id: number;
        nummer: string;
        status: string;
        gesamtbetrag: number | string;
        gesamtteile: number;
      }[]
    | null;
};

type DatenbankLieferung = {
  id: number;
  nummer: string;
  status: string;
  erstellt_am: string;
  geliefert_am: string | null;
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null;
  lieferung_lieferscheine:
    | LieferungLieferscheinVerknuepfung[]
    | null;
};

type Lieferung = {
  id: number;
  nummer: string;
  status: string;
  erstelltAm: string;
  geliefertAm: string | null;
  annahmestelle: string;
  lieferscheine: {
    id: number;
    nummer: string;
    status: string;
    gesamtbetrag: number;
    gesamtteile: number;
  }[];
};

function zahlUmwandeln(
  wert: number | string | null | undefined,
) {
  const zahl =
    typeof wert === "number"
      ? wert
      : Number(String(wert ?? "0").replace(",", "."));

  return Number.isFinite(zahl) ? zahl : 0;
}

function annahmestellenNameErmitteln(
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null,
) {
  if (Array.isArray(annahmestellen)) {
    return (
      annahmestellen[0]?.name ??
      "Unbekannte Annahmestelle"
    );
  }

  return (
    annahmestellen?.name ??
    "Unbekannte Annahmestelle"
  );
}

function lieferungNummerFormatieren(
  laufendeNummer: number,
) {
  return `LI-${String(laufendeNummer).padStart(6, "0")}`;
}

function nummerAusLieferungNummer(nummer: string) {
  const wert = Number(nummer.replace("LI-", ""));
  return Number.isInteger(wert) ? wert : 0;
}

function geldFormatieren(betrag: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(betrag);
}

function datumFormatieren(datum: string | null) {
  if (!datum) {
    return "Noch nicht gesetzt";
  }

  const datumAlsObjekt = new Date(datum);

  if (Number.isNaN(datumAlsObjekt.getTime())) {
    return "Unbekanntes Datum";
  }

  return datumAlsObjekt.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusFormatieren(status: string) {
  if (!status) {
    return "Unbekannt";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1).toLowerCase()
  );
}

function statusKlassenErmitteln(status: string) {
  const normalisierterStatus = status.toLowerCase();

  if (normalisierterStatus === "geliefert") {
    return "bg-green-100 text-green-700";
  }

  if (
    normalisierterStatus === "offen" ||
    normalisierterStatus === "erstellt"
  ) {
    return "bg-yellow-100 text-yellow-800";
  }

  return "bg-slate-100 text-slate-700";
}

function lieferungUmwandeln(
  daten: DatenbankLieferung,
): Lieferung {
  const lieferscheine = (
    daten.lieferung_lieferscheine ?? []
  ).flatMap((verknuepfung) => {
    const verschachtelteLieferscheine =
      verknuepfung.lieferscheine;

    if (!verschachtelteLieferscheine) {
      return [];
    }

    const liste = Array.isArray(
      verschachtelteLieferscheine,
    )
      ? verschachtelteLieferscheine
      : [verschachtelteLieferscheine];

    return liste.map((lieferschein) => ({
      id: lieferschein.id,
      nummer: lieferschein.nummer,
      status: lieferschein.status,
      gesamtbetrag: zahlUmwandeln(
        lieferschein.gesamtbetrag,
      ),
      gesamtteile: lieferschein.gesamtteile ?? 0,
    }));
  });

  return {
    id: daten.id,
    nummer: daten.nummer,
    status: daten.status,
    erstelltAm: daten.erstellt_am,
    geliefertAm: daten.geliefert_am,
    annahmestelle: annahmestellenNameErmitteln(
      daten.annahmestellen,
    ),
    lieferscheine,
  };
}

export default function LieferungenPage() {
  const [annahmestellen, setAnnahmestellen] = useState<
    Annahmestelle[]
  >([]);

  const [lieferscheine, setLieferscheine] = useState<
    Lieferschein[]
  >([]);

  const [lieferungen, setLieferungen] = useState<
    Lieferung[]
  >([]);

  const [ausgewaehlteIds, setAusgewaehlteIds] =
    useState<number[]>([]);

  const [zielAnnahmestelleId, setZielAnnahmestelleId] =
    useState("");

  const [laedt, setLaedt] = useState(true);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolgsmeldung, setErfolgsmeldung] =
    useState("");

  useEffect(() => {
    void datenLaden();
  }, []);

  async function datenLaden() {
    setLaedt(true);
    setFehler("");

    const db = supabase as any;

    const [
      annahmestellenErgebnis,
      lieferscheineErgebnis,
      zuordnungenErgebnis,
      lieferungenErgebnis,
    ] = await Promise.all([
      db
        .from("annahmestellen")
        .select("id, name")
        .eq("aktiv", true)
        .order("name", { ascending: true }),

      db
        .from("lieferscheine")
        .select(`
          id,
          nummer,
          status,
          gesamtbetrag,
          gesamtteile,
          erstellt_am,
          fertiggestellt_am,
          annahmestellen (
            name
          )
        `)
        .eq("status", "fertig")
        .order("fertiggestellt_am", {
          ascending: true,
          nullsFirst: false,
        }),

      db
        .from("lieferung_lieferscheine")
        .select("lieferschein_id"),

      db
        .from("lieferungen")
        .select(`
          id,
          nummer,
          status,
          erstellt_am,
          geliefert_am,
          annahmestellen (
            name
          ),
          lieferung_lieferscheine (
            lieferscheine (
              id,
              nummer,
              status,
              gesamtbetrag,
              gesamtteile
            )
          )
        `)
        .order("erstellt_am", {
          ascending: false,
        }),
    ]);

    const ersterFehler =
      annahmestellenErgebnis.error ??
      lieferscheineErgebnis.error ??
      zuordnungenErgebnis.error ??
      lieferungenErgebnis.error;

    if (ersterFehler) {
      console.error(
        "Die Lieferungsdaten konnten nicht geladen werden:",
        ersterFehler,
      );

      setFehler(ersterFehler.message);
      setLaedt(false);
      return;
    }

    const bereitsZugeordneteIds = new Set<number>(
      (zuordnungenErgebnis.data ?? []).map(
        (eintrag: { lieferschein_id: number }) =>
          eintrag.lieferschein_id,
      ),
    );

    const freieLieferscheine = (
      (lieferscheineErgebnis.data ??
        []) as DatenbankLieferschein[]
    )
      .filter(
        (lieferschein) =>
          !bereitsZugeordneteIds.has(lieferschein.id),
      )
      .map(
        (lieferschein): Lieferschein => ({
          id: lieferschein.id,
          nummer: lieferschein.nummer,
          status: lieferschein.status,
          gesamtbetrag: zahlUmwandeln(
            lieferschein.gesamtbetrag,
          ),
          gesamtteile: lieferschein.gesamtteile ?? 0,
          fertiggestelltAm:
            lieferschein.fertiggestellt_am ??
            lieferschein.erstellt_am,
          annahmestelle: annahmestellenNameErmitteln(
            lieferschein.annahmestellen,
          ),
        }),
      );

    const geladeneLieferungen = (
      (lieferungenErgebnis.data ??
        []) as DatenbankLieferung[]
    ).map(lieferungUmwandeln);

    setAnnahmestellen(
      (annahmestellenErgebnis.data ?? []) as Annahmestelle[],
    );

    setLieferscheine(freieLieferscheine);
    setLieferungen(geladeneLieferungen);

    setAusgewaehlteIds((aktuelleIds) =>
      aktuelleIds.filter((id) =>
        freieLieferscheine.some(
          (lieferschein) => lieferschein.id === id,
        ),
      ),
    );

    setLaedt(false);
  }

  function lieferscheinAuswahlAendern(id: number) {
    setAusgewaehlteIds((aktuelleIds) =>
      aktuelleIds.includes(id)
        ? aktuelleIds.filter(
            (vorhandeneId) => vorhandeneId !== id,
          )
        : [...aktuelleIds, id],
    );

    setErfolgsmeldung("");
    setFehler("");
  }

  function alleAuswaehlen() {
    if (
      ausgewaehlteIds.length === lieferscheine.length
    ) {
      setAusgewaehlteIds([]);
      return;
    }

    setAusgewaehlteIds(
      lieferscheine.map((lieferschein) => lieferschein.id),
    );
  }

  const ausgewaehlteLieferscheine = useMemo(
    () =>
      lieferscheine.filter((lieferschein) =>
        ausgewaehlteIds.includes(lieferschein.id),
      ),
    [lieferscheine, ausgewaehlteIds],
  );

  const ausgewaehlterGesamtbetrag = useMemo(
    () =>
      ausgewaehlteLieferscheine.reduce(
        (summe, lieferschein) =>
          summe + lieferschein.gesamtbetrag,
        0,
      ),
    [ausgewaehlteLieferscheine],
  );

  const ausgewaehlteGesamtteile = useMemo(
    () =>
      ausgewaehlteLieferscheine.reduce(
        (summe, lieferschein) =>
          summe + lieferschein.gesamtteile,
        0,
      ),
    [ausgewaehlteLieferscheine],
  );

  async function naechsteLieferungNummerErmitteln() {
    const db = supabase as any;

    const { data, error } = await db
      .from("lieferungen")
      .select("nummer")
      .order("nummer", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const hoechsteNummer = data?.nummer
      ? nummerAusLieferungNummer(data.nummer)
      : 0;

    return lieferungNummerFormatieren(
      hoechsteNummer + 1,
    );
  }

  async function lieferungErstellen() {
    if (speichert) {
      return;
    }

    const annahmestelleId = Number(
      zielAnnahmestelleId,
    );

    if (
      !Number.isInteger(annahmestelleId) ||
      annahmestelleId < 1
    ) {
      setFehler(
        "Bitte wähle eine Ziel-Annahmestelle aus.",
      );
      return;
    }

    if (ausgewaehlteIds.length === 0) {
      setFehler(
        "Bitte wähle mindestens einen Lieferschein aus.",
      );
      return;
    }

    const zielAnnahmestelle =
      annahmestellen.find(
        (annahmestelle) =>
          annahmestelle.id === annahmestelleId,
      )?.name ?? "ausgewählte Annahmestelle";

    const bestaetigt = window.confirm(
      `Möchtest du aus ${ausgewaehlteIds.length} Lieferschein(en) eine offene Lieferung für ${zielAnnahmestelle} erstellen?`,
    );

    if (!bestaetigt) {
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolgsmeldung("");

    const db = supabase as any;
    let gespeicherteLieferungId: number | null = null;

    try {
      const neueNummer =
        await naechsteLieferungNummerErmitteln();

      const {
        data: gespeicherteLieferung,
        error: lieferungFehler,
      } = await db
        .from("lieferungen")
        .insert({
          nummer: neueNummer,
          annahmestelle_id: annahmestelleId,
          status: "offen",
          geliefert_am: null,
        })
        .select("id")
        .single();

      if (
        lieferungFehler ||
        !gespeicherteLieferung
      ) {
        throw new Error(
          lieferungFehler?.message ??
            "Die Lieferung konnte nicht gespeichert werden.",
        );
      }

      gespeicherteLieferungId =
        gespeicherteLieferung.id;

      const zuordnungen = ausgewaehlteIds.map(
        (lieferscheinId) => ({
          lieferung_id: gespeicherteLieferung.id,
          lieferschein_id: lieferscheinId,
        }),
      );

      const { error: zuordnungsFehler } = await db
        .from("lieferung_lieferscheine")
        .insert(zuordnungen);

      if (zuordnungsFehler) {
        throw new Error(zuordnungsFehler.message);
      }

      setErfolgsmeldung(
        `Die offene Lieferung ${neueNummer} für ${zielAnnahmestelle} wurde erfolgreich erstellt.`,
      );

      setAusgewaehlteIds([]);
      setZielAnnahmestelleId("");

      await datenLaden();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Die Lieferung konnte nicht erstellt werden:",
        unbekannterFehler,
      );

      if (gespeicherteLieferungId !== null) {
        await db
          .from("lieferungen")
          .delete()
          .eq("id", gespeicherteLieferungId);
      }

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Lieferung konnte nicht erstellt werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <ZugriffsSchutz
      berechtigung="lieferungen_anzeigen"
      titel="Lieferungen gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Lieferungen anzeigen oder erstellen."
      zurueckLink="/lieferscheine"
      zurueckText="Zu den Lieferscheinen"
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Lieferungen
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Fertige Lieferscheine zu einer Lieferung
              zusammenfassen
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/lieferscheine"
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
            >
              Lieferscheine
            </Link>

            <Link
              href="/annahmestelle"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              Neue Kasse öffnen
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {erfolgsmeldung && (
          <div className="mb-6 rounded-xl bg-green-100 p-5 text-green-800">
            <p className="font-bold">
              Lieferung erstellt
            </p>

            <p className="mt-1">
              {erfolgsmeldung}
            </p>
          </div>
        )}

        {fehler && (
          <div className="mb-6 rounded-xl bg-red-100 p-5 text-red-800">
            <p className="font-bold">
              Vorgang fehlgeschlagen
            </p>

            <p className="mt-1">
              {fehler}
            </p>
          </div>
        )}

        {laedt && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Lieferungsdaten werden geladen ...
            </p>
          </div>
        )}

        {!laedt && (
          <>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Verfügbare Lieferscheine
                    </h2>

                    <p className="mt-1 text-slate-600">
                      {lieferscheine.length} noch nicht
                      zugeordnete Lieferscheine
                    </p>
                  </div>

                  {lieferscheine.length > 0 && (
                    <button
                      type="button"
                      onClick={alleAuswaehlen}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
                    >
                      {ausgewaehlteIds.length ===
                      lieferscheine.length
                        ? "Auswahl aufheben"
                        : "Alle auswählen"}
                    </button>
                  )}
                </div>

                {lieferscheine.length === 0 && (
                  <div className="rounded-2xl bg-white p-8 text-center shadow">
                    <h3 className="text-xl font-bold text-slate-900">
                      Keine offenen Lieferscheine
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Alle fertigen Lieferscheine wurden
                      bereits einer Lieferung zugeordnet.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {lieferscheine.map((lieferschein) => {
                    const istAusgewaehlt =
                      ausgewaehlteIds.includes(
                        lieferschein.id,
                      );

                    return (
                      <label
                        key={lieferschein.id}
                        className={`block cursor-pointer rounded-2xl border p-5 shadow-sm transition ${
                          istAusgewaehlt
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={istAusgewaehlt}
                            onChange={() =>
                              lieferscheinAuswahlAendern(
                                lieferschein.id,
                              )
                            }
                            className="mt-1 h-5 w-5"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-lg font-bold text-slate-900">
                                  {lieferschein.nummer}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {
                                    lieferschein.annahmestelle
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {datumFormatieren(
                                    lieferschein.fertiggestelltAm,
                                  )}
                                </p>
                              </div>

                              <p className="font-bold text-green-700">
                                {geldFormatieren(
                                  lieferschein.gesamtbetrag,
                                )}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                {lieferschein.gesamtteile} Teile
                              </span>

                              <Link
                                href={`/lieferschein/${encodeURIComponent(
                                  lieferschein.nummer,
                                )}`}
                                className="font-semibold text-blue-700 hover:underline"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                Details öffnen
                              </Link>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <aside className="h-fit rounded-2xl bg-white p-6 shadow lg:sticky lg:top-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Neue Lieferung
                </h2>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-slate-700">
                    Ziel-Annahmestelle
                  </span>

                  <select
                    value={zielAnnahmestelleId}
                    onChange={(event) =>
                      setZielAnnahmestelleId(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  >
                    <option value="">
                      Bitte auswählen
                    </option>

                    {annahmestellen.map(
                      (annahmestelle) => (
                        <option
                          key={annahmestelle.id}
                          value={annahmestelle.id}
                        >
                          {annahmestelle.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="mt-6 space-y-3 rounded-xl bg-slate-100 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      Lieferscheine
                    </span>

                    <strong>
                      {ausgewaehlteIds.length}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      Gesamtteile
                    </span>

                    <strong>
                      {ausgewaehlteGesamtteile}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      Gesamtbetrag
                    </span>

                    <strong className="text-green-700">
                      {geldFormatieren(
                        ausgewaehlterGesamtbetrag,
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={lieferungErstellen}
                  disabled={speichert}
                  className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {speichert
                    ? "Lieferung wird erstellt ..."
                    : "Lieferung erstellen"}
                </button>
              </aside>
            </div>

            <section className="mt-12">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Bisherige Lieferungen
                </h2>

                <p className="mt-1 text-slate-600">
                  {lieferungen.length} gespeicherte
                  Lieferungen
                </p>
              </div>

              {lieferungen.length === 0 && (
                <div className="rounded-2xl bg-white p-8 text-center shadow">
                  <h3 className="text-xl font-bold text-slate-900">
                    Noch keine Lieferungen
                  </h3>

                  <p className="mt-2 text-slate-600">
                    Erstellte Lieferungen werden hier
                    automatisch angezeigt.
                  </p>
                </div>
              )}

              <div className="space-y-5">
                {lieferungen.map((lieferung) => {
                  const gesamtbetrag =
                    lieferung.lieferscheine.reduce(
                      (summe, lieferschein) =>
                        summe +
                        lieferschein.gesamtbetrag,
                      0,
                    );

                  const gesamtteile =
                    lieferung.lieferscheine.reduce(
                      (summe, lieferschein) =>
                        summe +
                        lieferschein.gesamtteile,
                      0,
                    );

                  return (
                    <article
                      key={lieferung.id}
                      className="rounded-2xl bg-white p-6 shadow"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">
                            {lieferung.nummer}
                          </h3>

                          <p className="mt-1 font-semibold text-slate-700">
                            Ziel: {lieferung.annahmestelle}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Erstellt am{" "}
                            {datumFormatieren(
                              lieferung.erstelltAm,
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Geliefert am{" "}
                            {datumFormatieren(
                              lieferung.geliefertAm,
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${statusKlassenErmitteln(
                              lieferung.status,
                            )}`}
                          >
                            {statusFormatieren(
                              lieferung.status,
                            )}
                          </span>

                          <Link
                            href={`/lieferung/${encodeURIComponent(
                              lieferung.nummer,
                            )}`}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                          >
                            Lieferung öffnen
                          </Link>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-sm text-slate-600">
                            Lieferscheine
                          </p>

                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {
                              lieferung.lieferscheine
                                .length
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-sm text-slate-600">
                            Gesamtteile
                          </p>

                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {gesamtteile}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-sm text-slate-600">
                            Gesamtbetrag
                          </p>

                          <p className="mt-1 text-xl font-bold text-green-700">
                            {geldFormatieren(
                              gesamtbetrag,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        {lieferung.lieferscheine.map(
                          (lieferschein) => (
                            <div
                              key={lieferschein.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                            >
                              <div>
                                <p className="font-bold text-slate-900">
                                  {lieferschein.nummer}
                                </p>

                                <p className="text-sm text-slate-500">
                                  {
                                    lieferschein.gesamtteile
                                  }{" "}
                                  Teile
                                </p>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="font-bold text-green-700">
                                  {geldFormatieren(
                                    lieferschein.gesamtbetrag,
                                  )}
                                </span>

                                <Link
                                  href={`/lieferschein/${encodeURIComponent(
                                    lieferschein.nummer,
                                  )}`}
                                  className="font-semibold text-blue-700 hover:underline"
                                >
                                  Öffnen
                                </Link>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
      </main>
    </ZugriffsSchutz>
  );
}