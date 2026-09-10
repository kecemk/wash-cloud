"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useBenutzer } from "../context/BenutzerContext";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
  adresse: string | null;
  telefon: string | null;
  aktiv: boolean;
};

export default function AnnahmestellenPage() {
  const { aktuellerBenutzer } = useBenutzer();

  const [
    annahmestellen,
    setAnnahmestellen,
  ] = useState<Annahmestelle[]>([]);

  const [laedt, setLaedt] =
    useState(true);

  const [fehler, setFehler] =
    useState("");

  const [
    formularOffen,
    setFormularOffen,
  ] = useState(false);

  const [neuerName, setNeuerName] =
    useState("");

  const [
    neueAdresse,
    setNeueAdresse,
  ] = useState("");

  const [
    neuesTelefon,
    setNeuesTelefon,
  ] = useState("");

  const [
    speichert,
    setSpeichert,
  ] = useState(false);

  const [
    speichernFehler,
    setSpeichernFehler,
  ] = useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  const istAdmin =
    aktuellerBenutzer?.rolle === "admin";

  useEffect(() => {
    let istAktiv = true;

    async function annahmestellenLaden() {
      setLaedt(true);
      setFehler("");

      const { data, error } =
        await supabase
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
        console.error(
          "Annahmestellen konnten nicht geladen werden:",
          error,
        );

        setFehler(error.message);
        setAnnahmestellen([]);
        setLaedt(false);
        return;
      }

      setAnnahmestellen(
        (data as Annahmestelle[] | null) ??
          [],
      );

      setLaedt(false);
    }

    void annahmestellenLaden();

    return () => {
      istAktiv = false;
    };
  }, []);

  async function annahmestelleHinzufuegen() {
    if (!istAdmin) {
      return;
    }

    const name = neuerName.trim();
    const adresse =
      neueAdresse.trim();
    const telefon =
      neuesTelefon.trim();

    if (!name) {
      alert(
        "Bitte einen Namen für die Annahmestelle eingeben.",
      );
      return;
    }

    const nameExistiert =
      annahmestellen.some(
        (annahmestelle) =>
          annahmestelle.name
            .trim()
            .toLowerCase() ===
          name.toLowerCase(),
      );

    if (nameExistiert) {
      alert(
        "Eine aktive Annahmestelle mit diesem Namen existiert bereits.",
      );
      return;
    }

    setSpeichert(true);
    setSpeichernFehler("");
    setErfolgsmeldung("");

    const { data, error } =
      await supabase
        .from("annahmestellen")
        .insert({
          name,
          adresse:
            adresse || null,
          telefon:
            telefon || null,
          aktiv: true,
        })
        .select(
          "id, name, adresse, telefon, aktiv",
        )
        .single();

    if (error || !data) {
      setSpeichernFehler(
        error?.message ??
          "Die Annahmestelle konnte nicht gespeichert werden.",
      );
      setSpeichert(false);
      return;
    }

    const neueAnnahmestelle =
      data as Annahmestelle;

    setAnnahmestellen(
      (aktuelleAnnahmestellen) =>
        [
          ...aktuelleAnnahmestellen,
          neueAnnahmestelle,
        ].sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "de",
          ),
        ),
    );

    setNeuerName("");
    setNeueAdresse("");
    setNeuesTelefon("");
    setFormularOffen(false);
    setErfolgsmeldung(
      `Die Annahmestelle „${neueAnnahmestelle.name}“ wurde angelegt.`,
    );
    setSpeichert(false);
  }

  return (
    <ZugriffsSchutz
      berechtigung="kasse_anzeigen"
      titel="Kasse gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Kasse öffnen und keine Lieferscheine erstellen."
      zurueckLink="/lieferscheine"
      zurueckText="Zu den Lieferscheinen"
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm text-slate-300">
              Washly
            </p>

            <h1 className="text-2xl font-bold">
              Annahmestelle auswählen
            </h1>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-slate-600">
              Für welche Annahmestelle möchtest
              du einen Lieferschein erstellen?
            </p>

            {istAdmin && (
              <button
                type="button"
                onClick={() => {
                  setFormularOffen(
                    (istOffen) =>
                      !istOffen,
                  );
                  setSpeichernFehler("");
                  setErfolgsmeldung("");
                }}
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white shadow-sm"
              >
                {formularOffen
                  ? "Abbrechen"
                  : "+ Neue Annahmestelle"}
              </button>
            )}
          </div>

          {istAdmin && formularOffen && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-slate-900">
                Neue Annahmestelle
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Nur der Name ist Pflicht. Adresse und Telefon sind optional.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Name *
                  </span>

                  <input
                    type="text"
                    value={neuerName}
                    onChange={(event) =>
                      setNeuerName(
                        event.target.value,
                      )
                    }
                    placeholder="z. B. Westfield"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-slate-700">
                    Adresse
                  </span>

                  <input
                    type="text"
                    value={neueAdresse}
                    onChange={(event) =>
                      setNeueAdresse(
                        event.target.value,
                      )
                    }
                    placeholder="Optional"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-slate-700">
                    Telefon
                  </span>

                  <input
                    type="tel"
                    value={neuesTelefon}
                    onChange={(event) =>
                      setNeuesTelefon(
                        event.target.value,
                      )
                    }
                    placeholder="Optional"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              {speichernFehler && (
                <div className="mt-5 rounded-xl bg-red-100 p-4 text-sm font-semibold text-red-800">
                  {speichernFehler}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  void annahmestelleHinzufuegen()
                }
                disabled={speichert}
                className="mt-5 rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {speichert
                  ? "Wird gespeichert ..."
                  : "Annahmestelle speichern"}
              </button>
            </div>
          )}

          {erfolgsmeldung && (
            <div className="mt-6 rounded-xl bg-green-100 p-4 font-semibold text-green-800">
              {erfolgsmeldung}
            </div>
          )}

          {laedt && (
            <div className="mt-8 rounded-xl bg-white p-6 shadow">
              <p className="text-slate-600">
                Annahmestellen werden geladen ...
              </p>
            </div>
          )}

          {!laedt && fehler && (
            <div className="mt-8 rounded-xl bg-red-100 p-5 text-red-800">
              <p className="font-bold">
                Annahmestellen konnten nicht
                geladen werden.
              </p>

              <p className="mt-2 text-sm">
                {fehler}
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="mt-4 rounded-xl bg-red-800 px-4 py-2 font-bold text-white"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {!laedt &&
            !fehler &&
            annahmestellen.length === 0 && (
              <div className="mt-8 rounded-xl bg-white p-6 shadow">
                <p className="font-bold text-slate-900">
                  Keine aktiven Annahmestellen
                  gefunden
                </p>

                <p className="mt-2 text-slate-600">
                  {istAdmin
                    ? "Lege oben die erste Annahmestelle an."
                    : "Bitte wende dich an einen Administrator."}
                </p>
              </div>
            )}

          {!laedt &&
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
                      className="rounded-2xl bg-white p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-900">
                          {
                            annahmestelle.name
                          }
                        </h2>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Aktiv
                        </span>
                      </div>

                      {annahmestelle.adresse && (
                        <p className="mt-3 text-slate-600">
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

                      <p className="mt-6 font-bold text-blue-600">
                        Kasse öffnen →
                      </p>
                    </Link>
                  ),
                )}
              </div>
            )}

          <div className="mt-10">
            <Link
              href="/"
              className="inline-block rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
            >
              Zurück zur Startseite
            </Link>
          </div>
        </section>
      </main>
    </ZugriffsSchutz>
  );
}
