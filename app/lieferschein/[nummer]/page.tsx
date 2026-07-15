"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DruckButton from "../../components/DruckButton";
import LieferscheinStatistik from "../../components/LieferscheinStatistik";
import { supabase } from "../../lib/supabase";
import type {
  ArtikelPosition,
  FertigerLieferschein,
} from "../../types/lieferschein";

type DatenbankPosition = {
  id: number;
  artikel: string;
  menge: number;
};

type DatenbankSammelschein = {
  id: number;
  nummer: string;
  preis: number | string;
  sammelschein_positionen:
    | DatenbankPosition[]
    | null;
};

type DatenbankAnnahmestelle = {
  name: string;
};

type DatenbankLieferschein = {
  id: number;
  nummer: string;
  status: string;
  erstellt_am: string;
  fertiggestellt_am: string | null;
  gesamtbetrag: number | string;
  gesamtteile: number;
  annahmestellen:
    | DatenbankAnnahmestelle
    | DatenbankAnnahmestelle[]
    | null;
  sammelscheine:
    | DatenbankSammelschein[]
    | null;
};

const artikelMehrzahl: Record<string, string> = {
  Hemd: "Hemden",
  Hose: "Hosen",
  Jacke: "Jacken",
  Anzug: "Anzüge",
  Mantel: "Mäntel",
  Kleid: "Kleider",
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

function lieferscheinUmwandeln(
  daten: DatenbankLieferschein,
): FertigerLieferschein {
  return {
    id: daten.id,
    nummer: daten.nummer,
    status: "Fertig",
    fertiggestelltAm:
      daten.fertiggestellt_am ?? daten.erstellt_am,
    annahmestelle: annahmestellenNameErmitteln(
      daten.annahmestellen,
    ),
    sammelscheine: (daten.sammelscheine ?? []).map(
      (sammelschein) => ({
        id: sammelschein.id,
        nummer: sammelschein.nummer,
        preis: zahlUmwandeln(sammelschein.preis),
        positionen: (
          sammelschein.sammelschein_positionen ?? []
        ).map((position) => ({
          id: position.id,
          artikel: position.artikel,
          menge: position.menge,
        })),
      }),
    ),
  };
}

export default function LieferscheinDetailPage() {
  const params = useParams<{ nummer: string }>();

  const [lieferschein, setLieferschein] =
    useState<FertigerLieferschein | null>(null);

  const [datenGeladen, setDatenGeladen] =
    useState(false);

  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let istAktiv = true;

    async function lieferscheinLaden() {
      setDatenGeladen(false);
      setFehler("");

      try {
        const gesuchteNummer = decodeURIComponent(
          params.nummer,
        );

        /*
          Vorübergehend verwenden wir hier "any".
          Später erzeugen wir gemeinsame Supabase-
          Datenbanktypen für das gesamte Projekt.
        */
        const db = supabase as any;

        const { data, error } = await db
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
            ),
            sammelscheine (
              id,
              nummer,
              preis,
              sammelschein_positionen (
                id,
                artikel,
                menge
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
            "Der Lieferschein konnte nicht geladen werden:",
            error,
          );

          setFehler(error.message);
          setLieferschein(null);
          return;
        }

        if (!data) {
          setLieferschein(null);
          return;
        }

        const geladenerLieferschein =
          lieferscheinUmwandeln(
            data as DatenbankLieferschein,
          );

        setLieferschein(geladenerLieferschein);
      } catch (unbekannterFehler) {
        console.error(
          "Der Lieferschein konnte nicht geladen werden:",
          unbekannterFehler,
        );

        if (!istAktiv) {
          return;
        }

        setFehler(
          unbekannterFehler instanceof Error
            ? unbekannterFehler.message
            : "Der Lieferschein konnte nicht geladen werden.",
        );

        setLieferschein(null);
      } finally {
        if (istAktiv) {
          setDatenGeladen(true);
        }
      }
    }

    void lieferscheinLaden();

    return () => {
      istAktiv = false;
    };
  }, [params.nummer]);

  function artikelText(
    position: ArtikelPosition,
  ) {
    if (position.menge === 1) {
      return position.artikel;
    }

    return (
      artikelMehrzahl[position.artikel] ??
      position.artikel
    );
  }

  function geldFormatieren(betrag: number) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(betrag);
  }

  function datumFormatieren(datum: string) {
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

  const gesamtTeile =
    lieferschein?.sammelscheine.reduce(
      (summe, sammelschein) => {
        const teileDesSammelscheins =
          sammelschein.positionen.reduce(
            (positionsSumme, position) =>
              positionsSumme + position.menge,
            0,
          );

        return summe + teileDesSammelscheins;
      },
      0,
    ) ?? 0;

  const gesamtBetrag =
    lieferschein?.sammelscheine.reduce(
      (summe, sammelschein) =>
        summe + sammelschein.preis,
      0,
    ) ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 print:bg-white">
      <header className="bg-slate-950 px-6 py-5 text-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Lieferschein-Details
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Daten werden aus Supabase geladen
            </p>
          </div>

          <Link
            href="/lieferscheine"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Zurück zu den Lieferscheinen
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        {!datenGeladen && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Lieferschein wird aus Supabase geladen ...
            </p>
          </div>
        )}

        {datenGeladen && fehler && (
          <div className="rounded-2xl bg-red-100 p-6 text-red-800 shadow">
            <h2 className="text-xl font-bold">
              Lieferschein konnte nicht geladen werden
            </h2>

            <p className="mt-2 text-sm">
              {fehler}
            </p>

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
                href="/lieferscheine"
                className="rounded-xl border border-red-300 bg-white px-5 py-3 font-bold text-red-800"
              >
                Zurück zur Liste
              </Link>
            </div>
          </div>
        )}

        {datenGeladen &&
          !fehler &&
          !lieferschein && (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <h2 className="text-xl font-bold text-slate-900">
                Lieferschein nicht gefunden
              </h2>

              <p className="mt-2 text-slate-600">
                Unter dieser Nummer wurde in Supabase
                kein Lieferschein gefunden.
              </p>

              <Link
                href="/lieferscheine"
                className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Zurück zu den Lieferscheinen
              </Link>
            </div>
          )}

        {datenGeladen &&
          !fehler &&
          lieferschein && (
            <>
              <div className="mb-6 flex flex-wrap gap-3 print:hidden">
                <DruckButton />

                <Link
                  href="/lieferscheine"
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
                    Lieferschein
                  </h1>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 print:mt-6">
                  <div>
                    <p className="text-sm text-slate-600">
                      Lieferschein-Nummer
                    </p>

                    <h2 className="mt-1 text-3xl font-bold text-slate-900">
                      {lieferschein.nummer}
                    </h2>

                    <p className="mt-3 text-slate-700">
                      Annahmestelle:{" "}
                      <span className="font-semibold">
                        {lieferschein.annahmestelle}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Fertiggestellt am{" "}
                      {datumFormatieren(
                        lieferschein.fertiggestelltAm,
                      )}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 print:border print:border-green-700 print:bg-white">
                    {lieferschein.status}
                  </span>
                </div>

                {lieferschein.sammelscheine.length ===
                  0 && (
                  <div className="mt-8 rounded-xl bg-yellow-50 p-5 text-yellow-800">
                    Zu diesem Lieferschein wurden keine
                    Sammelscheine gefunden.
                  </div>
                )}

                {lieferschein.sammelscheine.length >
                  0 && (
                  <div className="mt-8 space-y-4">
                    {lieferschein.sammelscheine.map(
                      (sammelschein) => (
                        <div
                          key={sammelschein.id}
                          className="break-inside-avoid rounded-xl border border-slate-200 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-slate-900">
                                Sammelschein{" "}
                                {sammelschein.nummer}
                              </h3>

                              <div className="mt-3 space-y-1 text-slate-600">
                                {sammelschein.positionen
                                  .length === 0 && (
                                  <p>
                                    Keine Positionen
                                    gefunden
                                  </p>
                                )}

                                {sammelschein.positionen.map(
                                  (position) => (
                                    <p
                                      key={
                                        position.id
                                      }
                                    >
                                      {position.menge}{" "}
                                      {artikelText(
                                        position,
                                      )}
                                    </p>
                                  ),
                                )}
                              </div>
                            </div>

                            <p className="font-bold text-green-700 print:text-slate-900">
                              {geldFormatieren(
                                sammelschein.preis,
                              )}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <div className="mt-8 break-inside-avoid">
                  <LieferscheinStatistik
                    anzahlSammelscheine={
                      lieferschein.sammelscheine.length
                    }
                    gesamtTeile={gesamtTeile}
                    gesamtBetrag={gesamtBetrag}
                  />
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

          body {
            background: white;
          }

          button,
          a {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}