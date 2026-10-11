"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useBenutzer } from "../context/BenutzerContext";
import { supabase } from "../lib/supabase";

type Artikel = {
  id: number;
  name: string;
  aktiv: boolean;
  sortierung: number;
  erstellt_am: string;
  aktualisiert_am: string;
};

type Annahmestelle = {
  id: number;
  name: string;
  aktiv: boolean;
};

type ArtikelPreis = {
  id: number;
  artikel_id: number;
  annahmestelle_id: number;
  preis: number;
};

type PreisEingaben = Record<number, string>;

function preisFormatieren(preis: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(preis);
}

function preisTextZuZahl(
  wert: string,
): number | null {
  const bereinigt = wert
    .replace("€", "")
    .replace(",", ".")
    .trim();

  if (bereinigt === "") {
    return null;
  }

  const zahl = Number(bereinigt);

  if (
    Number.isNaN(zahl) ||
    zahl < 0
  ) {
    return Number.NaN;
  }

  return Math.round(zahl * 100) / 100;
}

export default function ArtikelVerwaltungPage() {
  const {
    aktuellerBenutzer,
    laedt: benutzerWirdGeladen,
  } = useBenutzer();

  const [artikel, setArtikel] =
    useState<Artikel[]>([]);

  const [
    annahmestellen,
    setAnnahmestellen,
  ] = useState<Annahmestelle[]>([]);

  const [
    artikelPreise,
    setArtikelPreise,
  ] = useState<ArtikelPreis[]>([]);

  const [name, setName] =
    useState("");

  const [sortierung, setSortierung] =
    useState("");

  const [
    preisEingaben,
    setPreisEingaben,
  ] = useState<PreisEingaben>({});

  const [
    bearbeiteteArtikelId,
    setBearbeiteteArtikelId,
  ] = useState<number | null>(null);

  const [laedt, setLaedt] =
    useState(false);

  const [speichert, setSpeichert] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const [erfolg, setErfolg] =
    useState("");

  const istAdmin =
    aktuellerBenutzer?.rolle === "admin";

  useEffect(() => {
    if (
      benutzerWirdGeladen ||
      !istAdmin
    ) {
      return;
    }

    void datenLaden();
  }, [
    benutzerWirdGeladen,
    istAdmin,
  ]);

  async function datenLaden() {
    setLaedt(true);
    setFehler("");

    const [
      artikelAntwort,
      annahmestellenAntwort,
      preiseAntwort,
    ] = await Promise.all([
      supabase
        .from("artikel")
        .select(
          "id, name, aktiv, sortierung, erstellt_am, aktualisiert_am",
        )
        .order("sortierung", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("annahmestellen")
        .select("id, name, aktiv")
        .eq("aktiv", true)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from(
          "artikel_annahmestellen_preise",
        )
        .select(
          "id, artikel_id, annahmestelle_id, preis",
        ),
    ]);

    if (artikelAntwort.error) {
      setArtikel([]);
      setFehler(
        artikelAntwort.error.message,
      );
      setLaedt(false);
      return;
    }

    if (
      annahmestellenAntwort.error
    ) {
      setAnnahmestellen([]);
      setFehler(
        annahmestellenAntwort.error.message,
      );
      setLaedt(false);
      return;
    }

    if (preiseAntwort.error) {
      setArtikelPreise([]);
      setFehler(
        preiseAntwort.error.message,
      );
      setLaedt(false);
      return;
    }

    setArtikel(
      (artikelAntwort.data as
        | Artikel[]
        | null) ?? [],
    );

    setAnnahmestellen(
      (annahmestellenAntwort.data as
        | Annahmestelle[]
        | null) ?? [],
    );

    setArtikelPreise(
      (preiseAntwort.data as
        | ArtikelPreis[]
        | null) ?? [],
    );

    setLaedt(false);
  }

  function formularLeeren() {
    setName("");
    setSortierung("");
    setPreisEingaben({});
    setBearbeiteteArtikelId(null);
  }

  function artikelBearbeiten(
    artikelEintrag: Artikel,
  ) {
    setBearbeiteteArtikelId(
      artikelEintrag.id,
    );

    setName(artikelEintrag.name);

    setSortierung(
      String(artikelEintrag.sortierung),
    );

    const neuePreisEingaben:
      PreisEingaben = {};

    annahmestellen.forEach(
      (annahmestelle) => {
        const preis = artikelPreise.find(
          (eintrag) =>
            eintrag.artikel_id ===
              artikelEintrag.id &&
            eintrag.annahmestelle_id ===
              annahmestelle.id,
        );

        neuePreisEingaben[
          annahmestelle.id
        ] = preis
          ? preis.preis
              .toFixed(2)
              .replace(".", ",")
          : "";
      },
    );

    setPreisEingaben(
      neuePreisEingaben,
    );

    setFehler("");
    setErfolg("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function preiseSpeichern(
    artikelId: number,
  ) {
    for (
      const annahmestelle of annahmestellen
    ) {
      const eingabe =
        preisEingaben[
          annahmestelle.id
        ] ?? "";

      const preis =
        preisTextZuZahl(eingabe);

      if (
        typeof preis === "number" &&
        Number.isNaN(preis)
      ) {
        throw new Error(
          `Der Preis für ${annahmestelle.name} ist ungültig.`,
        );
      }

      if (preis === null) {
        const { error } = await supabase
          .from(
            "artikel_annahmestellen_preise",
          )
          .delete()
          .eq("artikel_id", artikelId)
          .eq(
            "annahmestelle_id",
            annahmestelle.id,
          );

        if (error) {
          throw new Error(
            `Der Preis für ${annahmestelle.name} konnte nicht entfernt werden: ${error.message}`,
          );
        }

        continue;
      }

      const { error } = await supabase
        .from(
          "artikel_annahmestellen_preise",
        )
        .upsert(
          {
            artikel_id: artikelId,
            annahmestelle_id:
              annahmestelle.id,
            preis,
            aktualisiert_am:
              new Date().toISOString(),
          },
          {
            onConflict:
              "artikel_id,annahmestelle_id",
          },
        );

      if (error) {
        throw new Error(
          `Der Preis für ${annahmestelle.name} konnte nicht gespeichert werden: ${error.message}`,
        );
      }
    }
  }

  async function artikelSpeichern(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (speichert) {
      return;
    }

    const bereinigterName =
      name.trim();

    const sortierungAlsZahl =
      sortierung.trim() === ""
        ? 0
        : Number(sortierung);

    if (!bereinigterName) {
      setFehler(
        "Bitte gib einen Artikelnamen ein.",
      );
      return;
    }

    if (
      !Number.isInteger(
        sortierungAlsZahl,
      ) ||
      sortierungAlsZahl < 0
    ) {
      setFehler(
        "Die Sortierung muss eine ganze Zahl ab 0 sein.",
      );
      return;
    }

    for (
      const annahmestelle of annahmestellen
    ) {
      const eingabe =
        preisEingaben[
          annahmestelle.id
        ] ?? "";

      const preis =
        preisTextZuZahl(eingabe);

      if (
        typeof preis === "number" &&
        Number.isNaN(preis)
      ) {
        setFehler(
          `Bitte gib für ${annahmestelle.name} einen gültigen Preis ein oder lasse das Feld leer.`,
        );
        return;
      }
    }

    setSpeichert(true);
    setFehler("");
    setErfolg("");

    try {
      let artikelId =
        bearbeiteteArtikelId;

      if (
        bearbeiteteArtikelId === null
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("artikel")
          .insert({
            name: bereinigterName,
            sortierung:
              sortierungAlsZahl,
          })
          .select("id")
          .single();

        if (error || !data) {
          throw new Error(
            error?.code === "23505"
              ? "Dieser Artikel ist bereits vorhanden."
              : error?.message ??
                  "Der Artikel konnte nicht angelegt werden.",
          );
        }

        artikelId = Number(data.id);
      } else {
        const { error } = await supabase
          .from("artikel")
          .update({
            name: bereinigterName,
            sortierung:
              sortierungAlsZahl,
            aktualisiert_am:
              new Date().toISOString(),
          })
          .eq(
            "id",
            bearbeiteteArtikelId,
          );

        if (error) {
          throw new Error(
            error.code === "23505"
              ? "Dieser Artikel ist bereits vorhanden."
              : error.message,
          );
        }
      }

      if (artikelId === null) {
        throw new Error(
          "Die Artikel-ID konnte nicht ermittelt werden.",
        );
      }

      await preiseSpeichern(
        artikelId,
      );

      setErfolg(
        bearbeiteteArtikelId === null
          ? "Der Artikel und die optionalen Preise wurden hinzugefügt."
          : "Der Artikel und die Preise wurden gespeichert.",
      );

      formularLeeren();
      await datenLaden();
    } catch (unbekannterFehler) {
      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Der Artikel konnte nicht gespeichert werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  async function artikelStatusAendern(
    artikelEintrag: Artikel,
  ) {
    setFehler("");
    setErfolg("");

    const { error } =
      await supabase
        .from("artikel")
        .update({
          aktiv:
            !artikelEintrag.aktiv,
          aktualisiert_am:
            new Date().toISOString(),
        })
        .eq(
          "id",
          artikelEintrag.id,
        );

    if (error) {
      setFehler(error.message);
      return;
    }

    setErfolg(
      artikelEintrag.aktiv
        ? "Der Artikel wurde deaktiviert."
        : "Der Artikel wurde aktiviert.",
    );

    await datenLaden();
  }

  const preiseNachArtikel =
    useMemo(() => {
      const map = new Map<
        number,
        ArtikelPreis[]
      >();

      artikelPreise.forEach(
        (preisEintrag) => {
          const aktuellePreise =
            map.get(
              preisEintrag.artikel_id,
            ) ?? [];

          aktuellePreise.push(
            preisEintrag,
          );

          map.set(
            preisEintrag.artikel_id,
            aktuellePreise,
          );
        },
      );

      return map;
    }, [artikelPreise]);

  if (benutzerWirdGeladen) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          Benutzerrechte werden geladen ...
        </div>
      </main>
    );
  }

  if (!istAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-slate-950">
            Artikelverwaltung gesperrt
          </h1>

          <p className="mt-3 text-slate-600">
            Nur der Admin darf Artikel anlegen und bearbeiten.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
          >
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-6 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-300">
            Washly
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Artikelverwaltung
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Artikel und optionale Preise je Annahmestelle verwalten.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {fehler && (
          <div className="mb-6 rounded-xl bg-red-100 p-4 font-semibold text-red-800">
            {fehler}
          </div>
        )}

        {erfolg && (
          <div className="mb-6 rounded-xl bg-green-100 p-4 font-semibold text-green-800">
            {erfolg}
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">
            {bearbeiteteArtikelId === null
              ? "Neuen Artikel hinzufügen"
              : "Artikel bearbeiten"}
          </h2>

          <form
            onSubmit={artikelSpeichern}
            className="mt-6 grid gap-4 md:grid-cols-[1fr_180px]"
          >
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Artikelname
              </span>

              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(
                    event.target.value,
                  );
                  setFehler("");
                }}
                placeholder="z. B. Pullover"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Reihenfolge
              </span>

              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={sortierung}
                onChange={(event) => {
                  setSortierung(
                    event.target.value,
                  );
                  setFehler("");
                }}
                placeholder="z. B. 70"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
              />
            </label>

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div>
                  <p className="font-bold text-slate-950">
                    Preise je Annahmestelle
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Optional. Wenn kein Preis eingetragen ist, kann der Preis in der Kasse weiterhin manuell eingegeben werden.
                  </p>
                </div>

                {annahmestellen.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-orange-100 p-4 text-sm text-orange-800">
                    Es wurden keine aktiven Annahmestellen gefunden.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {annahmestellen.map(
                      (annahmestelle) => (
                        <label
                          key={
                            annahmestelle.id
                          }
                          className="block rounded-xl bg-white p-4 shadow-sm"
                        >
                          <span className="text-sm font-bold text-slate-800">
                            {
                              annahmestelle.name
                            }
                          </span>

                          <div className="relative mt-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                preisEingaben[
                                  annahmestelle
                                    .id
                                ] ?? ""
                              }
                              onChange={(
                                event,
                              ) => {
                                setPreisEingaben(
                                  (
                                    aktuellePreise,
                                  ) => ({
                                    ...aktuellePreise,
                                    [annahmestelle.id]:
                                      event
                                        .target
                                        .value,
                                  }),
                                );
                                setFehler(
                                  "",
                                );
                              }}
                              placeholder="Kein Preis"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10 text-slate-950"
                            />

                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                              €
                            </span>
                          </div>
                        </label>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={speichert}
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {speichert
                  ? "Wird gespeichert ..."
                  : bearbeiteteArtikelId ===
                      null
                    ? "Artikel hinzufügen"
                    : "Änderungen speichern"}
              </button>

              {bearbeiteteArtikelId !==
                null && (
                <button
                  type="button"
                  onClick={() => {
                    formularLeeren();
                    setFehler("");
                    setErfolg("");
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Gespeicherte Artikel
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Hinterlegte Preise werden je Annahmestelle angezeigt.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              {artikel.length} Artikel
            </span>
          </div>

          {laedt && (
            <div className="mt-6 rounded-xl bg-slate-100 p-5 text-slate-600">
              Artikel werden geladen ...
            </div>
          )}

          {!laedt &&
            artikel.length === 0 && (
              <div className="mt-6 rounded-xl bg-orange-100 p-5 text-orange-800">
                Es sind noch keine Artikel vorhanden.
              </div>
            )}

          {!laedt &&
            artikel.length > 0 && (
              <div className="mt-6 space-y-3">
                {artikel.map(
                  (artikelEintrag) => {
                    const preise =
                      preiseNachArtikel.get(
                        artikelEintrag.id,
                      ) ?? [];

                    return (
                      <div
                        key={
                          artikelEintrag.id
                        }
                        className={`rounded-2xl border p-4 ${
                          artikelEintrag.aktiv
                            ? "border-slate-200 bg-white"
                            : "border-slate-200 bg-slate-100 opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-slate-950">
                              {
                                artikelEintrag.name
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Reihenfolge:{" "}
                              {
                                artikelEintrag.sortierung
                              }
                              {" · "}
                              {artikelEintrag.aktiv
                                ? "Aktiv"
                                : "Deaktiviert"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                artikelBearbeiten(
                                  artikelEintrag,
                                )
                              }
                              className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700"
                            >
                              Bearbeiten
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void artikelStatusAendern(
                                  artikelEintrag,
                                )
                              }
                              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                                artikelEintrag.aktiv
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {artikelEintrag.aktiv
                                ? "Deaktivieren"
                                : "Aktivieren"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {annahmestellen.map(
                            (
                              annahmestelle,
                            ) => {
                              const preis =
                                preise.find(
                                  (
                                    eintrag,
                                  ) =>
                                    eintrag.annahmestelle_id ===
                                    annahmestelle.id,
                                );

                              return (
                                <span
                                  key={
                                    annahmestelle.id
                                  }
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                    preis
                                      ? "bg-blue-50 text-blue-800"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {
                                    annahmestelle.name
                                  }
                                  :{" "}
                                  {preis
                                    ? preisFormatieren(
                                        preis.preis,
                                      )
                                    : "kein Preis"}
                                </span>
                              );
                            },
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
        </div>
      </section>
    </main>
  );
}
