"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
};

type OffenerSammelschein = {
  id: number;
  annahmestelle_id: number;
  nummer: string;
  status: "offen" | "erledigt";
  erstellt_am: string;
};

export default function SammelscheinEingangPage() {
  const [annahmestellen, setAnnahmestellen] =
    useState<Annahmestelle[]>([]);

  const [
    ausgewaehlteAnnahmestelleId,
    setAusgewaehlteAnnahmestelleId,
  ] = useState("");

  const [nummer, setNummer] =
    useState("");

  const [
    offeneSammelscheine,
    setOffeneSammelscheine,
  ] = useState<OffenerSammelschein[]>([]);

  const [wirdGeladen, setWirdGeladen] =
    useState(true);

  const [speichert, setSpeichert] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const [erfolg, setErfolg] =
    useState("");

  const ausgewaehlteAnnahmestelle =
    useMemo(
      () =>
        annahmestellen.find(
          (annahmestelle) =>
            String(annahmestelle.id) ===
            ausgewaehlteAnnahmestelleId,
        ) ?? null,
      [
        annahmestellen,
        ausgewaehlteAnnahmestelleId,
      ],
    );

  useEffect(() => {
    let istAktiv = true;

    async function datenLaden() {
      setWirdGeladen(true);
      setFehler("");

      const [
        annahmestellenErgebnis,
        sammelErgebnis,
      ] = await Promise.all([
        supabase
          .from("annahmestellen")
          .select("id, name")
          .eq("aktiv", true)
          .order("name", {
            ascending: true,
          }),
        supabase
          .from("offene_sammelscheine")
          .select(
            "id, annahmestelle_id, nummer, status, erstellt_am",
          )
          .eq("status", "offen")
          .order("erstellt_am", {
            ascending: false,
          }),
      ]);

      if (!istAktiv) return;

      if (annahmestellenErgebnis.error) {
        setFehler(
          annahmestellenErgebnis.error.message,
        );
        setWirdGeladen(false);
        return;
      }

      if (sammelErgebnis.error) {
        setFehler(
          sammelErgebnis.error.message,
        );
        setWirdGeladen(false);
        return;
      }

      const geladeneAnnahmestellen =
        (annahmestellenErgebnis.data as
          | Annahmestelle[]
          | null) ?? [];

      const geladeneSammelscheine =
        (sammelErgebnis.data as
          | OffenerSammelschein[]
          | null) ?? [];

      setAnnahmestellen(
        geladeneAnnahmestellen,
      );

      setOffeneSammelscheine(
        geladeneSammelscheine,
      );

      if (
        geladeneAnnahmestellen.length > 0
      ) {
        setAusgewaehlteAnnahmestelleId(
          String(
            geladeneAnnahmestellen[0].id,
          ),
        );
      }

      setWirdGeladen(false);
    }

    void datenLaden();

    return () => {
      istAktiv = false;
    };
  }, []);

  const sichtbareSammelscheine =
    useMemo(
      () =>
        offeneSammelscheine.filter(
          (sammelschein) =>
            String(
              sammelscheinAnnahmestelleId(
                sammelschein,
              ),
            ) ===
            ausgewaehlteAnnahmestelleId,
        ),
      [
        offeneSammelscheine,
        ausgewaehlteAnnahmestelleId,
      ],
    );

  function sammelscheinAnnahmestelleId(
    sammelschein: OffenerSammelschein,
  ) {
    return sammelschein.annahmestelle_id;
  }

  async function nummerSpeichern() {
    const bereinigteNummer =
      nummer.trim();

    if (!ausgewaehlteAnnahmestelleId) {
      alert(
        "Bitte zuerst eine Annahmestelle auswählen.",
      );
      return;
    }

    if (!bereinigteNummer) {
      alert(
        "Bitte eine Sammelschein-Nummer eingeben.",
      );
      return;
    }

    const bereitsVorhanden =
      offeneSammelscheine.some(
        (sammelschein) =>
          sammelschein.annahmestelle_id ===
            Number(
              ausgewaehlteAnnahmestelleId,
            ) &&
          sammelschein.nummer ===
            bereinigteNummer &&
          sammelschein.status === "offen",
      );

    if (bereitsVorhanden) {
      alert(
        "Diese Nummer ist für die Annahmestelle bereits offen.",
      );
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolg("");

    const { data, error } =
      await supabase
        .from("offene_sammelscheine")
        .insert({
          annahmestelle_id: Number(
            ausgewaehlteAnnahmestelleId,
          ),
          nummer: bereinigteNummer,
          status: "offen",
          erkannt_durch_ocr: false,
        })
        .select(
          "id, annahmestelle_id, nummer, status, erstellt_am",
        )
        .single();

    if (error || !data) {
      setFehler(
        error?.message ??
          "Die Nummer konnte nicht gespeichert werden.",
      );
      setSpeichert(false);
      return;
    }

    setOffeneSammelscheine(
      (aktuelleSammelscheine) => [
        data as OffenerSammelschein,
        ...aktuelleSammelscheine,
      ],
    );

    setNummer("");
    setErfolg(
      `Sammelschein ${bereinigteNummer} wurde gespeichert.`,
    );
    setSpeichert(false);
  }

  async function nummerLoeschen(
    sammelschein: OffenerSammelschein,
  ) {
    const bestaetigt = window.confirm(
      `Soll die offene Nummer ${sammelschein.nummer} entfernt werden?`,
    );

    if (!bestaetigt) return;

    setFehler("");
    setErfolg("");

    const { error } = await supabase
      .from("offene_sammelscheine")
      .delete()
      .eq("id", sammelschein.id);

    if (error) {
      setFehler(error.message);
      return;
    }

    setOffeneSammelscheine(
      (aktuelleSammelscheine) =>
        aktuelleSammelscheine.filter(
          (eintrag) =>
            eintrag.id !==
            sammelschein.id,
        ),
    );
  }

  return (
    <ZugriffsSchutz
      berechtigung="kasse_anzeigen"
      titel="Sammelschein-Eingang gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Sammelscheine erfassen."
      zurueckLink="/"
      zurueckText="Zur Startseite"
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Washly
              </p>

              <h1 className="text-2xl font-bold">
                Sammelschein-Eingang
              </h1>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-slate-600 px-4 py-2 font-semibold"
            >
              Zur Startseite
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {fehler && (
            <div className="mb-5 rounded-xl bg-red-100 p-4 text-red-800">
              {fehler}
            </div>
          )}

          {erfolg && (
            <div className="mb-5 rounded-xl bg-green-100 p-4 text-green-800">
              {erfolg}
            </div>
          )}

          <section className="rounded-3xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Wareneingang
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Offene Nummer erfassen
            </h2>

            <p className="mt-2 text-slate-600">
              Zuerst erfassen wir die Nummer manuell. Im nächsten Schritt kommt die Fotoerkennung dazu.
            </p>

            {wirdGeladen ? (
              <p className="mt-6 text-slate-600">
                Daten werden geladen ...
              </p>
            ) : (
              <>
                <label className="mt-6 block">
                  <span className="text-sm font-medium text-slate-700">
                    Annahmestelle
                  </span>

                  <select
                    value={
                      ausgewaehlteAnnahmestelleId
                    }
                    onChange={(event) => {
                      setAusgewaehlteAnnahmestelleId(
                        event.target.value,
                      );
                      setErfolg("");
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  >
                    {annahmestellen.map(
                      (annahmestelle) => (
                        <option
                          key={annahmestelle.id}
                          value={annahmestelle.id}
                        >
                          {annahmestelle.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nummer}
                    onChange={(event) =>
                      setNummer(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        void nummerSpeichern();
                      }
                    }}
                    placeholder="Sammelschein-Nummer"
                    autoFocus
                    className="min-w-0 flex-1 rounded-xl border-2 border-blue-300 px-4 py-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-700"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void nummerSpeichern()
                    }
                    disabled={speichert}
                    className="rounded-xl bg-blue-700 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {speichert
                      ? "Speichert ..."
                      : "Nummer speichern"}
                  </button>
                </div>
              </>
            )}
          </section>

          {!wirdGeladen &&
            ausgewaehlteAnnahmestelle && (
              <section className="mt-8 rounded-3xl bg-white p-6 shadow sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Offene Sammelscheine
                    </h2>

                    <p className="mt-1 text-slate-600">
                      {
                        ausgewaehlteAnnahmestelle.name
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 font-bold text-blue-800">
                    {
                      sichtbareSammelscheine.length
                    }{" "}
                    offen
                  </span>
                </div>

                {sichtbareSammelscheine.length ===
                0 ? (
                  <div className="mt-6 rounded-xl bg-slate-100 p-5 text-slate-600">
                    Für diese Annahmestelle sind aktuell keine offenen Nummern gespeichert.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {sichtbareSammelscheine.map(
                      (sammelschein) => (
                        <div
                          key={sammelschein.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                        >
                          <span className="text-lg font-bold text-slate-900">
                            {sammelschein.nummer}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              void nummerLoeschen(
                                sammelschein,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
                          >
                            Entfernen
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            )}
        </div>
      </main>
    </ZugriffsSchutz>
  );
}