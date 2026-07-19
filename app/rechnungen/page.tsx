"use client";

import Link from "next/link";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useBenutzer } from "../context/BenutzerContext";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

type DatenbankKunde = {
  kundennummer: string;
  vorname: string | null;
  nachname: string | null;
  firma: string | null;
};

type DatenbankRechnungLieferschein = {
  id: number;
  lieferscheine:
    | {
        annahmestelle_id: number | null;
      }
    | {
        annahmestelle_id: number | null;
      }[]
    | null;
};

type DatenbankRechnung = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number | string;
  rechnungsdatum: string;
  faellig_am: string | null;
  bezahlt_am: string | null;
  notiz: string | null;
  erstellt_am: string;
  kunden:
    | DatenbankKunde
    | DatenbankKunde[]
    | null;
  rechnung_lieferscheine:
    | DatenbankRechnungLieferschein[]
    | null;
};

type Rechnung = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  rechnungsdatum: string;
  faelligAm: string | null;
  bezahltAm: string | null;
  notiz: string;
  erstelltAm: string;
  kunde: {
    kundennummer: string;
    vorname: string;
    nachname: string;
    firma: string;
  } | null;
  anzahlLieferscheine: number;
  annahmestellenIds: number[];
};

type StatusFilter =
  | "alle"
  | "offen"
  | "bezahlt"
  | "storniert";

function rechnungUmwandeln(
  daten: DatenbankRechnung,
): Rechnung {
  const kundenDaten = Array.isArray(
    daten.kunden,
  )
    ? daten.kunden[0] ?? null
    : daten.kunden;

  return {
    id: daten.id,
    nummer: daten.nummer,
    status: daten.status,
    gesamtbetrag: Number(
      daten.gesamtbetrag,
    ),
    rechnungsdatum:
      daten.rechnungsdatum,
    faelligAm: daten.faellig_am,
    bezahltAm: daten.bezahlt_am,
    notiz: daten.notiz ?? "",
    erstelltAm: daten.erstellt_am,
    kunde: kundenDaten
      ? {
          kundennummer:
            kundenDaten.kundennummer,
          vorname:
            kundenDaten.vorname ?? "",
          nachname:
            kundenDaten.nachname ?? "",
          firma:
            kundenDaten.firma ?? "",
        }
      : null,
    anzahlLieferscheine:
      daten.rechnung_lieferscheine
        ?.length ?? 0,
    annahmestellenIds: [
      ...new Set(
        (
          daten.rechnung_lieferscheine ??
          []
        )
          .flatMap((verknuepfung) => {
            if (
              !verknuepfung.lieferscheine
            ) {
              return [];
            }

            const lieferscheine =
              Array.isArray(
                verknuepfung.lieferscheine,
              )
                ? verknuepfung.lieferscheine
                : [
                    verknuepfung.lieferscheine,
                  ];

            return lieferscheine
              .map(
                (lieferschein) =>
                  lieferschein.annahmestelle_id,
              )
              .filter(
                (
                  annahmestellenId,
                ): annahmestellenId is number =>
                  annahmestellenId !== null,
              );
          }),
      ),
    ],
  };
}

function kundenNameErmitteln(
  rechnung: Rechnung,
) {
  if (!rechnung.kunde) {
    return "Unbekannter Kunde";
  }

  if (rechnung.kunde.firma.trim()) {
    return rechnung.kunde.firma;
  }

  const name = [
    rechnung.kunde.vorname,
    rechnung.kunde.nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unbekannter Kunde";
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
  datum: string | null,
) {
  if (!datum) {
    return "–";
  }

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

function statusTextFormatieren(
  status: string,
) {
  const normalisierterStatus =
    status.trim().toLowerCase();

  if (
    normalisierterStatus === "offen"
  ) {
    return "Offen";
  }

  if (
    normalisierterStatus ===
    "bezahlt"
  ) {
    return "Bezahlt";
  }

  if (
    normalisierterStatus ===
    "storniert"
  ) {
    return "Storniert";
  }

  return status || "Unbekannt";
}

function statusKlassenErmitteln(
  status: string,
) {
  const normalisierterStatus =
    status.trim().toLowerCase();

  if (
    normalisierterStatus ===
    "bezahlt"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalisierterStatus ===
    "offen"
  ) {
    return "bg-orange-100 text-orange-700";
  }

  if (
    normalisierterStatus ===
    "storniert"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

function rechnungIstUeberfaellig(
  rechnung: Rechnung,
) {
  if (
    rechnung.status
      .trim()
      .toLowerCase() !== "offen" ||
    !rechnung.faelligAm
  ) {
    return false;
  }

  const faelligkeitsdatum = new Date(
    `${rechnung.faelligAm}T23:59:59`,
  );

  return (
    !Number.isNaN(
      faelligkeitsdatum.getTime(),
    ) &&
    faelligkeitsdatum.getTime() <
      Date.now()
  );
}

export default function RechnungenPage() {
  const {
    aktuellerBenutzer,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const darfKundenAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "kunden_anzeigen",
    );

  const darfRechnungenBearbeiten =
    hatAktuellerBenutzerBerechtigung(
      "rechnungen_bearbeiten",
    );

  const [
    rechnungen,
    setRechnungen,
  ] = useState<Rechnung[]>([]);

  const [
    suchbegriff,
    setSuchbegriff,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("alle");

  const [laedt, setLaedt] =
    useState(true);

  const [fehler, setFehler] =
    useState("");

  useEffect(() => {
    void rechnungenLaden();
  }, [aktuellerBenutzer]);

  async function rechnungenLaden() {
    setLaedt(true);
    setFehler("");

    if (!aktuellerBenutzer) {
      setRechnungen([]);
      setLaedt(false);
      return;
    }

    if (
      aktuellerBenutzer.rolle ===
        "annahmestelle" &&
      aktuellerBenutzer.annahmestelleId ===
        null
    ) {
      setRechnungen([]);
      setFehler(
        "Diesem Benutzer ist keine Annahmestelle zugeordnet.",
      );
      setLaedt(false);
      return;
    }

    try {
      const { data, error } =
        await supabase
          .from("rechnungen")
          .select(`
            id,
            nummer,
            status,
            gesamtbetrag,
            rechnungsdatum,
            faellig_am,
            bezahlt_am,
            notiz,
            erstellt_am,
            kunden (
              kundennummer,
              vorname,
              nachname,
              firma
            ),
            rechnung_lieferscheine (
              id,
              lieferscheine (
                annahmestelle_id
              )
            )
          `)
          .order("rechnungsdatum", {
            ascending: false,
          })
          .order("erstellt_am", {
            ascending: false,
          });

      if (error) {
        throw new Error(error.message);
      }

      const alleRechnungen = (
        (data ?? []) as DatenbankRechnung[]
      ).map(rechnungUmwandeln);

      const annahmestellenId =
        aktuellerBenutzer.annahmestelleId;

      const geladeneRechnungen =
        aktuellerBenutzer.rolle ===
          "annahmestelle" &&
        annahmestellenId !== null
          ? alleRechnungen.filter(
              (rechnung) =>
                rechnung.annahmestellenIds.includes(
                  annahmestellenId,
                ),
            )
          : alleRechnungen;

      setRechnungen(
        geladeneRechnungen,
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Rechnungen konnten nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Rechnungen konnten nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  const gefilterteRechnungen =
    useMemo(() => {
      const normalisierterSuchbegriff =
        suchbegriff
          .trim()
          .toLowerCase();

      return rechnungen.filter(
        (rechnung) => {
          const statusPasst =
            statusFilter === "alle" ||
            rechnung.status
              .trim()
              .toLowerCase() ===
              statusFilter;

          if (!statusPasst) {
            return false;
          }

          if (
            !normalisierterSuchbegriff
          ) {
            return true;
          }

          const suchtext = [
            rechnung.nummer,
            rechnung.status,
            rechnung.kunde
              ?.kundennummer ?? "",
            rechnung.kunde?.vorname ??
              "",
            rechnung.kunde
              ?.nachname ?? "",
            rechnung.kunde?.firma ??
              "",
          ]
            .join(" ")
            .toLowerCase();

          return suchtext.includes(
            normalisierterSuchbegriff,
          );
        },
      );
    }, [
      rechnungen,
      statusFilter,
      suchbegriff,
    ]);

  const offeneRechnungen =
    useMemo(
      () =>
        rechnungen.filter(
          (rechnung) =>
            rechnung.status
              .trim()
              .toLowerCase() ===
            "offen",
        ),
      [rechnungen],
    );

  const bezahlteRechnungen =
    useMemo(
      () =>
        rechnungen.filter(
          (rechnung) =>
            rechnung.status
              .trim()
              .toLowerCase() ===
            "bezahlt",
        ),
      [rechnungen],
    );

  const offenerBetrag = useMemo(
    () =>
      offeneRechnungen.reduce(
        (summe, rechnung) =>
          summe +
          rechnung.gesamtbetrag,
        0,
      ),
    [offeneRechnungen],
  );

  const bezahlterBetrag = useMemo(
    () =>
      bezahlteRechnungen.reduce(
        (summe, rechnung) =>
          summe +
          rechnung.gesamtbetrag,
        0,
      ),
    [bezahlteRechnungen],
  );

  const ueberfaelligeRechnungen =
    useMemo(
      () =>
        rechnungen.filter(
          rechnungIstUeberfaellig,
        ).length,
      [rechnungen],
    );

  return (
    <ZugriffsSchutz
      berechtigung="rechnungen_anzeigen"
      titel="Rechnungen gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Rechnungen anzeigen."
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Rechnungen
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Sammelrechnungen verwalten
              und prüfen
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {darfKundenAnzeigen && (
              <Link
                href="/kunden"
                className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
              >
                Kunden
              </Link>
            )}

            <Link
              href="/lieferscheine"
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
            >
              Lieferscheine
            </Link>

            {darfRechnungenBearbeiten && (
              <Link
                href="/rechnung/neu"
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
              >
                Neue Rechnung
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {fehler && (
          <div className="mb-6 rounded-2xl bg-red-100 p-5 text-red-800 shadow">
            <p className="font-bold">
              Rechnungen konnten nicht
              geladen werden
            </p>

            <p className="mt-1">
              {fehler}
            </p>

            <button
              type="button"
              onClick={() =>
                void rechnungenLaden()
              }
              className="mt-4 rounded-xl bg-red-800 px-5 py-3 font-bold text-white"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Rechnungen insgesamt
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {rechnungen.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Offener Betrag
            </p>

            <p className="mt-1 text-3xl font-bold text-orange-700">
              {betragFormatieren(
                offenerBetrag,
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {offeneRechnungen.length}{" "}
              offene Rechnungen
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Bezahlter Betrag
            </p>

            <p className="mt-1 text-3xl font-bold text-green-700">
              {betragFormatieren(
                bezahlterBetrag,
              )}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {bezahlteRechnungen.length}{" "}
              bezahlte Rechnungen
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-600">
              Überfällig
            </p>

            <p
              className={`mt-1 text-3xl font-bold ${
                ueberfaelligeRechnungen >
                0
                  ? "text-red-700"
                  : "text-slate-900"
              }`}
            >
              {ueberfaelligeRechnungen}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow">
          <div className="grid gap-4 md:grid-cols-[1fr_240px]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Rechnungen suchen
              </span>

              <input
                type="search"
                value={suchbegriff}
                onChange={(event) =>
                  setSuchbegriff(
                    event.target.value,
                  )
                }
                placeholder="Rechnungsnummer, Kunde oder Kundennummer"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
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
                  Alle Status
                </option>

                <option value="offen">
                  Offen
                </option>

                <option value="bezahlt">
                  Bezahlt
                </option>

                <option value="storniert">
                  Storniert
                </option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Rechnungsübersicht
              </h2>

              <p className="mt-1 text-slate-600">
                {
                  gefilterteRechnungen.length
                }{" "}
                angezeigte Rechnungen
              </p>
            </div>

            {(suchbegriff ||
              statusFilter !==
                "alle") && (
              <button
                type="button"
                onClick={() => {
                  setSuchbegriff("");
                  setStatusFilter("alle");
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
                Rechnungen werden aus
                Supabase geladen ...
              </p>
            </div>
          )}

          {!laedt &&
            !fehler &&
            rechnungen.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center shadow">
                <h3 className="text-xl font-bold text-slate-900">
                  Noch keine Rechnungen
                </h3>

                <p className="mt-2 text-slate-600">
                  Erstelle die erste
                  Sammelrechnung aus den
                  Lieferscheinen eines Kunden.
                </p>

                {darfRechnungenBearbeiten && (
                  <Link
                    href="/rechnung/neu"
                    className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
                  >
                    Neue Rechnung erstellen
                  </Link>
                )}
              </div>
            )}

          {!laedt &&
            rechnungen.length > 0 &&
            gefilterteRechnungen.length ===
              0 && (
              <div className="rounded-2xl bg-white p-8 text-center shadow">
                <h3 className="text-xl font-bold text-slate-900">
                  Keine Rechnungen gefunden
                </h3>

                <p className="mt-2 text-slate-600">
                  Ändere den Suchbegriff
                  oder den Statusfilter.
                </p>
              </div>
            )}

          <div className="space-y-4">
            {!laedt &&
              gefilterteRechnungen.map(
                (rechnung) => {
                  const istUeberfaellig =
                    rechnungIstUeberfaellig(
                      rechnung,
                    );

                  return (
                    <article
                      key={rechnung.id}
                      className="rounded-2xl bg-white p-6 shadow"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900">
                              {rechnung.nummer}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${statusKlassenErmitteln(
                                rechnung.status,
                              )}`}
                            >
                              {statusTextFormatieren(
                                rechnung.status,
                              )}
                            </span>

                            {istUeberfaellig && (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                                Überfällig
                              </span>
                            )}
                          </div>

                          <div className="mt-4">
                            <p className="font-bold text-slate-900">
                              {kundenNameErmitteln(
                                rechnung,
                              )}
                            </p>

                            {rechnung.kunde && (
                              <p className="mt-1 text-sm text-slate-600">
                                {
                                  rechnung
                                    .kunde
                                    .kundennummer
                                }
                              </p>
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            <div>
                              <p className="text-slate-500">
                                Rechnungsdatum
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {datumFormatieren(
                                  rechnung.rechnungsdatum,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Fällig am
                              </p>

                              <p
                                className={`mt-1 font-semibold ${
                                  istUeberfaellig
                                    ? "text-red-700"
                                    : "text-slate-900"
                                }`}
                              >
                                {datumFormatieren(
                                  rechnung.faelligAm,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Lieferscheine
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {
                                  rechnung.anzahlLieferscheine
                                }
                              </p>
                            </div>
                          </div>

                          {rechnung.notiz && (
                            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                              {rechnung.notiz}
                            </p>
                          )}
                        </div>

                        <div className="flex min-w-[180px] flex-col items-end gap-4">
                          <p className="text-2xl font-bold text-slate-900">
                            {betragFormatieren(
                              rechnung.gesamtbetrag,
                            )}
                          </p>

                          <Link
                            href={`/rechnung/${encodeURIComponent(
                              rechnung.nummer,
                            )}`}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                          >
                            Rechnung öffnen
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
          </div>
        </div>
      </section>
      </main>
    </ZugriffsSchutz>
  );
}