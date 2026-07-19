"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DruckButton from "../../components/DruckButton";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { useBenutzer } from "../../context/BenutzerContext";
import { supabase } from "../../lib/supabase";

type DatenbankAnnahmestelle = {
  name: string;
};

type DatenbankLieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number | string;
  gesamtteile: number;
};

type DatenbankLieferungLieferschein = {
  lieferscheine:
    | DatenbankLieferschein
    | DatenbankLieferschein[]
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
    | DatenbankLieferungLieferschein[]
    | null;
};

type Lieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  gesamtteile: number;
};

type Lieferung = {
  id: number;
  nummer: string;
  status: string;
  erstelltAm: string;
  geliefertAm: string | null;
  annahmestelle: string;
  lieferscheine: Lieferschein[];
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

function lieferungUmwandeln(
  daten: DatenbankLieferung,
): Lieferung {
  const lieferscheine = (
    daten.lieferung_lieferscheine ?? []
  ).flatMap((verknuepfung) => {
    const verknuepfteLieferscheine =
      verknuepfung.lieferscheine;

    if (!verknuepfteLieferscheine) {
      return [];
    }

    const liste = Array.isArray(
      verknuepfteLieferscheine,
    )
      ? verknuepfteLieferscheine
      : [verknuepfteLieferscheine];

    return liste.map(
      (lieferschein): Lieferschein => ({
        id: lieferschein.id,
        nummer: lieferschein.nummer,
        status: lieferschein.status,
        gesamtbetrag: zahlUmwandeln(
          lieferschein.gesamtbetrag,
        ),
        gesamtteile: lieferschein.gesamtteile ?? 0,
      }),
    );
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
    return "bg-green-100 text-green-700 print:border print:border-green-700 print:bg-white print:text-slate-900";
  }

  if (
    normalisierterStatus === "offen" ||
    normalisierterStatus === "erstellt"
  ) {
    return "bg-yellow-100 text-yellow-800 print:border print:border-yellow-700 print:bg-white print:text-slate-900";
  }

  return "bg-slate-100 text-slate-700 print:border print:border-slate-500 print:bg-white print:text-slate-900";
}

export default function LieferungDetailPage() {
  const {
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const darfLieferungenBearbeiten =
    hatAktuellerBenutzerBerechtigung(
      "lieferungen_bearbeiten",
    );

  const params = useParams<{ nummer: string }>();

  const [lieferung, setLieferung] =
    useState<Lieferung | null>(null);

  const [datenGeladen, setDatenGeladen] =
    useState(false);

  const [schliesstAb, setSchliesstAb] =
    useState(false);

  const [fehler, setFehler] = useState("");

  const [erfolgsmeldung, setErfolgsmeldung] =
    useState("");

  useEffect(() => {
    let istAktiv = true;

    async function lieferungLaden() {
      setDatenGeladen(false);
      setFehler("");
      setErfolgsmeldung("");

      try {
        const gesuchteNummer = decodeURIComponent(
          params.nummer,
        );

        const { data, error } = await supabase
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
          .eq("nummer", gesuchteNummer)
          .single();

        if (!istAktiv) {
          return;
        }

        if (error) {
          console.error(
            "Die Lieferung konnte nicht geladen werden:",
            error,
          );

          setFehler(error.message);
          setLieferung(null);
          return;
        }

        if (!data) {
          setLieferung(null);
          return;
        }

        const geladeneLieferung =
          lieferungUmwandeln(
            data as unknown as DatenbankLieferung,
          );

        setLieferung(geladeneLieferung);
      } catch (unbekannterFehler) {
        console.error(
          "Die Lieferung konnte nicht geladen werden:",
          unbekannterFehler,
        );

        if (!istAktiv) {
          return;
        }

        setFehler(
          unbekannterFehler instanceof Error
            ? unbekannterFehler.message
            : "Die Lieferung konnte nicht geladen werden.",
        );

        setLieferung(null);
      } finally {
        if (istAktiv) {
          setDatenGeladen(true);
        }
      }
    }

    void lieferungLaden();

    return () => {
      istAktiv = false;
    };
  }, [params.nummer]);

  const gesamtbetrag = useMemo(
    () =>
      lieferung?.lieferscheine.reduce(
        (summe, lieferschein) =>
          summe + lieferschein.gesamtbetrag,
        0,
      ) ?? 0,
    [lieferung],
  );

  const gesamtteile = useMemo(
    () =>
      lieferung?.lieferscheine.reduce(
        (summe, lieferschein) =>
          summe + lieferschein.gesamtteile,
        0,
      ) ?? 0,
    [lieferung],
  );

  const istAbgeschlossen =
    lieferung?.status.toLowerCase() === "geliefert";

  async function lieferungAbschliessen() {
    if (
      !darfLieferungenBearbeiten ||
      !lieferung ||
      schliesstAb ||
      istAbgeschlossen
    ) {
      return;
    }

    if (lieferung.lieferscheine.length === 0) {
      setFehler(
        "Die Lieferung kann nicht abgeschlossen werden, weil keine Lieferscheine zugeordnet sind.",
      );
      return;
    }

    const bestaetigt = window.confirm(
      `Möchtest du die Lieferung ${lieferung.nummer} wirklich abschließen? Alle zugeordneten Lieferscheine werden anschließend als geliefert markiert.`,
    );

    if (!bestaetigt) {
      return;
    }

    setSchliesstAb(true);
    setFehler("");
    setErfolgsmeldung("");

    const geliefertAm = new Date().toISOString();
    const lieferscheinIds =
      lieferung.lieferscheine.map(
        (lieferschein) => lieferschein.id,
      );

    let lieferungWurdeAktualisiert = false;

    try {
      const { error: lieferungFehler } =
        await supabase
          .from("lieferungen")
          .update({
            status: "geliefert",
            geliefert_am: geliefertAm,
          })
          .eq("id", lieferung.id);

      if (lieferungFehler) {
        throw new Error(lieferungFehler.message);
      }

      lieferungWurdeAktualisiert = true;

      const { error: lieferscheineFehler } =
        await supabase
          .from("lieferscheine")
          .update({
            status: "geliefert",
          })
          .in("id", lieferscheinIds);

      if (lieferscheineFehler) {
        throw new Error(lieferscheineFehler.message);
      }

      setLieferung((aktuelleLieferung) => {
        if (!aktuelleLieferung) {
          return aktuelleLieferung;
        }

        return {
          ...aktuelleLieferung,
          status: "geliefert",
          geliefertAm,
          lieferscheine:
            aktuelleLieferung.lieferscheine.map(
              (lieferschein) => ({
                ...lieferschein,
                status: "geliefert",
              }),
            ),
        };
      });

      setErfolgsmeldung(
        `Die Lieferung ${lieferung.nummer} wurde erfolgreich abgeschlossen.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Die Lieferung konnte nicht abgeschlossen werden:",
        unbekannterFehler,
      );

      if (lieferungWurdeAktualisiert) {
        const { error: ruecksetzFehler } =
          await supabase
            .from("lieferungen")
            .update({
              status: "offen",
              geliefert_am: null,
            })
            .eq("id", lieferung.id);

        if (ruecksetzFehler) {
          console.error(
            "Die Lieferung konnte nach dem Fehler nicht zurückgesetzt werden:",
            ruecksetzFehler,
          );
        }
      }

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Lieferung konnte nicht abgeschlossen werden.",
      );
    } finally {
      setSchliesstAb(false);
    }
  }

  return (
    <ZugriffsSchutz
      berechtigung="lieferungen_anzeigen"
      titel="Lieferungsdetails gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Lieferungsdetails anzeigen."
      zurueckLink="/lieferungen"
      zurueckText="Zur Lieferungsübersicht"
    >
      <main className="min-h-screen bg-slate-50 print:bg-white">
      <header className="bg-slate-950 px-6 py-5 text-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Lieferungs-Details
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Lieferung und zugeordnete Lieferscheine
            </p>
          </div>

          <Link
            href="/lieferungen"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Zurück zu den Lieferungen
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        {!datenGeladen && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Lieferung wird aus Supabase geladen ...
            </p>
          </div>
        )}

        {datenGeladen && fehler && (
          <div className="mb-6 rounded-2xl bg-red-100 p-6 text-red-800 shadow print:hidden">
            <h2 className="text-xl font-bold">
              Vorgang fehlgeschlagen
            </h2>

            <p className="mt-2 text-sm">
              {fehler}
            </p>

            {!lieferung && (
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
                  href="/lieferungen"
                  className="rounded-xl border border-red-300 bg-white px-5 py-3 font-bold text-red-800"
                >
                  Zurück zur Übersicht
                </Link>
              </div>
            )}
          </div>
        )}

        {datenGeladen && erfolgsmeldung && (
          <div className="mb-6 rounded-2xl bg-green-100 p-6 text-green-800 shadow print:hidden">
            <h2 className="text-xl font-bold">
              Lieferung abgeschlossen
            </h2>

            <p className="mt-2">
              {erfolgsmeldung}
            </p>
          </div>
        )}

        {datenGeladen &&
          !fehler &&
          !lieferung && (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <h2 className="text-xl font-bold text-slate-900">
                Lieferung nicht gefunden
              </h2>

              <p className="mt-2 text-slate-600">
                Unter dieser Nummer wurde in Supabase
                keine Lieferung gefunden.
              </p>

              <Link
                href="/lieferungen"
                className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Zurück zu den Lieferungen
              </Link>
            </div>
          )}

        {datenGeladen && lieferung && (
          <>
            <div className="mb-6 flex flex-wrap gap-3 print:hidden">
              {darfLieferungenBearbeiten &&
                !istAbgeschlossen && (
                <button
                  type="button"
                  onClick={lieferungAbschliessen}
                  disabled={schliesstAb}
                  className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {schliesstAb
                    ? "Lieferung wird abgeschlossen ..."
                    : "Lieferung abschließen"}
                </button>
              )}

              <DruckButton />

              <Link
                href="/lieferungen"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
              >
                Zurück
              </Link>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow print:rounded-none print:p-0 print:shadow-none">
              <div className="hidden border-b border-slate-300 pb-5 print:block">
                <p className="text-sm font-semibold text-slate-600">
                  Wash Cloud
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-950">
                  Lieferung
                </h1>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4 print:mt-6">
                <div>
                  <p className="text-sm text-slate-600">
                    Lieferungsnummer
                  </p>

                  <h2 className="mt-1 text-3xl font-bold text-slate-900">
                    {lieferung.nummer}
                  </h2>

                  <p className="mt-3 text-slate-700">
                    Ziel-Annahmestelle:{" "}
                    <span className="font-semibold">
                      {lieferung.annahmestelle}
                    </span>
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
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

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${statusKlassenErmitteln(
                    lieferung.status,
                  )}`}
                >
                  {statusFormatieren(
                    lieferung.status,
                  )}
                </span>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
                <div className="rounded-xl bg-slate-100 p-5 print:border print:border-slate-300 print:bg-white">
                  <p className="text-sm text-slate-600">
                    Lieferscheine
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {lieferung.lieferscheine.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-5 print:border print:border-slate-300 print:bg-white">
                  <p className="text-sm text-slate-600">
                    Gesamtteile
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {gesamtteile}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-5 print:border print:border-slate-300 print:bg-white">
                  <p className="text-sm text-slate-600">
                    Gesamtbetrag
                  </p>

                  <p className="mt-1 text-2xl font-bold text-green-700 print:text-slate-900">
                    {geldFormatieren(gesamtbetrag)}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-bold text-slate-900">
                  Zugeordnete Lieferscheine
                </h3>

                <p className="mt-1 text-slate-600">
                  Alle Lieferscheine dieser Lieferung
                </p>

                {lieferung.lieferscheine.length ===
                  0 && (
                  <div className="mt-5 rounded-xl bg-yellow-50 p-5 text-yellow-800 print:border print:border-yellow-400 print:bg-white">
                    Dieser Lieferung wurden keine
                    Lieferscheine zugeordnet.
                  </div>
                )}

                {lieferung.lieferscheine.length >
                  0 && (
                  <div className="mt-5 space-y-3">
                    {lieferung.lieferscheine.map(
                      (lieferschein) => (
                        <article
                          key={lieferschein.id}
                          className="break-inside-avoid rounded-xl border border-slate-200 p-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <h4 className="text-lg font-bold text-slate-900">
                                {lieferschein.nummer}
                              </h4>

                              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                                <span className="rounded-full bg-slate-100 px-3 py-1 print:border print:border-slate-300 print:bg-white">
                                  {
                                    lieferschein.gesamtteile
                                  }{" "}
                                  Teile
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 print:border print:border-slate-300 print:bg-white">
                                  {statusFormatieren(
                                    lieferschein.status,
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                              <span className="font-bold text-green-700 print:text-slate-900">
                                {geldFormatieren(
                                  lieferschein.gesamtbetrag,
                                )}
                              </span>

                              <Link
                                href={`/lieferschein/${encodeURIComponent(
                                  lieferschein.nummer,
                                )}`}
                                className="rounded-xl bg-slate-950 px-4 py-2 font-bold text-white print:hidden"
                              >
                                Lieferschein öffnen
                              </Link>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="mt-12 hidden border-t border-slate-300 pt-5 text-sm text-slate-500 print:block">
                <p>Erstellt mit Wash Cloud</p>
              </div>
            </div>
          </>
        )}
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm;
          }

          html,
          body {
            background: white;
          }

          body {
            color: #0f172a;
          }

          button,
          a {
            display: none !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      </main>
    </ZugriffsSchutz>
  );
}