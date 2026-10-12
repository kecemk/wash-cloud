"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import DruckButton from "../../../components/DruckButton";
import ZugriffsSchutz from "../../../components/ZugriffsSchutz";
import { useBenutzer } from "../../../context/BenutzerContext";
import { supabase } from "../../../lib/supabase";

type DatenbankPosition = {
  id: number;
  artikel: string;
  menge: number;
  einzelpreis: number | string | null;
};

type DatenbankSammelschein = {
  id: number;
  nummer: string;
  preis: number | string;
  sammelschein_positionen: DatenbankPosition[] | null;
};

type DatenbankAnnahmestelle = {
  name: string;
};

type DatenbankLieferschein = {
  id: number;
  annahmestelle_id: number | null;
  nummer: string;
  status: string;
  erstellt_am: string;
  fertiggestellt_am: string | null;
  gesamtbetrag: number | string;
  gesamtteile: number;
  einmalige_firma: string | null;
  einmaliger_ansprechpartner: string | null;
  einmalige_strasse: string | null;
  einmalige_plz: string | null;
  einmaliger_ort: string | null;
  einmalige_telefon: string | null;
  einmalige_email: string | null;
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null;
  sammelscheine: DatenbankSammelschein[] | null;
};

function zahlUmwandeln(
  wert: number | string | null | undefined,
) {
  const zahl =
    typeof wert === "number"
      ? wert
      : Number(
          String(wert ?? "0").replace(",", "."),
        );

  return Number.isFinite(zahl) ? zahl : 0;
}

function geldFormatieren(betrag: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(betrag);
}

function datumFormatieren(datum: string) {
  const wert = new Date(datum);

  if (Number.isNaN(wert.getTime())) {
    return "Unbekanntes Datum";
  }

  return wert.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function statusFormatieren(status: string) {
  const bereinigt = status.trim();

  if (!bereinigt) {
    return "Unbekannt";
  }

  return (
    bereinigt.charAt(0).toUpperCase() +
    bereinigt.slice(1).toLowerCase()
  );
}

export default function LieferscheinPdfPage() {
  const params = useParams<{ nummer: string }>();
  const { aktuellerBenutzer } = useBenutzer();

  const [lieferschein, setLieferschein] =
    useState<DatenbankLieferschein | null>(
      null,
    );

  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let istAktiv = true;

    async function laden() {
      setLaedt(true);
      setFehler("");

      try {
        const nummer = decodeURIComponent(
          params.nummer,
        );

        const { data, error } =
          await supabase
            .from("lieferscheine")
            .select(`
              id,
              annahmestelle_id,
              nummer,
              status,
              gesamtbetrag,
              gesamtteile,
              erstellt_am,
              fertiggestellt_am,
              einmalige_firma,
              einmaliger_ansprechpartner,
              einmalige_strasse,
              einmalige_plz,
              einmaliger_ort,
              einmalige_telefon,
              einmalige_email,
              annahmestellen (
                name
              ),
              sammelscheine (
                id,
                nummer,
                preis,
                sammelschein_positionen (
                  id,
                  artikel,
                  menge,
                  einzelpreis
                )
              )
            `)
            .eq("nummer", nummer)
            .single();

        if (!istAktiv) {
          return;
        }

        if (error) {
          setLieferschein(null);
          setFehler(error.message);
          setLaedt(false);
          return;
        }

        if (!data) {
          setLieferschein(null);
          setFehler(
            "Lieferschein nicht gefunden.",
          );
          setLaedt(false);
          return;
        }

        const daten =
          data as DatenbankLieferschein;

        if (
          aktuellerBenutzer?.rolle ===
          "annahmestelle"
        ) {
          const eigeneAnnahmestelle =
            aktuellerBenutzer.annahmestelleId;

          const status = daten.status
            .trim()
            .toLowerCase();

          const freigegeben =
            status === "fertig" ||
            status === "geliefert";

          if (
            eigeneAnnahmestelle === null ||
            daten.annahmestelle_id !==
              eigeneAnnahmestelle ||
            !freigegeben
          ) {
            setLieferschein(null);
            setFehler(
              "Dieser Lieferschein ist für die aktuelle Annahmestelle nicht freigegeben.",
            );
            setLaedt(false);
            return;
          }
        }

        setLieferschein(daten);
        setLaedt(false);
      } catch (unbekannterFehler) {
        if (!istAktiv) {
          return;
        }

        setLieferschein(null);
        setFehler(
          unbekannterFehler instanceof Error
            ? unbekannterFehler.message
            : "Der Lieferschein konnte nicht geladen werden.",
        );
        setLaedt(false);
      }
    }

    void laden();

    return () => {
      istAktiv = false;
    };
  }, [params.nummer, aktuellerBenutzer]);

  const sammelscheine =
    lieferschein?.sammelscheine ?? [];

  const gesamtTeile =
    sammelscheine.reduce(
      (gesamt, sammelschein) =>
        gesamt +
        (
          sammelschein.sammelschein_positionen ??
          []
        ).reduce(
          (summe, position) =>
            summe + position.menge,
          0,
        ),
      0,
    );

  const gesamtBetrag =
    sammelscheine.reduce(
      (gesamt, sammelschein) =>
        gesamt +
        zahlUmwandeln(
          sammelschein.preis,
        ),
      0,
    );

  const firmenAdresse = lieferschein
    ? [
        lieferschein.einmalige_strasse,
        [
          lieferschein.einmalige_plz,
          lieferschein.einmaliger_ort,
        ]
          .filter(Boolean)
          .join(" "),
      ].filter(Boolean)
    : [];

  return (
    <ZugriffsSchutz
      berechtigung="lieferscheine_anzeigen"
      titel="PDF-Ansicht gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf diese Lieferscheinansicht nicht öffnen."
      zurueckLink="/lieferscheine"
      zurueckText="Zur Lieferscheinübersicht"
    >
      <main className="min-h-screen bg-slate-100 print:bg-white">
        <header className="border-b border-slate-200 bg-white px-4 py-4 print:hidden sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Washly
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-950">
                PDF-Ansicht
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/lieferschein/${encodeURIComponent(
                  params.nummer,
                )}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
              >
                App-Ansicht
              </Link>

              <DruckButton />
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[210mm] px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-0">
          {laedt && (
            <div className="rounded-2xl bg-white p-6 shadow-sm print:hidden">
              <p className="text-slate-600">
                PDF-Ansicht wird geladen ...
              </p>
            </div>
          )}

          {!laedt && fehler && (
            <div className="rounded-2xl bg-red-100 p-6 text-red-800 shadow-sm print:hidden">
              <p className="font-bold">
                Lieferschein konnte nicht geladen werden
              </p>
              <p className="mt-2 text-sm">
                {fehler}
              </p>
            </div>
          )}

          {!laedt &&
            !fehler &&
            lieferschein && (
              <article className="bg-white p-6 shadow-xl sm:p-10 print:p-0 print:shadow-none">
                <div className="flex items-start justify-between gap-6 border-b-2 border-slate-950 pb-6">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/washly-logo.png"
                      alt="Washly Logo"
                      width={96}
                      height={96}
                      priority
                      className="h-20 w-20 object-contain"
                    />

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        Washly
                      </p>
                      <h2 className="mt-1 text-3xl font-black text-slate-950">
                        Lieferschein
                      </h2>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Belegnummer
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-950">
                      {lieferschein.nummer}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border border-slate-300 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Annahmestelle
                    </p>
                    <p className="mt-2 font-black text-slate-950">
                      {annahmestellenNameErmitteln(
                        lieferschein.annahmestellen,
                      )}
                    </p>
                  </div>

                  <div className="border border-slate-300 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Fertiggestellt
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-950">
                      {datumFormatieren(
                        lieferschein.fertiggestellt_am ??
                          lieferschein.erstellt_am,
                      )}
                    </p>
                  </div>

                  <div className="border border-slate-300 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </p>
                    <p className="mt-2 font-black text-slate-950">
                      {statusFormatieren(
                        lieferschein.status,
                      )}
                    </p>
                  </div>
                </div>

                {lieferschein.einmalige_firma && (
                  <div className="mt-6 border border-slate-300 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Firma / Empfänger
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {lieferschein.einmalige_firma}
                    </p>

                    {lieferschein.einmaliger_ansprechpartner && (
                      <p className="mt-1 text-sm text-slate-700">
                        {
                          lieferschein.einmaliger_ansprechpartner
                        }
                      </p>
                    )}

                    {firmenAdresse.map(
                      (zeile) => (
                        <p
                          key={zeile}
                          className="mt-1 text-sm text-slate-700"
                        >
                          {zeile}
                        </p>
                      ),
                    )}

                    {(lieferschein.einmalige_telefon ||
                      lieferschein.einmalige_email) && (
                      <p className="mt-3 text-sm text-slate-600">
                        {[
                          lieferschein.einmalige_telefon,
                          lieferschein.einmalige_email,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-8">
                  <div className="grid grid-cols-[1.1fr_2fr_0.7fr_1fr_1fr] border-b-2 border-slate-950 pb-2 text-xs font-black uppercase tracking-wide text-slate-600">
                    <span>Sammelschein</span>
                    <span>Artikel</span>
                    <span className="text-right">
                      Menge
                    </span>
                    <span className="text-right">
                      Stückpreis
                    </span>
                    <span className="text-right">
                      Summe
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {sammelscheine.flatMap(
                      (sammelschein) => {
                        const positionen =
                          sammelschein.sammelschein_positionen ??
                          [];

                        if (
                          positionen.length === 0
                        ) {
                          return [
                            <div
                              key={`leer-${sammelschein.id}`}
                              className="grid grid-cols-[1.1fr_2fr_0.7fr_1fr_1fr] gap-2 py-3 text-sm"
                            >
                              <span className="font-bold">
                                {
                                  sammelschein.nummer
                                }
                              </span>
                              <span className="text-slate-500">
                                Keine Positionen
                              </span>
                              <span />
                              <span />
                              <span className="text-right font-bold">
                                {geldFormatieren(
                                  zahlUmwandeln(
                                    sammelschein.preis,
                                  ),
                                )}
                              </span>
                            </div>,
                          ];
                        }

                        return positionen.map(
                          (position, index) => {
                            const einzelpreis =
                              position.einzelpreis ===
                              null
                                ? null
                                : zahlUmwandeln(
                                    position.einzelpreis,
                                  );

                            const positionssumme =
                              einzelpreis === null
                                ? null
                                : einzelpreis *
                                  position.menge;

                            return (
                              <div
                                key={position.id}
                                className="grid grid-cols-[1.1fr_2fr_0.7fr_1fr_1fr] gap-2 py-3 text-sm"
                              >
                                <span className="font-bold text-slate-900">
                                  {index === 0
                                    ? sammelschein.nummer
                                    : ""}
                                </span>
                                <span className="text-slate-800">
                                  {
                                    position.artikel
                                  }
                                </span>
                                <span className="text-right">
                                  {
                                    position.menge
                                  }
                                </span>
                                <span className="text-right">
                                  {einzelpreis === null
                                    ? "—"
                                    : geldFormatieren(
                                        einzelpreis,
                                      )}
                                </span>
                                <span className="text-right font-bold">
                                  {positionssumme ===
                                  null
                                    ? index ===
                                      positionen.length -
                                        1
                                      ? geldFormatieren(
                                          zahlUmwandeln(
                                            sammelschein.preis,
                                          ),
                                        )
                                      : "—"
                                    : geldFormatieren(
                                        positionssumme,
                                      )}
                                </span>
                              </div>
                            );
                          },
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 border-t-2 border-slate-950 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Sammelscheine
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {sammelscheine.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Teile
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {gesamtTeile}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Gesamtbetrag
                    </p>
                    <p className="mt-1 text-3xl font-black">
                      {geldFormatieren(
                        gesamtBetrag,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-12 flex items-center justify-between border-t border-slate-300 pt-4 text-xs text-slate-500">
                  <span>
                    Erstellt mit Washly
                  </span>
                  <span>
                    {lieferschein.nummer}
                  </span>
                </div>
              </article>
            )}
        </section>

        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 16mm;
            }

            body {
              background: white;
            }

            nav,
            header,
            button,
            a {
              display: none !important;
            }
          }
        `}</style>
      </main>
    </ZugriffsSchutz>
  );
}
