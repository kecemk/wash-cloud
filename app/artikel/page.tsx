"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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

export default function ArtikelVerwaltungPage() {
  const {
    aktuellerBenutzer,
    laedt: benutzerWirdGeladen,
  } = useBenutzer();

  const [artikel, setArtikel] =
    useState<Artikel[]>([]);

  const [name, setName] =
    useState("");

  const [sortierung, setSortierung] =
    useState("");

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

    void artikelLaden();
  }, [
    benutzerWirdGeladen,
    istAdmin,
  ]);

  async function artikelLaden() {
    setLaedt(true);
    setFehler("");

    const { data, error } =
      await supabase
        .from("artikel")
        .select(
          "id, name, aktiv, sortierung, erstellt_am, aktualisiert_am",
        )
        .order("sortierung", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

    if (error) {
      setArtikel([]);
      setFehler(error.message);
    } else {
      setArtikel(
        (data as Artikel[] | null) ?? [],
      );
    }

    setLaedt(false);
  }

  function formularLeeren() {
    setName("");
    setSortierung("");
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

    setFehler("");
    setErfolg("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

    setSpeichert(true);
    setFehler("");
    setErfolg("");

    const anfrage =
      bearbeiteteArtikelId === null
        ? supabase
            .from("artikel")
            .insert({
              name: bereinigterName,
              sortierung:
                sortierungAlsZahl,
            })
        : supabase
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

    const { error } = await anfrage;

    if (error) {
      setFehler(
        error.code === "23505"
          ? "Dieser Artikel ist bereits vorhanden."
          : error.message,
      );
      setSpeichert(false);
      return;
    }

    setErfolg(
      bearbeiteteArtikelId === null
        ? "Der Artikel wurde hinzugefügt."
        : "Der Artikel wurde gespeichert.",
    );

    formularLeeren();
    await artikelLaden();
    setSpeichert(false);
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
          aktiv: !artikelEintrag.aktiv,
          aktualisiert_am:
            new Date().toISOString(),
        })
        .eq("id", artikelEintrag.id);

    if (error) {
      setFehler(error.message);
      return;
    }

    setErfolg(
      artikelEintrag.aktiv
        ? "Der Artikel wurde deaktiviert."
        : "Der Artikel wurde aktiviert.",
    );

    await artikelLaden();
  }

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
            Artikel dauerhaft für die Kasse anlegen, sortieren und deaktivieren.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
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

        <div className="rounded-3xl bg-white p-6 shadow">
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
                  setName(event.target.value);
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

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={speichert}
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {speichert
                  ? "Wird gespeichert ..."
                  : bearbeiteteArtikelId === null
                    ? "Artikel hinzufügen"
                    : "Änderungen speichern"}
              </button>

              {bearbeiteteArtikelId !== null && (
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

        <div className="mt-8 rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Gespeicherte Artikel
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Aktive Artikel erscheinen später automatisch in der Kasse.
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

          {!laedt && artikel.length === 0 && (
            <div className="mt-6 rounded-xl bg-orange-100 p-5 text-orange-800">
              Es sind noch keine Artikel vorhanden.
            </div>
          )}

          {!laedt && artikel.length > 0 && (
            <div className="mt-6 space-y-3">
              {artikel.map(
                (artikelEintrag) => (
                  <div
                    key={artikelEintrag.id}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${
                      artikelEintrag.aktiv
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-100 opacity-70"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-950">
                        {artikelEintrag.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Reihenfolge:{" "}
                        {artikelEintrag.sortierung}
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
                ),
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}