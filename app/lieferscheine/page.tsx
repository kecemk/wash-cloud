"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LieferscheinStatistik from "../components/LieferscheinStatistik";

type ArtikelPosition = {
  id: number;
  menge: number;
  artikel: string;
};

type Sammelschein = {
  id: number;
  nummer: string;
  positionen: ArtikelPosition[];
  preis: number;
};

type FertigerLieferschein = {
  id: number;
  nummer: string;
  status: "Fertig";
  fertiggestelltAm: string;
  annahmestelle: string;
  sammelscheine: Sammelschein[];
};

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

export default function LieferscheinePage() {
  const [lieferscheine, setLieferscheine] = useState<
    FertigerLieferschein[]
  >([]);

  const [datenGeladen, setDatenGeladen] = useState(false);

  useEffect(() => {
    try {
      const gespeicherteDaten = localStorage.getItem(
        FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
      );

      if (gespeicherteDaten) {
        const geladeneLieferscheine = JSON.parse(
          gespeicherteDaten,
        ) as FertigerLieferschein[];

        if (Array.isArray(geladeneLieferscheine)) {
          setLieferscheine(geladeneLieferscheine);
        }
      }
    } catch (fehler) {
      console.error(
        "Die fertigen Lieferscheine konnten nicht geladen werden:",
        fehler,
      );
    } finally {
      setDatenGeladen(true);
    }
  }, []);

  function gesamtTeileBerechnen(
    lieferschein: FertigerLieferschein,
  ) {
    return lieferschein.sammelscheine.reduce(
      (gesamtTeile, sammelschein) => {
        const teileDesSammelscheins =
          sammelschein.positionen.reduce(
            (summe, position) => summe + position.menge,
            0,
          );

        return gesamtTeile + teileDesSammelscheins;
      },
      0,
    );
  }

  function gesamtBetragBerechnen(
    lieferschein: FertigerLieferschein,
  ) {
    return lieferschein.sammelscheine.reduce(
      (summe, sammelschein) =>
        summe + sammelschein.preis,
      0,
    );
  }

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

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Lieferscheine
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Lokal fertiggestellte Lieferscheine
            </p>
          </div>

          <Link
            href="/kasse"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Zurück zur Kasse
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {!datenGeladen && (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Lieferscheine werden geladen...
            </p>
          </div>
        )}

        {datenGeladen && lieferscheine.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow">
            <h2 className="text-xl font-bold text-slate-900">
              Noch keine fertigen Lieferscheine
            </h2>

            <p className="mt-2 text-slate-600">
              Fertiggestellte Lieferscheine werden hier
              automatisch angezeigt.
            </p>
          </div>
        )}

        {datenGeladen && lieferscheine.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Fertige Lieferscheine
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {lieferscheine.length}
              </p>
            </div>

            {[...lieferscheine]
              .reverse()
              .map((lieferschein) => {
                const gesamtTeile =
                  gesamtTeileBerechnen(lieferschein);

                const gesamtBetrag =
                  gesamtBetragBerechnen(lieferschein);

                return (
                  <div
                    key={lieferschein.id}
                    className="rounded-2xl bg-white p-6 shadow"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/lieferschein/${encodeURIComponent(
                            lieferschein.nummer,
                          )}`}
                          className="text-xl font-bold text-blue-700 hover:underline"
                        >
                          {lieferschein.nummer}
                        </Link>

                        <p className="mt-1 text-sm text-slate-600">
                          {lieferschein.annahmestelle}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {datumFormatieren(
                            lieferschein.fertiggestelltAm,
                          )}
                        </p>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                        {lieferschein.status}
                      </span>
                    </div>

                    <div className="mt-6 space-y-3">
                      {lieferschein.sammelscheine.map(
                        (sammelschein) => (
                          <div
                            key={sammelschein.id}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  Sammelschein{" "}
                                  {sammelschein.nummer}
                                </h3>

                                <div className="mt-2 text-sm text-slate-600">
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

                              <p className="font-bold text-green-700">
                                {geldFormatieren(
                                  sammelschein.preis,
                                )}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-6">
                      <LieferscheinStatistik
                        anzahlSammelscheine={
                          lieferschein.sammelscheine.length
                        }
                        gesamtTeile={gesamtTeile}
                        gesamtBetrag={gesamtBetrag}
                      />
                    </div>

                    <Link
                      href={`/lieferschein/${encodeURIComponent(
                        lieferschein.nummer,
                      )}`}
                      className="mt-6 block w-full rounded-xl bg-slate-950 px-5 py-4 text-center font-bold text-white"
                    >
                      Lieferschein öffnen
                    </Link>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </main>
  );
}