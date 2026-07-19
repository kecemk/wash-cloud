"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { supabase } from "../../lib/supabase";

type Lagerartikel = {
  id: number;
  name: string;
  einheit: string;
};

type Benutzer = {
  id: number;
  benutzername: string;
  vorname: string | null;
  nachname: string | null;
};

type DatenbankBewegung = {
  id: number;
  buchungsart:
    | "wareneingang"
    | "verbrauch"
    | "korrektur"
    | "rueckgabe";
  menge: number;
  bestand_vorher: number;
  bestand_nachher: number;
  notiz: string | null;
  erstellt_am: string;
  einkaufspreis_pro_einheit:
    | number
    | null;
  lagerartikel:
    | Lagerartikel
    | Lagerartikel[]
    | null;
  benutzer:
    | Benutzer
    | Benutzer[]
    | null;
};

type Bewegung = {
  id: number;
  buchungsart:
    | "wareneingang"
    | "verbrauch"
    | "korrektur"
    | "rueckgabe";
  menge: number;
  bestandVorher: number;
  bestandNachher: number;
  notiz: string;
  erstelltAm: string;
  artikelId: number | null;
  artikelname: string;
  einheit: string;
  einkaufspreis: number | null;
  benutzerId: number | null;
  benutzername: string;
};

type ArtikelStatistik = {
  artikelId: number | null;
  artikelname: string;
  einheit: string;
  menge: number;
  kosten: number;
};

type BenutzerStatistik = {
  benutzerId: number | null;
  benutzername: string;
  menge: number;
  buchungen: number;
};

function einzelnesElementErmitteln<T>(
  wert: T | T[] | null,
): T | null {
  if (Array.isArray(wert)) {
    return wert[0] ?? null;
  }

  return wert;
}

function monatAlsWert(
  datum: Date,
) {
  return `${datum.getFullYear()}-${String(
    datum.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function monatsGrenzenErmitteln(
  monat: string,
) {
  const [jahrText, monatText] =
    monat.split("-");

  const jahr = Number(jahrText);
  const monatsIndex =
    Number(monatText) - 1;

  const start = new Date(
    jahr,
    monatsIndex,
    1,
    0,
    0,
    0,
    0,
  );

  const ende = new Date(
    jahr,
    monatsIndex + 1,
    1,
    0,
    0,
    0,
    0,
  );

  return {
    start,
    ende,
  };
}

function vorherigenMonatErmitteln(
  monat: string,
) {
  const { start } =
    monatsGrenzenErmitteln(monat);

  return monatAlsWert(
    new Date(
      start.getFullYear(),
      start.getMonth() - 1,
      1,
    ),
  );
}

function zahlFormatieren(
  wert: number,
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      maximumFractionDigits: 3,
    },
  ).format(wert);
}

function euroFormatieren(
  wert: number,
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(wert);
}

function datumFormatieren(
  wert: string,
) {
  return new Date(
    wert,
  ).toLocaleString(
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

function benutzerNameErmitteln(
  benutzer: Benutzer | null,
) {
  if (!benutzer) {
    return "Unbekannter Benutzer";
  }

  const vollerName = [
    benutzer.vorname,
    benutzer.nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return vollerName ||
    benutzer.benutzername;
}

function bewegungUmwandeln(
  daten: DatenbankBewegung,
): Bewegung {
  const artikel =
    einzelnesElementErmitteln(
      daten.lagerartikel,
    );

  const benutzer =
    einzelnesElementErmitteln(
      daten.benutzer,
    );

  return {
    id: Number(daten.id),
    buchungsart:
      daten.buchungsart,
    menge: Number(daten.menge),
    bestandVorher: Number(
      daten.bestand_vorher,
    ),
    bestandNachher: Number(
      daten.bestand_nachher,
    ),
    notiz: daten.notiz ?? "",
    erstelltAm:
      daten.erstellt_am,
    artikelId:
      artikel?.id ?? null,
    artikelname:
      artikel?.name ??
      "Gelöschter Artikel",
    einheit:
      artikel?.einheit ?? "",
    einkaufspreis:
      daten.einkaufspreis_pro_einheit ===
      null
        ? null
        : Number(
            daten.einkaufspreis_pro_einheit,
          ),
    benutzerId:
      benutzer?.id ?? null,
    benutzername:
      benutzerNameErmitteln(
        benutzer,
      ),
  };
}

function buchungsartFormatieren(
  buchungsart: Bewegung["buchungsart"],
) {
  if (
    buchungsart === "wareneingang"
  ) {
    return "Wareneingang";
  }

  if (
    buchungsart === "verbrauch"
  ) {
    return "Verbrauch";
  }

  if (
    buchungsart === "rueckgabe"
  ) {
    return "Rückgabe";
  }

  return "Korrektur";
}

export default function LagerStatistikPage() {
  const [monat, setMonat] =
    useState(
      monatAlsWert(new Date()),
    );

  const [bewegungen, setBewegungen] =
    useState<Bewegung[]>([]);

  const [
    vormonatVerbrauch,
    setVormonatVerbrauch,
  ] = useState(0);

  const [laedt, setLaedt] =
    useState(true);

  const [fehler, setFehler] =
    useState("");

  useEffect(() => {
    void statistikLaden();
  }, [monat]);

  async function statistikLaden() {
    setLaedt(true);
    setFehler("");

    try {
      const {
        start,
        ende,
      } = monatsGrenzenErmitteln(
        monat,
      );

      const vormonat =
        vorherigenMonatErmitteln(
          monat,
        );

      const {
        start: vormonatStart,
        ende: vormonatEnde,
      } = monatsGrenzenErmitteln(
        vormonat,
      );

      const [
        aktuellerMonatErgebnis,
        vormonatErgebnis,
      ] = await Promise.all([
        supabase
          .from("lagerbewegungen")
          .select(`
            id,
            buchungsart,
            menge,
            bestand_vorher,
            bestand_nachher,
            notiz,
            erstellt_am,
            einkaufspreis_pro_einheit,
            lagerartikel (
              id,
              name,
              einheit
            ),
            benutzer (
              id,
              benutzername,
              vorname,
              nachname
            )
          `)
          .gte(
            "erstellt_am",
            start.toISOString(),
          )
          .lt(
            "erstellt_am",
            ende.toISOString(),
          )
          .order(
            "erstellt_am",
            {
              ascending: false,
            },
          ),

        supabase
          .from("lagerbewegungen")
          .select(`
            menge
          `)
          .eq(
            "buchungsart",
            "verbrauch",
          )
          .gte(
            "erstellt_am",
            vormonatStart.toISOString(),
          )
          .lt(
            "erstellt_am",
            vormonatEnde.toISOString(),
          ),
      ]);

      if (
        aktuellerMonatErgebnis.error
      ) {
        throw new Error(
          aktuellerMonatErgebnis.error
            .message,
        );
      }

      if (vormonatErgebnis.error) {
        throw new Error(
          vormonatErgebnis.error
            .message,
        );
      }

      const geladeneBewegungen =
        (
          aktuellerMonatErgebnis.data ??
          []
        ).map(
          (eintrag) =>
            bewegungUmwandeln(
              eintrag as DatenbankBewegung,
            ),
        );

      setBewegungen(
        geladeneBewegungen,
      );

      setVormonatVerbrauch(
        (
          vormonatErgebnis.data ??
          []
        ).reduce(
          (
            summe,
            eintrag,
          ) =>
            summe +
            Number(eintrag.menge),
          0,
        ),
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Lagerstatistik konnte nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Lagerstatistik konnte nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  const verbrauchBewegungen =
    useMemo(
      () =>
        bewegungen.filter(
          (bewegung) =>
            bewegung.buchungsart ===
            "verbrauch",
        ),
      [bewegungen],
    );

  const verbrauchGesamt =
    useMemo(
      () =>
        verbrauchBewegungen.reduce(
          (
            summe,
            bewegung,
          ) =>
            summe +
            bewegung.menge,
          0,
        ),
      [verbrauchBewegungen],
    );

  const wareneingangGesamt =
    useMemo(
      () =>
        bewegungen
          .filter(
            (bewegung) =>
              bewegung.buchungsart ===
              "wareneingang",
          )
          .reduce(
            (
              summe,
              bewegung,
            ) =>
              summe +
              bewegung.menge,
            0,
          ),
      [bewegungen],
    );

  const kostenGesamt =
    useMemo(
      () =>
        verbrauchBewegungen.reduce(
          (
            summe,
            bewegung,
          ) =>
            summe +
            (
              bewegung.einkaufspreis ??
              0
            ) *
              bewegung.menge,
          0,
        ),
      [verbrauchBewegungen],
    );

  const artikelStatistik =
    useMemo(() => {
      const statistik =
        new Map<
          string,
          ArtikelStatistik
        >();

      for (
        const bewegung of
        verbrauchBewegungen
      ) {
        const schluessel =
          `${bewegung.artikelId ?? "unbekannt"}-${bewegung.einheit}`;

        const vorhandenerEintrag =
          statistik.get(
            schluessel,
          );

        const kosten =
          (
            bewegung.einkaufspreis ??
            0
          ) *
          bewegung.menge;

        if (vorhandenerEintrag) {
          vorhandenerEintrag.menge +=
            bewegung.menge;

          vorhandenerEintrag.kosten +=
            kosten;
        } else {
          statistik.set(
            schluessel,
            {
              artikelId:
                bewegung.artikelId,
              artikelname:
                bewegung.artikelname,
              einheit:
                bewegung.einheit,
              menge:
                bewegung.menge,
              kosten,
            },
          );
        }
      }

      return Array.from(
        statistik.values(),
      ).sort(
        (a, b) =>
          b.menge - a.menge,
      );
    }, [verbrauchBewegungen]);

  const benutzerStatistik =
    useMemo(() => {
      const statistik =
        new Map<
          string,
          BenutzerStatistik
        >();

      for (
        const bewegung of
        verbrauchBewegungen
      ) {
        const schluessel =
          String(
            bewegung.benutzerId ??
            "unbekannt",
          );

        const vorhandenerEintrag =
          statistik.get(
            schluessel,
          );

        if (vorhandenerEintrag) {
          vorhandenerEintrag.menge +=
            bewegung.menge;

          vorhandenerEintrag.buchungen +=
            1;
        } else {
          statistik.set(
            schluessel,
            {
              benutzerId:
                bewegung.benutzerId,
              benutzername:
                bewegung.benutzername,
              menge:
                bewegung.menge,
              buchungen: 1,
            },
          );
        }
      }

      return Array.from(
        statistik.values(),
      ).sort(
        (a, b) =>
          b.menge - a.menge,
      );
    }, [verbrauchBewegungen]);

  const vergleichZumVormonat =
    vormonatVerbrauch === 0
      ? null
      : (
          (
            verbrauchGesamt -
            vormonatVerbrauch
          ) /
          vormonatVerbrauch
        ) *
        100;

  return (
    <ZugriffsSchutz
      berechtigung="lager_anzeigen"
      titel="Lagerstatistik gesperrt"
      beschreibung="Du darfst die Lagerstatistik nicht öffnen."
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-6 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Wash Cloud
              </p>

              <h1 className="text-3xl font-bold">
                Lagerstatistik
              </h1>

              <p className="mt-1 text-slate-300">
                Monatsverbrauch, Wareneingänge
                und Buchungsverlauf
              </p>
            </div>

            <Link
              href="/lager"
              className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
            >
              Zur Lagerübersicht
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-2xl bg-white p-5 shadow">
            <label className="block max-w-xs">
              <span className="text-sm font-medium text-slate-700">
                Monat auswählen
              </span>

              <input
                type="month"
                value={monat}
                onChange={(event) =>
                  setMonat(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
              />
            </label>
          </div>

          {fehler && (
            <div className="mt-6 rounded-2xl bg-red-100 p-5 text-red-800 shadow">
              <p className="font-bold">
                Statistik konnte nicht geladen werden
              </p>

              <p className="mt-1">
                {fehler}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Verbrauch gesamt
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {zahlFormatieren(
                  verbrauchGesamt,
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                über alle Einheiten
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Verbrauchskosten
              </p>

              <p className="mt-1 text-3xl font-bold text-red-700">
                {euroFormatieren(
                  kostenGesamt,
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Wareneingang gesamt
              </p>

              <p className="mt-1 text-3xl font-bold text-green-700">
                {zahlFormatieren(
                  wareneingangGesamt,
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                über alle Einheiten
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Vergleich zum Vormonat
              </p>

              <p className="mt-1 text-3xl font-bold text-blue-700">
                {vergleichZumVormonat ===
                null
                  ? "–"
                  : `${vergleichZumVormonat >= 0 ? "+" : ""}${zahlFormatieren(
                      vergleichZumVormonat,
                    )} %`}
              </p>
            </div>
          </div>

          {laedt && (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow">
              <p className="text-slate-600">
                Statistik wird geladen ...
              </p>
            </div>
          )}

          {!laedt && (
            <>
              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow">
                  <h2 className="text-2xl font-bold text-slate-950">
                    Verbrauch je Artikel
                  </h2>

                  {artikelStatistik.length ===
                  0 ? (
                    <p className="mt-4 text-slate-600">
                      In diesem Monat wurde noch
                      kein Verbrauch gebucht.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {artikelStatistik.map(
                        (eintrag) => (
                          <div
                            key={`${eintrag.artikelId}-${eintrag.einheit}`}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {
                                    eintrag.artikelname
                                  }
                                </p>

                                <p className="text-sm text-slate-500">
                                  {
                                    eintrag.einheit
                                  }
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xl font-bold text-slate-950">
                                  {zahlFormatieren(
                                    eintrag.menge,
                                  )}{" "}
                                  {
                                    eintrag.einheit
                                  }
                                </p>

                                <p className="text-sm text-red-700">
                                  {euroFormatieren(
                                    eintrag.kosten,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white p-6 shadow">
                  <h2 className="text-2xl font-bold text-slate-950">
                    Verbrauch je Mitarbeiter
                  </h2>

                  {benutzerStatistik.length ===
                  0 ? (
                    <p className="mt-4 text-slate-600">
                      In diesem Monat gibt es noch
                      keine Verbrauchsbuchungen.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {benutzerStatistik.map(
                        (eintrag) => (
                          <div
                            key={
                              eintrag.benutzerId ??
                              "unbekannt"
                            }
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {
                                    eintrag.benutzername
                                  }
                                </p>

                                <p className="text-sm text-slate-500">
                                  {
                                    eintrag.buchungen
                                  }{" "}
                                  Buchungen
                                </p>
                              </div>

                              <p className="text-xl font-bold text-slate-950">
                                {zahlFormatieren(
                                  eintrag.menge,
                                )}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-white p-6 shadow">
                <h2 className="text-2xl font-bold text-slate-950">
                  Buchungsverlauf
                </h2>

                {bewegungen.length === 0 ? (
                  <p className="mt-4 text-slate-600">
                    Für diesen Monat sind keine
                    Lagerbewegungen vorhanden.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="px-3 py-3">
                            Zeitpunkt
                          </th>

                          <th className="px-3 py-3">
                            Artikel
                          </th>

                          <th className="px-3 py-3">
                            Art
                          </th>

                          <th className="px-3 py-3">
                            Menge
                          </th>

                          <th className="px-3 py-3">
                            Bestand
                          </th>

                          <th className="px-3 py-3">
                            Benutzer
                          </th>

                          <th className="px-3 py-3">
                            Notiz
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {bewegungen.map(
                          (bewegung) => (
                            <tr
                              key={
                                bewegung.id
                              }
                              className="border-b border-slate-100"
                            >
                              <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                                {datumFormatieren(
                                  bewegung.erstelltAm,
                                )}
                              </td>

                              <td className="px-3 py-3 font-semibold text-slate-950">
                                {
                                  bewegung.artikelname
                                }
                              </td>

                              <td className="px-3 py-3">
                                {buchungsartFormatieren(
                                  bewegung.buchungsart,
                                )}
                              </td>

                              <td className="px-3 py-3 font-semibold">
                                {zahlFormatieren(
                                  bewegung.menge,
                                )}{" "}
                                {
                                  bewegung.einheit
                                }
                              </td>

                              <td className="px-3 py-3">
                                {zahlFormatieren(
                                  bewegung.bestandVorher,
                                )}{" "}
                                →{" "}
                                {zahlFormatieren(
                                  bewegung.bestandNachher,
                                )}
                              </td>

                              <td className="px-3 py-3">
                                {
                                  bewegung.benutzername
                                }
                              </td>

                              <td className="px-3 py-3 text-slate-600">
                                {bewegung.notiz ||
                                  "–"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </ZugriffsSchutz>
  );
}