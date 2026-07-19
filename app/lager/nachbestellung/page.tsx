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
  kategorie: string | null;
  einheit: string;
  bestand: number;
  mindestbestand: number;
  einkaufspreis: number | null;
};

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

function preisFormatieren(
  wert: number | null,
) {
  if (wert === null) {
    return "Nicht angegeben";
  }

  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(wert);
}

export default function LagerNachbestellungPage() {
  const [artikel, setArtikel] =
    useState<Lagerartikel[]>([]);

  const [laedt, setLaedt] =
    useState(true);

  const [fehler, setFehler] =
    useState("");

  useEffect(() => {
    void artikelLaden();
  }, []);

  async function artikelLaden() {
    setLaedt(true);
    setFehler("");

    try {
      const { data, error } =
        await supabase
          .from("lagerartikel")
          .select(`
            id,
            name,
            kategorie,
            einheit,
            bestand,
            mindestbestand,
            einkaufspreis
          `)
          .eq("aktiv", true)
          .order("name", {
            ascending: true,
          });

      if (error) {
        throw new Error(error.message);
      }

      const geladeneArtikel: Lagerartikel[] =
        (data ?? []).map(
          (eintrag) => ({
            id: Number(eintrag.id),
            name: String(eintrag.name),
            kategorie:
              eintrag.kategorie === null
                ? null
                : String(
                    eintrag.kategorie,
                  ),
            einheit: String(
              eintrag.einheit,
            ),
            bestand: Number(
              eintrag.bestand,
            ),
            mindestbestand: Number(
              eintrag.mindestbestand,
            ),
            einkaufspreis:
              eintrag.einkaufspreis ===
              null
                ? null
                : Number(
                    eintrag.einkaufspreis,
                  ),
          }),
        );

      setArtikel(geladeneArtikel);
    } catch (unbekannterFehler) {
      console.error(
        "Die Nachbestellliste konnte nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Die Nachbestellliste konnte nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  const nachzubestellendeArtikel =
    useMemo(
      () =>
        artikel
          .filter(
            (eintrag) =>
              eintrag.bestand <=
              eintrag.mindestbestand,
          )
          .sort(
            (a, b) =>
              (
                a.bestand -
                a.mindestbestand
              ) -
              (
                b.bestand -
                b.mindestbestand
              ),
          ),
      [artikel],
    );

  const geschaetzteKosten =
    useMemo(
      () =>
        nachzubestellendeArtikel.reduce(
          (
            summe,
            eintrag,
          ) => {
            const fehlmenge =
              Math.max(
                eintrag.mindestbestand -
                  eintrag.bestand,
                0,
              );

            return (
              summe +
              fehlmenge *
                (
                  eintrag.einkaufspreis ??
                  0
                )
            );
          },
          0,
        ),
      [nachzubestellendeArtikel],
    );

  return (
    <ZugriffsSchutz
      berechtigung="lager_anzeigen"
      titel="Nachbestellliste gesperrt"
      beschreibung="Du darfst die Nachbestellliste nicht öffnen."
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-6 text-white print:bg-white print:text-black">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300 print:text-slate-600">
                Wash Cloud
              </p>

              <h1 className="text-3xl font-bold">
                Nachbestellliste
              </h1>

              <p className="mt-1 text-slate-300 print:text-slate-600">
                Artikel am oder unter dem
                Mindestbestand
              </p>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={() =>
                  window.print()
                }
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
              >
                Liste drucken
              </button>

              <Link
                href="/lager"
                className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
              >
                Zur Lagerübersicht
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-10">
          {fehler && (
            <div className="mb-6 rounded-2xl bg-red-100 p-5 text-red-800 shadow">
              <p className="font-bold">
                Liste konnte nicht geladen werden
              </p>

              <p className="mt-1">
                {fehler}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Nachzubestellende Artikel
              </p>

              <p className="mt-1 text-3xl font-bold text-red-700">
                {
                  nachzubestellendeArtikel.length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Geschätzte Mindestkosten
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {preisFormatieren(
                  geschaetzteKosten,
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Bis zum Mindestbestand
              </p>
            </div>
          </div>

          {laedt && (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow">
              <p className="text-slate-600">
                Nachbestellliste wird geladen ...
              </p>
            </div>
          )}

          {!laedt &&
            nachzubestellendeArtikel.length ===
              0 && (
              <div className="mt-6 rounded-2xl bg-green-100 p-8 text-center text-green-900 shadow">
                <h2 className="text-2xl font-bold">
                  Alles ausreichend vorhanden
                </h2>

                <p className="mt-2">
                  Kein aktiver Lagerartikel hat
                  den Mindestbestand erreicht.
                </p>
              </div>
            )}

          {!laedt &&
            nachzubestellendeArtikel.length >
              0 && (
              <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
                      <th className="px-4 py-4">
                        Artikel
                      </th>

                      <th className="px-4 py-4">
                        Bestand
                      </th>

                      <th className="px-4 py-4">
                        Mindestbestand
                      </th>

                      <th className="px-4 py-4">
                        Fehlmenge
                      </th>

                      <th className="px-4 py-4">
                        Einkaufspreis
                      </th>

                      <th className="px-4 py-4">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {nachzubestellendeArtikel.map(
                      (eintrag) => {
                        const fehlmenge =
                          Math.max(
                            eintrag.mindestbestand -
                              eintrag.bestand,
                            0,
                          );

                        const istLeer =
                          eintrag.bestand <= 0;

                        return (
                          <tr
                            key={eintrag.id}
                            className="border-b border-slate-100"
                          >
                            <td className="px-4 py-4">
                              <p className="font-bold text-slate-950">
                                {eintrag.name}
                              </p>

                              <p className="text-slate-500">
                                {eintrag.kategorie ||
                                  "Ohne Kategorie"}
                              </p>
                            </td>

                            <td className="px-4 py-4 font-semibold">
                              {zahlFormatieren(
                                eintrag.bestand,
                              )}{" "}
                              {eintrag.einheit}
                            </td>

                            <td className="px-4 py-4">
                              {zahlFormatieren(
                                eintrag.mindestbestand,
                              )}{" "}
                              {eintrag.einheit}
                            </td>

                            <td className="px-4 py-4 font-bold text-red-700">
                              {zahlFormatieren(
                                fehlmenge,
                              )}{" "}
                              {eintrag.einheit}
                            </td>

                            <td className="px-4 py-4">
                              {preisFormatieren(
                                eintrag.einkaufspreis,
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  istLeer
                                    ? "bg-red-100 text-red-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {istLeer
                                  ? "Leer"
                                  : "Nachbestellen"}
                              </span>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </main>
    </ZugriffsSchutz>
  );
}