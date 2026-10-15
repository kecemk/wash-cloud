"use client";

import { useEffect, useMemo, useState } from "react";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useBenutzer } from "../context/BenutzerContext";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
};

type LieferscheinZeile = {
  id: number;
  annahmestelle_id: number;
  fertiggestellt_am: string | null;
  gesamtbetrag: number | string;
};

type SammelscheinZeile = {
  id: number;
  lieferschein_id: number;
};

type PositionZeile = {
  artikel: string;
  menge: number;
  sammelschein_id: number;
};

type ArtikelAuswertung = {
  artikel: string;
  anzahl: number;
};

function datumHeute(): string {
  const heute = new Date();
  const jahr = heute.getFullYear();
  const monat = String(heute.getMonth() + 1).padStart(2, "0");
  const tag = String(heute.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

function ersterTagDesMonats(): string {
  const heute = new Date();
  const jahr = heute.getFullYear();
  const monat = String(heute.getMonth() + 1).padStart(2, "0");
  return `${jahr}-${monat}-01`;
}

function formatZahl(wert: number): string {
  return new Intl.NumberFormat("de-DE").format(wert);
}

function formatGeld(wert: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(wert);
}

function zahlUmwandeln(
  wert: number | string | null | undefined,
): number {
  const zahl =
    typeof wert === "number"
      ? wert
      : Number(String(wert ?? "0").replace(",", "."));

  return Number.isFinite(zahl) ? zahl : 0;
}

export default function AuswertungPage() {
  const { aktuellerBenutzer } = useBenutzer();

  const istAdmin =
    aktuellerBenutzer?.rolle === "admin";

  const istAnnahmestelle =
    aktuellerBenutzer?.rolle === "annahmestelle";

  const darfAuswertungAnzeigen =
    istAdmin || istAnnahmestelle;

  const [annahmestellen, setAnnahmestellen] =
    useState<Annahmestelle[]>([]);

  const [vonDatum, setVonDatum] =
    useState(ersterTagDesMonats());

  const [bisDatum, setBisDatum] =
    useState(datumHeute());

  const [annahmestelleId, setAnnahmestelleId] =
    useState("");

  const [lieferscheine, setLieferscheine] =
    useState<LieferscheinZeile[]>([]);

  const [sammelscheine, setSammelscheine] =
    useState<SammelscheinZeile[]>([]);

  const [positionen, setPositionen] =
    useState<PositionZeile[]>([]);

  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    async function annahmestellenLaden() {
      if (!aktuellerBenutzer) {
        setAnnahmestellen([]);
        return;
      }

      if (istAnnahmestelle) {
        const eigeneId =
          aktuellerBenutzer.annahmestelleId;

        if (eigeneId === null) {
          setAnnahmestellen([]);
          setAnnahmestelleId("");
          setFehler(
            "Diesem Benutzer ist keine Annahmestelle zugeordnet.",
          );
          return;
        }

        setAnnahmestelleId(String(eigeneId));

        const { data, error } = await supabase
          .from("annahmestellen")
          .select("id, name")
          .eq("id", eigeneId)
          .maybeSingle();

        if (error) {
          setAnnahmestellen([]);
          setFehler(
            `Die eigene Annahmestelle konnte nicht geladen werden: ${error.message}`,
          );
          return;
        }

        setAnnahmestellen(
          data ? [data as Annahmestelle] : [],
        );
        return;
      }

      if (!istAdmin) {
        setAnnahmestellen([]);
        setAnnahmestelleId("");
        return;
      }

      const { data, error } = await supabase
        .from("annahmestellen")
        .select("id, name")
        .eq("aktiv", true)
        .order("name", { ascending: true });

      if (error) {
        setFehler(
          `Annahmestellen konnten nicht geladen werden: ${error.message}`,
        );
        return;
      }

      setAnnahmestellen(
        (data as Annahmestelle[] | null) ?? [],
      );
    }

    void annahmestellenLaden();
  }, [
    aktuellerBenutzer,
    istAdmin,
    istAnnahmestelle,
  ]);

  useEffect(() => {
    async function auswertungLaden() {
      if (
        !aktuellerBenutzer ||
        !darfAuswertungAnzeigen
      ) {
        setLieferscheine([]);
        setSammelscheine([]);
        setPositionen([]);
        return;
      }

      if (!vonDatum || !bisDatum) {
        return;
      }

      if (
        istAnnahmestelle &&
        aktuellerBenutzer.annahmestelleId === null
      ) {
        setLieferscheine([]);
        setSammelscheine([]);
        setPositionen([]);
        setFehler(
          "Diesem Benutzer ist keine Annahmestelle zugeordnet.",
        );
        return;
      }

      if (vonDatum > bisDatum) {
        setFehler(
          "Das Von-Datum darf nicht nach dem Bis-Datum liegen.",
        );
        return;
      }

      setLaedt(true);
      setFehler("");

      try {
        const vonIso =
          `${vonDatum}T00:00:00`;

        const bisNaechsterTag = new Date(
          `${bisDatum}T00:00:00`,
        );
        bisNaechsterTag.setDate(
          bisNaechsterTag.getDate() + 1,
        );

        let lieferscheinAbfrage = supabase
          .from("lieferscheine")
          .select(
            "id, annahmestelle_id, fertiggestellt_am, gesamtbetrag",
          )
          .gte("fertiggestellt_am", vonIso)
          .lt(
            "fertiggestellt_am",
            bisNaechsterTag.toISOString(),
          )
          .order("fertiggestellt_am", {
            ascending: false,
          });

        if (istAnnahmestelle) {
          lieferscheinAbfrage =
            lieferscheinAbfrage.eq(
              "annahmestelle_id",
              aktuellerBenutzer.annahmestelleId as number,
            );
        } else if (
          istAdmin &&
          annahmestelleId
        ) {
          lieferscheinAbfrage =
            lieferscheinAbfrage.eq(
              "annahmestelle_id",
              Number(annahmestelleId),
            );
        }

        const {
          data: lieferscheinDaten,
          error: lieferscheinFehler,
        } = await lieferscheinAbfrage;

        if (lieferscheinFehler) {
          throw new Error(
            lieferscheinFehler.message,
          );
        }

        const geladeneLieferscheine =
          (lieferscheinDaten as
            | LieferscheinZeile[]
            | null) ?? [];

        setLieferscheine(
          geladeneLieferscheine,
        );

        if (
          geladeneLieferscheine.length === 0
        ) {
          setSammelscheine([]);
          setPositionen([]);
          return;
        }

        const lieferscheinIds =
          geladeneLieferscheine.map(
            (lieferschein) => lieferschein.id,
          );

        const {
          data: sammelscheinDaten,
          error: sammelscheinFehler,
        } = await supabase
          .from("sammelscheine")
          .select("id, lieferschein_id")
          .in(
            "lieferschein_id",
            lieferscheinIds,
          );

        if (sammelscheinFehler) {
          throw new Error(
            sammelscheinFehler.message,
          );
        }

        const geladeneSammelscheine =
          (sammelscheinDaten as
            | SammelscheinZeile[]
            | null) ?? [];

        setSammelscheine(
          geladeneSammelscheine,
        );

        if (
          geladeneSammelscheine.length === 0
        ) {
          setPositionen([]);
          return;
        }

        const sammelscheinIds =
          geladeneSammelscheine.map(
            (sammelschein) => sammelschein.id,
          );

        const {
          data: positionsDaten,
          error: positionsFehler,
        } = await supabase
          .from("sammelschein_positionen")
          .select(
            "artikel, menge, sammelschein_id",
          )
          .in(
            "sammelschein_id",
            sammelscheinIds,
          );

        if (positionsFehler) {
          throw new Error(
            positionsFehler.message,
          );
        }

        setPositionen(
          (positionsDaten as
            | PositionZeile[]
            | null) ?? [],
        );
      } catch (unbekannterFehler) {
        setLieferscheine([]);
        setSammelscheine([]);
        setPositionen([]);

        setFehler(
          unbekannterFehler instanceof Error
            ? unbekannterFehler.message
            : "Die Auswertung konnte nicht geladen werden.",
        );
      } finally {
        setLaedt(false);
      }
    }

    void auswertungLaden();
  }, [
    aktuellerBenutzer,
    darfAuswertungAnzeigen,
    istAdmin,
    istAnnahmestelle,
    vonDatum,
    bisDatum,
    annahmestelleId,
  ]);

  const gesamtTeile = useMemo(
    () =>
      positionen.reduce(
        (summe, position) =>
          summe + Number(position.menge),
        0,
      ),
    [positionen],
  );

  const gesamtUmsatz = useMemo(
    () =>
      lieferscheine.reduce(
        (summe, lieferschein) =>
          summe +
          zahlUmwandeln(
            lieferschein.gesamtbetrag,
          ),
        0,
      ),
    [lieferscheine],
  );

  const artikelAuswertung =
    useMemo<ArtikelAuswertung[]>(() => {
      const summen = new Map<
        string,
        number
      >();

      positionen.forEach((position) => {
        const artikel =
          position.artikel.trim() ||
          "Ohne Bezeichnung";

        summen.set(
          artikel,
          (summen.get(artikel) ?? 0) +
            Number(position.menge),
        );
      });

      return Array.from(
        summen.entries(),
      )
        .map(([artikel, anzahl]) => ({
          artikel,
          anzahl,
        }))
        .sort(
          (a, b) =>
            b.anzahl - a.anzahl ||
            a.artikel.localeCompare(
              b.artikel,
              "de",
            ),
        );
    }, [positionen]);

  const ausgewaehlteAnnahmestelle =
    annahmestelleId
      ? annahmestellen.find(
          (annahmestelle) =>
            annahmestelle.id ===
            Number(annahmestelleId),
        )?.name ?? "Annahmestelle"
      : "Alle Annahmestellen";

  if (
    aktuellerBenutzer &&
    !darfAuswertungAnzeigen
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-black text-slate-950">
            Auswertung gesperrt
          </h1>
          <p className="mt-3 text-slate-600">
            Diese Auswertung ist nur für Administratoren und Annahmestellen freigegeben.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ZugriffsSchutz
      berechtigung="lieferscheine_anzeigen"
      titel="Auswertung gesperrt"
      beschreibung="Du hast keine Berechtigung, die Auswertung zu öffnen."
      zurueckLink="/"
      zurueckText="Zur Startseite"
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-4 py-6 text-white sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm text-slate-300">
              Washly
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {istAnnahmestelle
                ? "Meine Auswertung"
                : "Auswertung"}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {istAnnahmestelle
                ? "Nur die Daten deiner eigenen Annahmestelle."
                : "Bearbeitete Teile nach Zeitraum und Annahmestelle."}
            </p>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
            <div
              className={`grid gap-4 ${
                istAdmin
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2"
              }`}
            >
              <label>
                <span className="text-sm font-bold text-slate-700">
                  Von
                </span>
                <input
                  type="date"
                  value={vonDatum}
                  onChange={(event) =>
                    setVonDatum(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-950"
                />
              </label>

              <label>
                <span className="text-sm font-bold text-slate-700">
                  Bis
                </span>
                <input
                  type="date"
                  value={bisDatum}
                  onChange={(event) =>
                    setBisDatum(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-950"
                />
              </label>

              {istAdmin && (
              <label>
                <span className="text-sm font-bold text-slate-700">
                  Annahmestelle
                </span>
                <select
                  value={annahmestelleId}
                  onChange={(event) =>
                    setAnnahmestelleId(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-950"
                >
                  <option value="">
                    Alle Annahmestellen
                  </option>

                  {annahmestellen.map(
                    (annahmestelle) => (
                      <option
                        key={annahmestelle.id}
                        value={
                          annahmestelle.id
                        }
                      >
                        {annahmestelle.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
              )}
            </div>

            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                istAnnahmestelle
                  ? "border border-blue-200 bg-blue-50 text-blue-900"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {istAnnahmestelle && (
                <span className="mr-2 font-bold">
                  🔒 Eigene Daten:
                </span>
              )}
              <span className="font-bold">
                {ausgewaehlteAnnahmestelle}
              </span>
              {" · "}
              {vonDatum} bis {bisDatum}
            </div>
          </div>

          {fehler && (
            <div className="mt-5 rounded-xl bg-red-100 p-4 text-sm font-semibold text-red-800">
              {fehler}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-slate-500">
                Gesamt bearbeitete Teile
              </p>
              <p className="mt-2 text-4xl font-black text-slate-950">
                {laedt
                  ? "…"
                  : formatZahl(
                      gesamtTeile,
                    )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-slate-500">
                Lieferscheine
              </p>
              <p className="mt-2 text-4xl font-black text-slate-950">
                {laedt
                  ? "…"
                  : formatZahl(
                      lieferscheine.length,
                    )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-slate-500">
                Sammelscheine
              </p>
              <p className="mt-2 text-4xl font-black text-slate-950">
                {laedt
                  ? "…"
                  : formatZahl(
                      sammelscheine.length,
                    )}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow">
              <p className="text-sm font-semibold text-emerald-700">
                Umsatz
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-950">
                {laedt
                  ? "…"
                  : formatGeld(
                      gesamtUmsatz,
                    )}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-slate-950">
                Bearbeitete Artikel
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Gesamtmenge je Artikel im ausgewählten Zeitraum.
              </p>
            </div>

            {laedt ? (
              <div className="p-8 text-center text-slate-500">
                Auswertung wird geladen ...
              </div>
            ) : artikelAuswertung.length ===
              0 ? (
              <div className="p-8 text-center text-slate-500">
                Für diesen Zeitraum wurden keine bearbeiteten Teile gefunden.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {artikelAuswertung.map(
                  (eintrag) => (
                    <div
                      key={eintrag.artikel}
                      className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6"
                    >
                      <span className="font-semibold text-slate-800">
                        {eintrag.artikel}
                      </span>

                      <span className="rounded-full bg-slate-950 px-4 py-2 text-base font-bold text-white">
                        {formatZahl(
                          eintrag.anzahl,
                        )}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </ZugriffsSchutz>
  );
}
