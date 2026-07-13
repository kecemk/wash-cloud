"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DruckButton from "../../components/DruckButton";
import LieferscheinStatistik from "../../components/LieferscheinStatistik";
import type {
  ArtikelPosition,
  FertigerLieferschein,
} from "../../types/lieferschein";

const FERTIGE_LIEFERSCHEINE_SPEICHER_NAME =
  "wash-cloud-fertige-lieferscheine";

const artikelMehrzahl: Record<string, string> = {
  Hemd: "Hemden",
  Hose: "Hosen",
  Jacke: "Jacken",
  Anzug: "Anzüge",
  Mantel: "Mäntel",
  Kleid: "Kleider",
};

export default function LieferscheinDetailPage() {
  const params = useParams<{ nummer: string }>();

  const [lieferschein, setLieferschein] =
    useState<FertigerLieferschein | null>(null);

  const [datenGeladen, setDatenGeladen] = useState(false);

  useEffect(() => {
    try {
      const gesuchteNummer = decodeURIComponent(
        params.nummer,
      );

      const gespeicherteDaten = localStorage.getItem(
        FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
      );

      if (!gespeicherteDaten) {
        return;
      }

      const gespeicherteLieferscheine = JSON.parse(
        gespeicherteDaten,
      ) as FertigerLieferschein[];

      if (!Array.isArray(gespeicherteLieferscheine)) {
        return;
      }

      const gefundenerLieferschein =
        gespeicherteLieferscheine.find(
          (eintrag) => eintrag.nummer === gesuchteNummer,
        );

      if (gefundenerLieferschein) {
        setLieferschein(gefundenerLieferschein);
      }
    } catch (fehler) {
      console.error(
        "Der Lieferschein konnte nicht geladen werden:",
        fehler,
      );
    } finally {
      setDatenGeladen(true);
    }
  }, [params.nummer]);

  function artikelText(position: ArtikelPosition) {
    if (position.menge === 1) {
      return position.artikel;
    }

    return (
      artikelMehrzahl[position.artikel] ??
      position.artikel
    );
  }

  function geldFormatieren(betrag: number) {
    return betrag.toFixed(2).replace(".", ",") + " €";
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
              Lieferschein wird geladen...
            </p>
          </div>
        )}

        {datenGeladen && !lieferschein && (
          <div className="rounded-2xl bg-white p-8 text-center shadow">
            <h2 className="text-xl font-bold text-slate-900">
              Lieferschein nicht gefunden
            </h2>

            <p className="mt-2 text-slate-600">
              Unter dieser Nummer wurde kein fertiger
              Lieferschein gefunden.
            </p>
          </div>
        )}

        {datenGeladen && lieferschein && (
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
                            {sammelschein.positionen.map(
                              (position) => (
                                <p key={position.id}>
                                  {position.menge}{" "}
                                  {artikelText(position)}
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