"use client";

import Link from "next/link";

import ZugriffsSchutz from "../components/ZugriffsSchutz";

import { useBenutzer } from "../context/BenutzerContext";

import { useEffect, useState } from "react";

import LieferscheinStatistik from "../components/LieferscheinStatistik";

import { supabase } from "../lib/supabase";

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

  gesamtbetrag: number | string;

  gesamtteile: number;

  erstellt_am: string;

  fertiggestellt_am: string | null;

  annahmestellen:

    | DatenbankAnnahmestelle

    | DatenbankAnnahmestelle[]

    | null;

  sammelscheine:

    | DatenbankSammelschein[]

    | null;

};

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

type Lieferschein = {

  id: number;

  nummer: string;

  status: string;

  fertiggestelltAm: string;

  annahmestelle: string;

  gesamtbetrag: number;

  gesamtteile: number;

  sammelscheine: Sammelschein[];

};

const artikelMehrzahl: Record<string, string> = {

  Hemd: "Hemden",

  Hose: "Hosen",

  Jacke: "Jacken",

  Anzug: "Anzüge",

  Mantel: "Mäntel",

  Kleid: "Kleider",

};

function zahlUmwandeln(wert: number | string | null | undefined) {

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

    return annahmestellen[0]?.name ?? "Unbekannte Annahmestelle";

  }

  return annahmestellen?.name ?? "Unbekannte Annahmestelle";

}

function lieferscheinUmwandeln(

  daten: DatenbankLieferschein,

): Lieferschein {

  const sammelscheine = (daten.sammelscheine ?? []).map(

    (sammelschein): Sammelschein => ({

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

  );

  const berechneteTeile = sammelscheine.reduce(

    (gesamt, sammelschein) =>

      gesamt +

      sammelschein.positionen.reduce(

        (summe, position) => summe + position.menge,

        0,

      ),

    0,

  );

  const berechneterBetrag = sammelscheine.reduce(

    (gesamt, sammelschein) =>

      gesamt + sammelschein.preis,

    0,

  );

  return {

    id: daten.id,

    nummer: daten.nummer,

    status: daten.status,

    fertiggestelltAm:

      daten.fertiggestellt_am ?? daten.erstellt_am,

    annahmestelle: annahmestellenNameErmitteln(

      daten.annahmestellen,

    ),

    gesamtbetrag:

      zahlUmwandeln(daten.gesamtbetrag) ||

      berechneterBetrag,

    gesamtteile:

      daten.gesamtteile || berechneteTeile,

    sammelscheine,

  };

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

function statusFormatieren(status: string) {

  if (!status) {

    return "Unbekannt";

  }

  return (

    status.charAt(0).toUpperCase() +

    status.slice(1).toLowerCase()

  );

}

export default function LieferscheinePage() {

  const {

    aktuellerBenutzer,

    hatAktuellerBenutzerBerechtigung,

  } = useBenutzer();

  const darfKasseAnzeigen =

    hatAktuellerBenutzerBerechtigung(

      "kasse_anzeigen",

    );

  const [lieferscheine, setLieferscheine] = useState<

    Lieferschein[]

  >([]);

  const [laedt, setLaedt] = useState(true);

  const [fehler, setFehler] = useState("");

  const [suche, setSuche] = useState("");

  useEffect(() => {

    let istAktiv = true;

    async function lieferscheineLaden() {

      setLaedt(true);

      setFehler("");

      if (!aktuellerBenutzer) {

        setLieferscheine([]);

        setLaedt(false);

        return;

      }

      if (

        aktuellerBenutzer.rolle ===

          "annahmestelle" &&

        aktuellerBenutzer.annahmestelleId ===

          null

      ) {

        setLieferscheine([]);

        setFehler(

          "Diesem Benutzer ist keine Annahmestelle zugeordnet.",

        );

        setLaedt(false);

        return;

      }

      let abfrage = supabase

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

        `);

      if (

        aktuellerBenutzer.rolle ===

          "annahmestelle" &&

        aktuellerBenutzer.annahmestelleId !==

          null

      ) {

        abfrage = abfrage.eq(

          "annahmestelle_id",

          aktuellerBenutzer.annahmestelleId,

        );

      }

      const { data, error } = await abfrage

        .order("fertiggestellt_am", {

          ascending: false,

          nullsFirst: false,

        })

        .order("erstellt_am", {

          ascending: false,

        });

      if (!istAktiv) {

        return;

      }

      if (error) {

        console.error(

          "Die Lieferscheine konnten nicht geladen werden:",

          error,

        );

        setFehler(error.message);

        setLieferscheine([]);

        setLaedt(false);

        return;

      }

      const geladeneLieferscheine = (

        (data ?? []) as DatenbankLieferschein[]

      ).map(lieferscheinUmwandeln);

      setLieferscheine(geladeneLieferscheine);

      setLaedt(false);

    }

    void lieferscheineLaden();

    return () => {

      istAktiv = false;

    };

  }, [aktuellerBenutzer]);

  const bereinigteSuche = suche.trim().toLowerCase();

  const gefilterteLieferscheine =

    bereinigteSuche === ""

      ? lieferscheine

      : lieferscheine.filter((lieferschein) => {

          const lieferscheinTreffer =

            lieferschein.nummer

              .toLowerCase()

              .includes(bereinigteSuche);

          const sammelscheinTreffer =

            lieferschein.sammelscheine.some(

              (sammelschein) =>

                sammelschein.nummer

                  .toLowerCase()

                  .includes(bereinigteSuche),

            );

          return lieferscheinTreffer || sammelscheinTreffer;

        });

  const gefundeneSammelscheine =

    bereinigteSuche === ""

      ? []

      : gefilterteLieferscheine.flatMap(

          (lieferschein) =>

            lieferschein.sammelscheine

              .filter((sammelschein) =>

                sammelschein.nummer

                  .toLowerCase()

                  .includes(bereinigteSuche),

              )

              .map((sammelschein) => ({

                nummer: sammelschein.nummer,

                lieferscheinNummer: lieferschein.nummer,

                annahmestelle: lieferschein.annahmestelle,

              })),

        );

  return (

    <ZugriffsSchutz

      berechtigung="lieferscheine_anzeigen"

      titel="Lieferscheine gesperrt"

      beschreibung="Der aktuell ausgewählte Benutzer darf keine Lieferscheine anzeigen."

    >

      <main className="min-h-screen bg-slate-50">

      <header className="bg-slate-950 px-6 py-5 text-white">

        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">

          <div>

            <p className="text-sm text-slate-300">

              Washly

            </p>

            <h1 className="text-2xl font-bold">

              Lieferscheine

            </h1>

            <p className="mt-1 text-sm text-slate-300">

              In Supabase gespeicherte Lieferscheine

            </p>

          </div>

          {darfKasseAnzeigen && (

            <Link

              href="/annahmestellen"

              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"

            >

              Neue Kasse öffnen

            </Link>

          )}

        </div>

      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">

        {!laedt && !fehler && (

          <div className="mb-6 rounded-2xl bg-white p-5 shadow sm:p-6">

            <label className="block">

              <span className="text-sm font-bold text-slate-800">

                Sammelschein oder Lieferschein suchen

              </span>

              <p className="mt-1 text-sm text-slate-500">

                Gib eine Sammelschein-Nummer oder eine Lieferschein-Nummer ein.

              </p>

              <div className="relative mt-4">

                <input

                  type="search"

                  inputMode="search"

                  value={suche}

                  onChange={(event) => setSuche(event.target.value)}

                  placeholder="z. B. 188 oder LS-000017"

                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 pr-24 text-base font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"

                />

                {suche && (

                  <button

                    type="button"

                    onClick={() => setSuche("")}

                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"

                  >

                    Löschen

                  </button>

                )}

              </div>

            </label>

            {bereinigteSuche !== "" && (

              <div className="mt-4">

                {gefilterteLieferscheine.length === 0 ? (

                  <div className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">

                    Kein passender Sammelschein oder Lieferschein gefunden.

                  </div>

                ) : (

                  <div className="rounded-xl bg-blue-50 p-4">

                    <p className="text-sm font-bold text-blue-900">

                      {gefilterteLieferscheine.length} passende{gefilterteLieferscheine.length === 1 ? "r" : ""} Lieferschein{gefilterteLieferscheine.length === 1 ? "" : "e"} gefunden

                    </p>

                    {gefundeneSammelscheine.length > 0 && (

                      <div className="mt-3 space-y-2">

                        {gefundeneSammelscheine.map((treffer) => (

                          <div
                            key={`${treffer.lieferscheinNummer}-${treffer.nummer}`}
                            className="rounded-lg bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-950">
                                  Sammelschein {treffer.nummer}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {treffer.lieferscheinNummer} · {treffer.annahmestelle}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/lieferschein/${encodeURIComponent(
                                    treffer.lieferscheinNummer,
                                  )}`}
                                  className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                                >
                                  Öffnen
                                </Link>

                                <Link
                                  href={`/lieferschein/${encodeURIComponent(
                                    treffer.lieferscheinNummer,
                                  )}/pdf`}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                >
                                  PDF-Ansicht
                                </Link>
                              </div>
                            </div>
                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                )}

              </div>

            )}

          </div>

        )}

        {laedt && (

          <div className="rounded-xl bg-white p-6 shadow">

            <p className="text-slate-600">

              Lieferscheine werden aus Supabase geladen ...

            </p>

          </div>

        )}

        {!laedt && fehler && (

          <div className="rounded-2xl bg-red-100 p-6 text-red-800">

            <h2 className="font-bold">

              Lieferscheine konnten nicht geladen werden

            </h2>

            <p className="mt-2 text-sm">{fehler}</p>

            <button

              type="button"

              onClick={() => window.location.reload()}

              className="mt-4 rounded-xl bg-red-800 px-4 py-2 font-semibold text-white"

            >

              Erneut versuchen

            </button>

          </div>

        )}

        {!laedt &&

          !fehler &&

          lieferscheine.length === 0 && (

            <div className="rounded-2xl bg-white p-8 text-center shadow">

              <h2 className="text-xl font-bold text-slate-900">

                Noch keine Lieferscheine in Supabase

              </h2>

              <p className="mt-2 text-slate-600">

                Fertiggestellte Lieferscheine werden hier

                automatisch angezeigt.

              </p>

              {darfKasseAnzeigen && (

                <Link

                  href="/annahmestellen"

                  className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"

                >

                  Ersten Lieferschein erstellen

                </Link>

              )}

            </div>

          )}

        {!laedt &&

          !fehler &&

          lieferscheine.length > 0 && (

            <div className="space-y-6">

              <div className="rounded-xl bg-white p-5 shadow">

                <p className="text-sm text-slate-600">

                  Lieferscheine in der Cloud

                </p>

                <p className="mt-1 text-3xl font-bold text-slate-900">

                  {lieferscheine.length}

                </p>

              </div>

              {gefilterteLieferscheine.map((lieferschein) => (

                <article

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

                      <p className="mt-1 text-sm font-semibold text-slate-700">

                        {lieferschein.annahmestelle}

                      </p>

                      <p className="mt-1 text-sm text-slate-500">

                        {datumFormatieren(

                          lieferschein.fertiggestelltAm,

                        )}

                      </p>

                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">

                      {statusFormatieren(

                        lieferschein.status,

                      )}

                    </span>

                  </div>

                  {lieferschein.sammelscheine.length ===

                    0 && (

                    <div className="mt-6 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">

                      Zu diesem Lieferschein wurden keine

                      Sammelscheine gefunden.

                    </div>

                  )}

                  {lieferschein.sammelscheine.length >

                    0 && (

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

                                  {sammelschein.positionen

                                    .length === 0 && (

                                    <p>

                                      Keine Positionen

                                      gefunden

                                    </p>

                                  )}

                                  {sammelschein.positionen.map(

                                    (position) => (

                                      <p key={position.id}>

                                        {position.menge}{" "}

                                        {artikelText(

                                          position,

                                        )}

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

                  )}

                  <div className="mt-6">

                    <LieferscheinStatistik

                      anzahlSammelscheine={

                        lieferschein.sammelscheine.length

                      }

                      gesamtTeile={

                        lieferschein.gesamtteile

                      }

                      gesamtBetrag={

                        lieferschein.gesamtbetrag

                      }

                    />

                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Link
                      href={`/lieferschein/${encodeURIComponent(
                        lieferschein.nummer,
                      )}`}
                      className="block w-full rounded-xl bg-slate-950 px-5 py-4 text-center font-bold text-white transition hover:bg-slate-800"
                    >
                      Lieferschein öffnen
                    </Link>

                    <Link
                      href={`/lieferschein/${encodeURIComponent(
                        lieferschein.nummer,
                      )}/pdf`}
                      className="block w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-5 py-4 text-center font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    >
                      PDF-Ansicht
                    </Link>
                  </div>

                </article>

              ))}

            </div>

          )}

      </section>

      </main>

    </ZugriffsSchutz>

  );

}