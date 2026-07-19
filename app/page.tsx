"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBenutzer } from "./context/BenutzerContext";
import { supabase } from "./lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
  adresse: string | null;
  telefon: string | null;
  aktiv: boolean;
};

type LagerartikelBestand = {
  bestand: number;
  mindestbestand: number;
};

export default function Home() {
  const {
    aktuellerBenutzer,
    laedt: benutzerWerdenGeladen,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const [annahmestellen, setAnnahmestellen] =
    useState<Annahmestelle[]>([]);

  const [
    annahmestellenWerdenGeladen,
    setAnnahmestellenWerdenGeladen,
  ] = useState(false);

  const [
    lagerartikelAnzahl,
    setLagerartikelAnzahl,
  ] = useState(0);

  const [
    lagerartikelNachbestellen,
    setLagerartikelNachbestellen,
  ] = useState(0);

  const [
    lagerWirdGeladen,
    setLagerWirdGeladen,
  ] = useState(false);

  const [fehler, setFehler] = useState("");

  const darfDashboardAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "dashboard_anzeigen",
    );

  const darfKasseAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "kasse_anzeigen",
    );

  const darfLieferscheineAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "lieferscheine_anzeigen",
    );

  const darfLieferungenAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "lieferungen_anzeigen",
    );

  const darfKundenAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "kunden_anzeigen",
    );

  const darfRechnungenAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "rechnungen_anzeigen",
    );

  const darfBenutzerAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "benutzer_anzeigen",
    );

  const darfAnnahmestellenAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "annahmestellen_anzeigen",
    );

  const darfLagerAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "lager_anzeigen",
    );

  useEffect(() => {
    let istAktiv = true;

    async function annahmestellenLaden() {
      if (!darfDashboardAnzeigen || !darfKasseAnzeigen) {
        setAnnahmestellen([]);
        setFehler("");
        setAnnahmestellenWerdenGeladen(false);
        return;
      }

      setAnnahmestellenWerdenGeladen(true);
      setFehler("");

      const { data, error } = await supabase
        .from("annahmestellen")
        .select(
          "id, name, adresse, telefon, aktiv",
        )
        .eq("aktiv", true)
        .order("name", {
          ascending: true,
        });

      if (!istAktiv) {
        return;
      }

      if (error) {
        setFehler(error.message);
        setAnnahmestellen([]);
        setAnnahmestellenWerdenGeladen(false);
        return;
      }

      setAnnahmestellen(
        (data as Annahmestelle[] | null) ?? [],
      );

      setAnnahmestellenWerdenGeladen(false);
    }

    void annahmestellenLaden();

    return () => {
      istAktiv = false;
    };
  }, [
    darfDashboardAnzeigen,
    darfKasseAnzeigen,
  ]);

  useEffect(() => {
    let istAktiv = true;

    async function lagerStatusLaden() {
      if (
        !darfDashboardAnzeigen ||
        !darfLagerAnzeigen
      ) {
        setLagerartikelAnzahl(0);
        setLagerartikelNachbestellen(0);
        setLagerWirdGeladen(false);
        return;
      }

      setLagerWirdGeladen(true);

      const { data, error } =
        await supabase
          .from("lagerartikel")
          .select(
            "bestand, mindestbestand",
          )
          .eq("aktiv", true);

      if (!istAktiv) {
        return;
      }

      if (error) {
        console.error(
          "Der Lagerstatus konnte nicht geladen werden:",
          error,
        );

        setLagerartikelAnzahl(0);
        setLagerartikelNachbestellen(0);
        setLagerWirdGeladen(false);
        return;
      }

      const geladeneArtikel =
        (data ??
          []) as LagerartikelBestand[];

      setLagerartikelAnzahl(
        geladeneArtikel.length,
      );

      setLagerartikelNachbestellen(
        geladeneArtikel.filter(
          (artikel) =>
            Number(artikel.bestand) <=
            Number(
              artikel.mindestbestand,
            ),
        ).length,
      );

      setLagerWirdGeladen(false);
    }

    void lagerStatusLaden();

    return () => {
      istAktiv = false;
    };
  }, [
    darfDashboardAnzeigen,
    darfLagerAnzeigen,
  ]);

  if (benutzerWerdenGeladen) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          <p className="text-slate-600">
            Benutzerrechte werden geladen ...
          </p>
        </div>
      </main>
    );
  }

  if (
    aktuellerBenutzer?.rolle ===
    "annahmestelle"
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-bold">
              ☁ Wash Cloud
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Annahmestelle
            </p>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-6 md:grid-cols-2">
            {darfLieferscheineAnzeigen && (
              <Link
                href="/lieferscheine"
                className="rounded-2xl bg-white p-8 shadow transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm font-semibold text-slate-500">
                  Eigene Annahmestelle
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  Lieferscheine
                </h2>

                <p className="mt-3 text-slate-600">
                  Eigene Lieferscheine ansehen
                  und öffnen.
                </p>
              </Link>
            )}

            {darfRechnungenAnzeigen && (
              <Link
                href="/rechnungen"
                className="rounded-2xl bg-white p-8 shadow transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm font-semibold text-slate-500">
                  Abrechnung
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  Rechnungen
                </h2>

                <p className="mt-3 text-slate-600">
                  Rechnungen ansehen und
                  öffnen.
                </p>
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (!darfDashboardAnzeigen) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard gesperrt
          </h1>

          <p className="mt-2 text-slate-600">
            Der aktuell ausgewählte Benutzer
            darf das Dashboard nicht anzeigen.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              ☁ Wash Cloud
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Mitarbeiteransicht
            </p>
          </div>

          <div className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold">
            System online
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {darfLieferscheineAnzeigen && (
            <Link
              href="/lieferscheine"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm text-slate-500">
                Verwaltung
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Lieferscheine
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Fertige Lieferscheine ansehen
                und öffnen.
              </p>
            </Link>
          )}

          {darfLieferungenAnzeigen && (
            <Link
              href="/lieferungen"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm text-slate-500">
                Logistik
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Lieferungen
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Lieferungen planen und
                abschließen.
              </p>
            </Link>
          )}

          {darfKundenAnzeigen && (
            <Link
              href="/kunden"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm text-slate-500">
                Stammdaten
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Kunden
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Kunden anlegen, suchen und
                bearbeiten.
              </p>
            </Link>
          )}

          {darfRechnungenAnzeigen && (
            <Link
              href="/rechnungen"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm text-slate-500">
                Abrechnung
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Rechnungen
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Rechnungen ansehen und
                verwalten.
              </p>
            </Link>
          )}

          {darfLagerAnzeigen && (
            <Link
              href="/lager"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm text-slate-500">
                Warenwirtschaft
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Lager
              </h2>

              {lagerWirdGeladen ? (
                <p className="mt-2 text-sm text-slate-600">
                  Lagerstatus wird geladen ...
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {lagerartikelAnzahl} Artikel
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${
                      lagerartikelNachbestellen >
                      0
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {
                      lagerartikelNachbestellen
                    }{" "}
                    nachbestellen
                  </span>
                </div>
              )}
            </Link>
          )}
        </div>

        {darfKasseAnzeigen && (
          <>
            <div className="mt-10">
              <h2 className="text-3xl font-bold text-slate-900">
                Annahmestelle auswählen
              </h2>

              <p className="mt-2 text-slate-600">
                Wähle die Annahmestelle aus,
                für die ein neuer Lieferschein
                erstellt werden soll.
              </p>
            </div>

            {annahmestellenWerdenGeladen && (
              <div className="mt-8 rounded-2xl bg-white p-6 shadow">
                <p className="text-slate-600">
                  Annahmestellen werden geladen ...
                </p>
              </div>
            )}

            {fehler && (
              <div className="mt-8 rounded-2xl bg-red-100 p-5 text-red-800">
                <p className="font-bold">
                  Annahmestellen konnten nicht
                  geladen werden.
                </p>

                <p className="mt-2 text-sm">
                  {fehler}
                </p>
              </div>
            )}

            {!annahmestellenWerdenGeladen &&
              !fehler &&
              annahmestellen.length === 0 && (
                <div className="mt-8 rounded-2xl bg-white p-6 shadow">
                  <p className="font-bold text-slate-900">
                    Keine aktiven Annahmestellen
                    gefunden
                  </p>

                  <p className="mt-2 text-slate-600">
                    Bitte prüfe die Tabelle
                    „annahmestellen“ in Supabase.
                  </p>
                </div>
              )}

            {!annahmestellenWerdenGeladen &&
              !fehler &&
              annahmestellen.length > 0 && (
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {annahmestellen.map(
                    (annahmestelle) => (
                      <Link
                        key={annahmestelle.id}
                        href={`/kasse?annahmestelle=${annahmestelle.id}&name=${encodeURIComponent(
                          annahmestelle.name,
                        )}`}
                        className="rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {annahmestelle.name}
                            </h3>

                            {annahmestelle.adresse && (
                              <p className="mt-3 text-sm text-slate-600">
                                {
                                  annahmestelle.adresse
                                }
                              </p>
                            )}

                            {annahmestelle.telefon && (
                              <p className="mt-1 text-sm text-slate-500">
                                Telefon:{" "}
                                {
                                  annahmestelle.telefon
                                }
                              </p>
                            )}
                          </div>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Aktiv
                          </span>
                        </div>

                        <div className="mt-6 font-bold text-blue-600">
                          Kasse öffnen →
                        </div>
                      </Link>
                    ),
                  )}
                </div>
              )}
          </>
        )}

        {(darfBenutzerAnzeigen ||
          darfAnnahmestellenAnzeigen) && (
          <div className="mt-10 flex flex-wrap gap-3">
            {darfBenutzerAnzeigen && (
              <Link
                href="/benutzer"
                className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
              >
                Benutzerverwaltung
              </Link>
            )}

            {darfAnnahmestellenAnzeigen && (
              <Link
                href="/annahmestellen"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                Annahmestellen verwalten
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}