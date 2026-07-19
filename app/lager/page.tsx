"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useBenutzer } from "../context/BenutzerContext";
import {
  darfLagerVerwalten,
  darfLagerverbrauchBuchen,
} from "../lib/rechte";
import { supabase } from "../lib/supabase";

type Lagerartikel = {
  id: number;
  name: string;
  kategorie: string | null;
  einheit: string;
  bestand: number;
  mindestbestand: number;
  einkaufspreis: number | null;
  aktiv: boolean;
};

type VerbrauchFormular = {
  artikelId: string;
  menge: string;
  notiz: string;
};

const leeresVerbrauchFormular: VerbrauchFormular = {
  artikelId: "",
  menge: "1",
  notiz: "",
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

export default function LagerPage() {
  const {
    aktuellerBenutzer,
  } = useBenutzer();

  const [artikel, setArtikel] =
    useState<Lagerartikel[]>([]);

  const [
    verbrauchFormular,
    setVerbrauchFormular,
  ] = useState<VerbrauchFormular>(
    leeresVerbrauchFormular,
  );

  const [laedt, setLaedt] =
    useState(true);

  const [bucht, setBucht] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  const rolle =
    aktuellerBenutzer?.rolle;

  const darfVerwalten =
    rolle
      ? darfLagerVerwalten(rolle)
      : false;

  const darfVerbrauchBuchen =
    rolle
      ? darfLagerverbrauchBuchen(rolle)
      : false;

  useEffect(() => {
    void lagerartikelLaden();
  }, []);

  async function lagerartikelLaden() {
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
            einkaufspreis,
            aktiv
          `)
          .eq("aktiv", true)
          .order("name", {
            ascending: true,
          });

      if (error) {
        throw new Error(error.message);
      }

      setArtikel(
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
            aktiv: Boolean(
              eintrag.aktiv,
            ),
          }),
        ),
      );
    } catch (unbekannterFehler) {
      console.error(
        "Das Lager konnte nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Das Lager konnte nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  function verbrauchFeldAendern(
    feld: keyof VerbrauchFormular,
    wert: string,
  ) {
    setVerbrauchFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]: wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  async function verbrauchBuchen(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      bucht ||
      !darfVerbrauchBuchen
    ) {
      return;
    }

    const artikelId =
      Number(
        verbrauchFormular.artikelId,
      );

    const menge =
      Number(
        verbrauchFormular.menge
          .replace(",", "."),
      );

    if (
      !Number.isInteger(artikelId) ||
      artikelId <= 0
    ) {
      setFehler(
        "Bitte wähle einen Lagerartikel aus.",
      );
      return;
    }

    if (
      !Number.isFinite(menge) ||
      menge <= 0
    ) {
      setFehler(
        "Bitte gib eine Menge größer als 0 ein.",
      );
      return;
    }

    setBucht(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const ausgewaehlterArtikel =
        artikel.find(
          (eintrag) =>
            eintrag.id === artikelId,
        );

      const { error } =
        await supabase.rpc(
          "lagerbewegung_buchen",
          {
            p_lagerartikel_id:
              artikelId,
            p_buchungsart:
              "verbrauch",
            p_menge: menge,
            p_notiz:
              verbrauchFormular.notiz
                .trim() || null,
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      setVerbrauchFormular(
        leeresVerbrauchFormular,
      );

      setErfolgsmeldung(
        ausgewaehlterArtikel
          ? `${zahlFormatieren(
              menge,
            )} ${
              ausgewaehlterArtikel.einheit
            } ${
              ausgewaehlterArtikel.name
            } wurden als Verbrauch gebucht.`
          : "Der Verbrauch wurde gebucht.",
      );

      await lagerartikelLaden();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Der Verbrauch konnte nicht gebucht werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Verbrauch konnte nicht gebucht werden.",
      );
    } finally {
      setBucht(false);
    }
  }

  const artikelUnterMindestbestand =
    useMemo(
      () =>
        artikel.filter(
          (eintrag) =>
            eintrag.bestand <=
            eintrag.mindestbestand,
        ),
      [artikel],
    );

  const artikelMitBestand =
    useMemo(
      () =>
        artikel.filter(
          (eintrag) =>
            eintrag.bestand > 0,
        ).length,
      [artikel],
    );

  return (
    <ZugriffsSchutz
      berechtigung="lager_anzeigen"
      titel="Lager gesperrt"
      beschreibung="Du darfst das Lager nicht öffnen."
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-6 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Wash Cloud
              </p>

              <h1 className="text-3xl font-bold">
                Lager
              </h1>

              <p className="mt-1 text-slate-300">
                Bestände prüfen und Verbrauch
                nachvollziehbar buchen
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {darfVerwalten && (
                <Link
                  href="/lager/artikel"
                  className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
                >
                  Lager verwalten
                </Link>
              )}

              <Link
                href="/lager/nachbestellung"
                className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white"
              >
                Nachbestellliste
              </Link>

              <Link
                href="/lager/statistik"
                className="rounded-xl border border-slate-600 px-5 py-3 font-bold text-white"
              >
                Statistik
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-10">
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

          {erfolgsmeldung && (
            <div className="mb-6 rounded-2xl bg-green-100 p-5 text-green-800 shadow">
              <p className="font-bold">
                Lager aktualisiert
              </p>

              <p className="mt-1">
                {erfolgsmeldung}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Aktive Lagerartikel
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {artikel.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Artikel mit Bestand
              </p>

              <p className="mt-1 text-3xl font-bold text-green-700">
                {artikelMitBestand}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-slate-600">
                Nachbestellen
              </p>

              <p className="mt-1 text-3xl font-bold text-red-700">
                {
                  artikelUnterMindestbestand.length
                }
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
            {darfVerbrauchBuchen && (
              <div className="h-fit rounded-2xl bg-white p-6 shadow">
                <h2 className="text-2xl font-bold text-slate-950">
                  Verbrauch buchen
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Jede Entnahme wird mit Benutzer,
                  Menge und Zeitpunkt gespeichert.
                </p>

                <form
                  onSubmit={verbrauchBuchen}
                  className="mt-6 space-y-4"
                >
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Lagerartikel
                    </span>

                    <select
                      value={
                        verbrauchFormular.artikelId
                      }
                      onChange={(event) =>
                        verbrauchFeldAendern(
                          "artikelId",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    >
                      <option value="">
                        Artikel auswählen
                      </option>

                      {artikel.map(
                        (eintrag) => (
                          <option
                            key={
                              eintrag.id
                            }
                            value={
                              eintrag.id
                            }
                          >
                            {eintrag.name} –{" "}
                            {zahlFormatieren(
                              eintrag.bestand,
                            )}{" "}
                            {eintrag.einheit}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Verbrauchte Menge
                    </span>

                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={
                        verbrauchFormular.menge
                      }
                      onChange={(event) =>
                        verbrauchFeldAendern(
                          "menge",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Notiz
                    </span>

                    <textarea
                      value={
                        verbrauchFormular.notiz
                      }
                      onChange={(event) =>
                        verbrauchFeldAendern(
                          "notiz",
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="Optional, zum Beispiel Tagesproduktion"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={bucht}
                    className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bucht
                      ? "Verbrauch wird gebucht ..."
                      : "Verbrauch buchen"}
                  </button>
                </form>
              </div>
            )}

            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-950">
                  Aktuelle Bestände
                </h2>

                <p className="mt-1 text-slate-600">
                  Rot markierte Artikel haben ihren
                  Mindestbestand erreicht.
                </p>
              </div>

              {laedt && (
                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-slate-600">
                    Lagerartikel werden geladen ...
                  </p>
                </div>
              )}

              {!laedt &&
                artikel.length === 0 && (
                  <div className="rounded-2xl bg-white p-8 text-center shadow">
                    <h3 className="text-xl font-bold text-slate-950">
                      Keine Lagerartikel vorhanden
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Ein Administrator kann den
                      ersten Artikel anlegen.
                    </p>
                  </div>
                )}

              <div className="grid gap-4 md:grid-cols-2">
                {!laedt &&
                  artikel.map(
                    (eintrag) => {
                      const istNiedrig =
                        eintrag.bestand <=
                        eintrag.mindestbestand;

                      return (
                        <article
                          key={
                            eintrag.id
                          }
                          className={`rounded-2xl border p-6 shadow ${
                            istNiedrig
                              ? "border-red-300 bg-red-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-slate-500">
                                {eintrag.kategorie ||
                                  "Ohne Kategorie"}
                              </p>

                              <h3 className="mt-1 text-xl font-bold text-slate-950">
                                {eintrag.name}
                              </h3>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-sm font-bold ${
                                istNiedrig
                                  ? "bg-red-200 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {istNiedrig
                                ? "Nachbestellen"
                                : "Ausreichend"}
                            </span>
                          </div>

                          <p className="mt-5 text-4xl font-bold text-slate-950">
                            {zahlFormatieren(
                              eintrag.bestand,
                            )}{" "}
                            <span className="text-xl">
                              {eintrag.einheit}
                            </span>
                          </p>

                          <div className="mt-5 text-sm">
                            <p className="text-slate-500">
                              Mindestbestand
                            </p>

                            <p className="mt-1 font-semibold text-slate-950">
                              {zahlFormatieren(
                                eintrag.mindestbestand,
                              )}{" "}
                              {eintrag.einheit}
                            </p>
                          </div>
                        </article>
                      );
                    },
                  )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </ZugriffsSchutz>
  );
}