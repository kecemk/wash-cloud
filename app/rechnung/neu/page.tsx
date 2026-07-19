"use client";

import Link from "next/link";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";

type DatenbankKunde = {
  id: number;
  kundennummer: string;
  vorname: string | null;
  nachname: string | null;
  firma: string | null;
  aktiv: boolean;
};

type Kunde = {
  id: number;
  kundennummer: string;
  vorname: string;
  nachname: string;
  firma: string;
};

type DatenbankLieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number | string;
  gesamtteile: number;
  erstellt_am: string;
  fertiggestellt_am: string | null;
  annahmestellen:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type Lieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  gesamtteile: number;
  erstelltAm: string;
  fertiggestelltAm: string | null;
  annahmestelle: string;
};

type DatenbankRechnungsnummer = {
  nummer: string;
};

function kundeUmwandeln(
  daten: DatenbankKunde,
): Kunde {
  return {
    id: daten.id,
    kundennummer: daten.kundennummer,
    vorname: daten.vorname ?? "",
    nachname: daten.nachname ?? "",
    firma: daten.firma ?? "",
  };
}

function lieferscheinUmwandeln(
  daten: DatenbankLieferschein,
): Lieferschein {
  const annahmestelle = Array.isArray(
    daten.annahmestellen,
  )
    ? daten.annahmestellen[0]?.name
    : daten.annahmestellen?.name;

  return {
    id: daten.id,
    nummer: daten.nummer,
    status: daten.status,
    gesamtbetrag: Number(
      daten.gesamtbetrag,
    ),
    gesamtteile: daten.gesamtteile,
    erstelltAm: daten.erstellt_am,
    fertiggestelltAm:
      daten.fertiggestellt_am,
    annahmestelle:
      annahmestelle ??
      "Unbekannte Annahmestelle",
  };
}

function kundenNameErmitteln(
  kunde: Kunde,
) {
  if (kunde.firma.trim()) {
    return kunde.firma;
  }

  const name = [
    kunde.vorname,
    kunde.nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unbekannter Kunde";
}

function rechnungsnummerFormatieren(
  laufendeNummer: number,
) {
  return `RE-${String(
    laufendeNummer,
  ).padStart(6, "0")}`;
}

function nummerAusRechnungsnummer(
  rechnungsnummer: string,
) {
  const nummer = Number(
    rechnungsnummer.replace(
      "RE-",
      "",
    ),
  );

  return Number.isInteger(nummer)
    ? nummer
    : 0;
}

function betragFormatieren(
  betrag: number,
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(betrag);
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

  return datumAlsObjekt.toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function heutigesDatumErmitteln() {
  const heute = new Date();

  const jahr = heute.getFullYear();
  const monat = String(
    heute.getMonth() + 1,
  ).padStart(2, "0");
  const tag = String(
    heute.getDate(),
  ).padStart(2, "0");

  return `${jahr}-${monat}-${tag}`;
}

function standardFaelligkeitsdatumErmitteln() {
  const datum = new Date();
  datum.setDate(
    datum.getDate() + 14,
  );

  const jahr = datum.getFullYear();
  const monat = String(
    datum.getMonth() + 1,
  ).padStart(2, "0");
  const tag = String(
    datum.getDate(),
  ).padStart(2, "0");

  return `${jahr}-${monat}-${tag}`;
}

export default function NeueRechnungPage() {
  const router = useRouter();

  const [kunden, setKunden] =
    useState<Kunde[]>([]);

  const [
    ausgewaehlteKundenId,
    setAusgewaehlteKundenId,
  ] = useState("");

  const [
    lieferscheine,
    setLieferscheine,
  ] = useState<Lieferschein[]>(
    [],
  );

  const [
    ausgewaehlteLieferscheinIds,
    setAusgewaehlteLieferscheinIds,
  ] = useState<number[]>([]);

  const [
    rechnungsnummer,
    setRechnungsnummer,
  ] = useState("");

  const [
    rechnungsdatum,
    setRechnungsdatum,
  ] = useState(
    heutigesDatumErmitteln(),
  );

  const [
    faelligAm,
    setFaelligAm,
  ] = useState(
    standardFaelligkeitsdatumErmitteln(),
  );

  const [notiz, setNotiz] =
    useState("");

  const [
    kundenWerdenGeladen,
    setKundenWerdenGeladen,
  ] = useState(true);

  const [
    lieferscheineWerdenGeladen,
    setLieferscheineWerdenGeladen,
  ] = useState(false);

  const [
    nummerWirdGeladen,
    setNummerWirdGeladen,
  ] = useState(true);

  const [speichert, setSpeichert] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  useEffect(() => {
    void grunddatenLaden();
  }, []);

  useEffect(() => {
    if (!ausgewaehlteKundenId) {
      setLieferscheine([]);
      setAusgewaehlteLieferscheinIds(
        [],
      );
      return;
    }

    void lieferscheineLaden(
      Number(
        ausgewaehlteKundenId,
      ),
    );
  }, [ausgewaehlteKundenId]);

  async function grunddatenLaden() {
    setKundenWerdenGeladen(true);
    setNummerWirdGeladen(true);
    setFehler("");

    try {
      const [
        kundenErgebnis,
        nummerErgebnis,
      ] = await Promise.all([
        supabase
          .from("kunden")
          .select(`
            id,
            kundennummer,
            vorname,
            nachname,
            firma,
            aktiv
          `)
          .eq("aktiv", true)
          .order("firma", {
            ascending: true,
            nullsFirst: false,
          })
          .order("nachname", {
            ascending: true,
            nullsFirst: false,
          }),

        supabase
          .from("rechnungen")
          .select("nummer")
          .order("nummer", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ]);

      if (kundenErgebnis.error) {
        throw new Error(
          kundenErgebnis.error.message,
        );
      }

      if (nummerErgebnis.error) {
        throw new Error(
          nummerErgebnis.error.message,
        );
      }

      const geladeneKunden = (
        (kundenErgebnis.data ??
          []) as DatenbankKunde[]
      ).map(kundeUmwandeln);

      const letzteRechnung =
        nummerErgebnis.data as
          | DatenbankRechnungsnummer
          | null;

      const letzteNummer =
        letzteRechnung?.nummer
          ? nummerAusRechnungsnummer(
              letzteRechnung.nummer,
            )
          : 0;

      setKunden(
        geladeneKunden,
      );

      setRechnungsnummer(
        rechnungsnummerFormatieren(
          letzteNummer + 1,
        ),
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Rechnungsdaten konnten nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Rechnungsdaten konnten nicht geladen werden.",
      );
    } finally {
      setKundenWerdenGeladen(false);
      setNummerWirdGeladen(false);
    }
  }

  async function lieferscheineLaden(
    kundenId: number,
  ) {
    setLieferscheineWerdenGeladen(
      true,
    );
    setFehler("");
    setLieferscheine([]);
    setAusgewaehlteLieferscheinIds(
      [],
    );

    try {
      const {
        data:
          bereitsAbgerechneteDaten,
        error:
          verknuepfungsFehler,
      } = await supabase
        .from(
          "rechnung_lieferscheine",
        )
        .select("lieferschein_id");

      if (verknuepfungsFehler) {
        throw new Error(
          verknuepfungsFehler.message,
        );
      }

      const bereitsAbgerechneteIds =
        new Set(
          (
            bereitsAbgerechneteDaten ??
            []
          ).map(
            (eintrag) =>
              eintrag.lieferschein_id,
          ),
        );

      const {
        data: lieferscheinDaten,
        error: lieferscheinFehler,
      } = await supabase
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
        .eq("kunde_id", kundenId)
        .order("erstellt_am", {
          ascending: false,
        });

      if (lieferscheinFehler) {
        throw new Error(
          lieferscheinFehler.message,
        );
      }

      const offeneLieferscheine = (
        (lieferscheinDaten ??
          []) as DatenbankLieferschein[]
      )
        .filter(
          (lieferschein) =>
            !bereitsAbgerechneteIds.has(
              lieferschein.id,
            ),
        )
        .map(
          lieferscheinUmwandeln,
        );

      setLieferscheine(
        offeneLieferscheine,
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Lieferscheine konnten nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Lieferscheine konnten nicht geladen werden.",
      );
    } finally {
      setLieferscheineWerdenGeladen(
        false,
      );
    }
  }

  const ausgewaehlterKunde =
    useMemo(() => {
      const kundenId = Number(
        ausgewaehlteKundenId,
      );

      return (
        kunden.find(
          (kunde) =>
            kunde.id === kundenId,
        ) ?? null
      );
    }, [
      kunden,
      ausgewaehlteKundenId,
    ]);

  const ausgewaehlteLieferscheine =
    useMemo(
      () =>
        lieferscheine.filter(
          (lieferschein) =>
            ausgewaehlteLieferscheinIds.includes(
              lieferschein.id,
            ),
        ),
      [
        lieferscheine,
        ausgewaehlteLieferscheinIds,
      ],
    );

  const gesamtbetrag = useMemo(
    () =>
      ausgewaehlteLieferscheine.reduce(
        (
          summe,
          lieferschein,
        ) =>
          summe +
          lieferschein.gesamtbetrag,
        0,
      ),
    [ausgewaehlteLieferscheine],
  );

  const gesamtteile = useMemo(
    () =>
      ausgewaehlteLieferscheine.reduce(
        (
          summe,
          lieferschein,
        ) =>
          summe +
          lieferschein.gesamtteile,
        0,
      ),
    [ausgewaehlteLieferscheine],
  );

  function lieferscheinAuswahlAendern(
    lieferscheinId: number,
  ) {
    setAusgewaehlteLieferscheinIds(
      (aktuelleIds) =>
        aktuelleIds.includes(
          lieferscheinId,
        )
          ? aktuelleIds.filter(
              (id) =>
                id !==
                lieferscheinId,
            )
          : [
              ...aktuelleIds,
              lieferscheinId,
            ],
    );

    setFehler("");
  }

  function alleLieferscheineAuswaehlen() {
    if (
      ausgewaehlteLieferscheinIds.length ===
      lieferscheine.length
    ) {
      setAusgewaehlteLieferscheinIds(
        [],
      );
      return;
    }

    setAusgewaehlteLieferscheinIds(
      lieferscheine.map(
        (lieferschein) =>
          lieferschein.id,
      ),
    );
  }

  async function rechnungSpeichern() {
    if (speichert) {
      return;
    }

    if (!ausgewaehlterKunde) {
      setFehler(
        "Bitte wähle zuerst einen Kunden aus.",
      );
      return;
    }

    if (
      ausgewaehlteLieferscheinIds.length ===
      0
    ) {
      setFehler(
        "Bitte wähle mindestens einen Lieferschein aus.",
      );
      return;
    }

    if (!rechnungsdatum) {
      setFehler(
        "Bitte gib ein Rechnungsdatum ein.",
      );
      return;
    }

    if (
      faelligAm &&
      faelligAm < rechnungsdatum
    ) {
      setFehler(
        "Das Fälligkeitsdatum darf nicht vor dem Rechnungsdatum liegen.",
      );
      return;
    }

    const bestaetigt =
      window.confirm(
        `Möchtest du die Rechnung ${rechnungsnummer} für ${kundenNameErmitteln(
          ausgewaehlterKunde,
        )} mit ${ausgewaehlteLieferscheinIds.length} Lieferschein(en) erstellen?`,
      );

    if (!bestaetigt) {
      return;
    }

    setSpeichert(true);
    setFehler("");

    let gespeicherteRechnungId:
      | number
      | null = null;

    try {
      const {
        data: rechnungsDaten,
        error: rechnungsFehler,
      } = await supabase
        .from("rechnungen")
        .insert({
          nummer: rechnungsnummer,
          kunde_id:
            ausgewaehlterKunde.id,
          status: "offen",
          gesamtbetrag,
          rechnungsdatum,
          faellig_am:
            faelligAm || null,
          bezahlt_am: null,
          notiz:
            notiz.trim() || null,
        })
        .select("id, nummer")
        .single();

      if (
        rechnungsFehler ||
        !rechnungsDaten
      ) {
        throw new Error(
          rechnungsFehler?.message ??
            "Die Rechnung konnte nicht gespeichert werden.",
        );
      }

      gespeicherteRechnungId =
        rechnungsDaten.id;

      const {
        error:
          verknuepfungsFehler,
      } = await supabase
        .from(
          "rechnung_lieferscheine",
        )
        .insert(
          ausgewaehlteLieferscheinIds.map(
            (lieferscheinId) => ({
              rechnung_id:
                rechnungsDaten.id,
              lieferschein_id:
                lieferscheinId,
            }),
          ),
        );

      if (verknuepfungsFehler) {
        throw new Error(
          verknuepfungsFehler.message,
        );
      }

      router.push(
        `/rechnung/${encodeURIComponent(
          rechnungsDaten.nummer,
        )}`,
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Rechnung konnte nicht gespeichert werden:",
        unbekannterFehler,
      );

      if (
        gespeicherteRechnungId !==
        null
      ) {
        await supabase
          .from("rechnungen")
          .delete()
          .eq(
            "id",
            gespeicherteRechnungId,
          );
      }

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Rechnung konnte nicht gespeichert werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <ZugriffsSchutz
      berechtigung="rechnungen_bearbeiten"
      titel="Rechnungserstellung gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine neuen Rechnungen erstellen."
      zurueckLink="/rechnungen"
      zurueckText="Zur Rechnungsübersicht"
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Neue Rechnung
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Mehrere Lieferscheine
              eines Kunden gemeinsam
              abrechnen
            </p>
          </div>

          <Link
            href="/rechnungen"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Zurück zu den Rechnungen
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-slate-900">
                1. Kunde auswählen
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Es werden nur aktive Kunden
                angezeigt.
              </p>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-700">
                  Kunde
                </span>

                <select
                  value={
                    ausgewaehlteKundenId
                  }
                  onChange={(event) => {
                    setAusgewaehlteKundenId(
                      event.target.value,
                    );
                    setFehler("");
                  }}
                  disabled={
                    kundenWerdenGeladen
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {kundenWerdenGeladen
                      ? "Kunden werden geladen ..."
                      : "Bitte Kunde auswählen"}
                  </option>

                  {kunden.map(
                    (kunde) => (
                      <option
                        key={kunde.id}
                        value={kunde.id}
                      >
                        {
                          kunde.kundennummer
                        }{" "}
                        –{" "}
                        {kundenNameErmitteln(
                          kunde,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {ausgewaehlterKunde && (
                <div className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-900">
                  <p className="font-bold">
                    {kundenNameErmitteln(
                      ausgewaehlterKunde,
                    )}
                  </p>

                  <p className="mt-1 text-sm">
                    {
                      ausgewaehlterKunde.kundennummer
                    }
                  </p>

                  <Link
                    href={`/kunde/${encodeURIComponent(
                      ausgewaehlterKunde.kundennummer,
                    )}`}
                    className="mt-3 inline-block text-sm font-bold text-blue-700 hover:underline"
                  >
                    Kundendetails öffnen
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    2. Lieferscheine
                    auswählen
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Bereits abgerechnete
                    Lieferscheine werden nicht
                    angezeigt.
                  </p>
                </div>

                {lieferscheine.length >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      alleLieferscheineAuswaehlen
                    }
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    {ausgewaehlteLieferscheinIds.length ===
                    lieferscheine.length
                      ? "Auswahl aufheben"
                      : "Alle auswählen"}
                  </button>
                )}
              </div>

              {!ausgewaehlteKundenId && (
                <div className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
                  Wähle zuerst einen Kunden
                  aus.
                </div>
              )}

              {lieferscheineWerdenGeladen && (
                <div className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
                  Lieferscheine werden
                  geladen ...
                </div>
              )}

              {ausgewaehlteKundenId &&
                !lieferscheineWerdenGeladen &&
                lieferscheine.length ===
                  0 && (
                  <div className="mt-5 rounded-xl bg-slate-100 p-6 text-center">
                    <h3 className="font-bold text-slate-900">
                      Keine offenen
                      Lieferscheine
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      Für diesen Kunden gibt
                      es keine noch nicht
                      abgerechneten
                      Lieferscheine.
                    </p>
                  </div>
                )}

              <div className="mt-5 space-y-4">
                {lieferscheine.map(
                  (lieferschein) => {
                    const istAusgewaehlt =
                      ausgewaehlteLieferscheinIds.includes(
                        lieferschein.id,
                      );

                    return (
                      <label
                        key={
                          lieferschein.id
                        }
                        className={`block cursor-pointer rounded-xl border p-5 ${
                          istAusgewaehlt
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={
                              istAusgewaehlt
                            }
                            onChange={() =>
                              lieferscheinAuswahlAendern(
                                lieferschein.id,
                              )
                            }
                            className="mt-1 h-5 w-5"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-lg font-bold text-slate-900">
                                  {
                                    lieferschein.nummer
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-600">
                                  {
                                    lieferschein.annahmestelle
                                  }
                                </p>
                              </div>

                              <p className="text-xl font-bold text-slate-900">
                                {betragFormatieren(
                                  lieferschein.gesamtbetrag,
                                )}
                              </p>
                            </div>

                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                              <div>
                                <p className="text-slate-500">
                                  Erstellt
                                </p>

                                <p className="mt-1 font-semibold text-slate-900">
                                  {datumFormatieren(
                                    lieferschein.erstelltAm,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Status
                                </p>

                                <p className="mt-1 font-semibold text-slate-900">
                                  {
                                    lieferschein.status
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Teile
                                </p>

                                <p className="mt-1 font-semibold text-slate-900">
                                  {
                                    lieferschein.gesamtteile
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  },
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-slate-900">
                3. Rechnungsdaten
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Rechnungsdatum
                  </span>

                  <input
                    type="date"
                    value={
                      rechnungsdatum
                    }
                    onChange={(event) =>
                      setRechnungsdatum(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Fällig am
                  </span>

                  <input
                    type="date"
                    value={faelligAm}
                    min={
                      rechnungsdatum
                    }
                    onChange={(event) =>
                      setFaelligAm(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-700">
                  Notiz
                </span>

                <textarea
                  rows={5}
                  value={notiz}
                  onChange={(event) =>
                    setNotiz(
                      event.target.value,
                    )
                  }
                  placeholder="Optionale interne Notiz zur Rechnung"
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>
            </div>
          </div>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow lg:sticky lg:top-6">
            <h2 className="text-xl font-bold text-slate-900">
              Rechnungsübersicht
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm text-slate-600">
                  Rechnungsnummer
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {nummerWirdGeladen
                    ? "Wird geladen ..."
                    : rechnungsnummer}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Kunde
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {ausgewaehlterKunde
                    ? kundenNameErmitteln(
                        ausgewaehlterKunde,
                      )
                    : "Noch nicht ausgewählt"}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Lieferscheine
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {
                    ausgewaehlteLieferscheinIds.length
                  }
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Gesamtteile
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {gesamtteile}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Gesamtbetrag
                </p>

                <p className="mt-1 text-3xl font-bold text-green-700">
                  {betragFormatieren(
                    gesamtbetrag,
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                rechnungSpeichern
              }
              disabled={
                speichert ||
                nummerWirdGeladen
              }
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {speichert
                ? "Rechnung wird gespeichert ..."
                : `Rechnung ${rechnungsnummer || ""} erstellen`}
            </button>
          </aside>
        </div>
      </section>
      </main>
    </ZugriffsSchutz>
  );
}