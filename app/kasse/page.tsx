"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import LieferscheinStatistik from "../components/LieferscheinStatistik";
import SammelscheinKarte from "../components/SammelscheinKarte";
import { supabase } from "../lib/supabase";
import type {
  ArtikelPosition,
  FertigerLieferschein,
  Sammelschein,
} from "./types";

const artikelMehrzahl: Record<string, string> = {
  Hemd: "Hemden",
  Hose: "Hosen",
  Jacke: "Jacken",
  Anzug: "Anzüge",
  Mantel: "Mäntel",
  Kleid: "Kleider",
};

const ENTWURF_SPEICHER_NAME = "wash-cloud-lieferschein-entwurf";
const FERTIGE_LIEFERSCHEINE_SPEICHER_NAME =
  "wash-cloud-fertige-lieferscheine";

function lieferscheinNummerFormatieren(laufendeNummer: number) {
  return `LS-${String(laufendeNummer).padStart(6, "0")}`;
}

function nummerAusLieferscheinNummer(lieferscheinNummer: string) {
  const nummerAlsZahl = Number(lieferscheinNummer.replace("LS-", ""));
  return Number.isInteger(nummerAlsZahl) ? nummerAlsZahl : 0;
}

export default function KassePage() {
  const searchParams = useSearchParams();

  const ausgewaehlteAnnahmestelle =
    searchParams.get("name")?.trim() || "Unbekannte Annahmestelle";

  const ausgewaehlteAnnahmestelleId = Number(
    searchParams.get("annahmestelle"),
  );

  const [nummer, setNummer] = useState("");
  const [menge, setMenge] = useState("");
  const [artikel, setArtikel] = useState("Hemd");
  const [preis, setPreis] = useState("");
  const [positionen, setPositionen] = useState<ArtikelPosition[]>([]);
  const [sammelscheine, setSammelscheine] = useState<Sammelschein[]>([]);
  const [fertigeLieferscheine, setFertigeLieferscheine] =
    useState<FertigerLieferschein[]>([]);
  const [bearbeiteteId, setBearbeiteteId] = useState<number | null>(null);
  const [datenGeladen, setDatenGeladen] = useState(false);
  const [erfolgsmeldung, setErfolgsmeldung] = useState("");
  const [supabaseFehler, setSupabaseFehler] = useState("");
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    try {
      const gespeicherterEntwurf = localStorage.getItem(ENTWURF_SPEICHER_NAME);

      if (gespeicherterEntwurf) {
        const gespeicherteSammelscheine = JSON.parse(
          gespeicherterEntwurf,
        ) as Sammelschein[];

        if (Array.isArray(gespeicherteSammelscheine)) {
          setSammelscheine(gespeicherteSammelscheine);
        }
      }

      const gespeicherteFertigeLieferscheine = localStorage.getItem(
        FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
      );

      if (gespeicherteFertigeLieferscheine) {
        const geladeneDaten = JSON.parse(
          gespeicherteFertigeLieferscheine,
        ) as Partial<FertigerLieferschein>[];

        if (Array.isArray(geladeneDaten)) {
          setFertigeLieferscheine(
            geladeneDaten.map((lieferschein, index) => ({
              id: lieferschein.id ?? Date.now() + index,
              nummer:
                lieferschein.nummer ?? lieferscheinNummerFormatieren(index + 1),
              status: "Fertig" as const,
              fertiggestelltAm:
                lieferschein.fertiggestelltAm ?? new Date().toISOString(),
              annahmestelle:
                lieferschein.annahmestelle ?? "Unbekannte Annahmestelle",
              sammelscheine: lieferschein.sammelscheine ?? [],
            })),
          );
        }
      }
    } catch (fehler) {
      console.error("Die lokalen Daten konnten nicht geladen werden:", fehler);
    } finally {
      setDatenGeladen(true);
    }
  }, []);

  useEffect(() => {
    if (!datenGeladen) return;

    try {
      localStorage.setItem(
        ENTWURF_SPEICHER_NAME,
        JSON.stringify(sammelscheine),
      );
    } catch (fehler) {
      console.error("Der lokale Entwurf konnte nicht gespeichert werden:", fehler);
    }
  }, [sammelscheine, datenGeladen]);

  useEffect(() => {
    if (!datenGeladen) return;

    try {
      localStorage.setItem(
        FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
        JSON.stringify(fertigeLieferscheine),
      );
    } catch (fehler) {
      console.error(
        "Die fertigen Lieferscheine konnten nicht lokal gespeichert werden:",
        fehler,
      );
    }
  }, [fertigeLieferscheine, datenGeladen]);

  function naechsteLokaleLieferscheinNummerErmitteln() {
    const hoechsteNummer = fertigeLieferscheine.reduce(
      (hoechsterWert, lieferschein) =>
        Math.max(
          hoechsterWert,
          nummerAusLieferscheinNummer(lieferschein.nummer),
        ),
      0,
    );

    return lieferscheinNummerFormatieren(hoechsteNummer + 1);
  }

  async function naechsteCloudLieferscheinNummerErmitteln() {
    const db = supabase as any;

    const { data, error } = await db
      .from("lieferscheine")
      .select("nummer")
      .order("nummer", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const hoechsteCloudNummer = data?.nummer
      ? nummerAusLieferscheinNummer(data.nummer)
      : 0;

    const hoechsteLokaleNummer = fertigeLieferscheine.reduce(
      (hoechsterWert, lieferschein) =>
        Math.max(
          hoechsterWert,
          nummerAusLieferscheinNummer(lieferschein.nummer),
        ),
      0,
    );

    return lieferscheinNummerFormatieren(
      Math.max(hoechsteCloudNummer, hoechsteLokaleNummer) + 1,
    );
  }

  function artikelHinzufuegen() {
    const mengeAlsZahl = Number(menge);

    if (!Number.isInteger(mengeAlsZahl) || mengeAlsZahl < 1) {
      alert("Bitte eine gültige Menge eingeben.");
      return;
    }

    setPositionen((aktuellePositionen) => [
      ...aktuellePositionen,
      { id: Date.now(), menge: mengeAlsZahl, artikel },
    ]);

    setMenge("");
    setErfolgsmeldung("");
    setSupabaseFehler("");
  }

  function artikelPositionLoeschen(id: number) {
    setPositionen((aktuellePositionen) =>
      aktuellePositionen.filter((position) => position.id !== id),
    );
    setErfolgsmeldung("");
  }

  function sammelscheinNummerExistiert(
    sammelscheinNummer: string,
    ausgenommeneId: number | null,
  ) {
    return (
      sammelscheine.some(
        (sammelschein) =>
          sammelschein.nummer === sammelscheinNummer &&
          sammelschein.id !== ausgenommeneId,
      ) ||
      fertigeLieferscheine.some((lieferschein) =>
        lieferschein.sammelscheine.some(
          (sammelschein) => sammelschein.nummer === sammelscheinNummer,
        ),
      )
    );
  }

  function formularLeeren() {
    setNummer("");
    setMenge("");
    setArtikel("Hemd");
    setPreis("");
    setPositionen([]);
    setBearbeiteteId(null);
  }

  function sammelscheinSpeichern() {
    const bereinigteNummer = nummer.trim();
    const preisAlsZahl = Number(
      preis.replace("€", "").replace(",", ".").trim(),
    );

    if (bereinigteNummer === "") {
      alert("Bitte eine Sammelschein-Nummer eingeben.");
      return;
    }

    if (sammelscheinNummerExistiert(bereinigteNummer, bearbeiteteId)) {
      alert("Diese Sammelschein-Nummer wurde bereits verwendet.");
      return;
    }

    if (positionen.length === 0) {
      alert("Bitte mindestens einen Artikel hinzufügen.");
      return;
    }

    if (Number.isNaN(preisAlsZahl) || preisAlsZahl <= 0) {
      alert("Bitte einen gültigen Gesamtpreis eingeben.");
      return;
    }

    if (bearbeiteteId !== null) {
      setSammelscheine((aktuelleSammelscheine) =>
        aktuelleSammelscheine.map((sammelschein) =>
          sammelschein.id === bearbeiteteId
            ? {
                ...sammelschein,
                nummer: bereinigteNummer,
                positionen: [...positionen],
                preis: preisAlsZahl,
              }
            : sammelschein,
        ),
      );
    } else {
      setSammelscheine((aktuelleSammelscheine) => [
        ...aktuelleSammelscheine,
        {
          id: Date.now(),
          nummer: bereinigteNummer,
          positionen: [...positionen],
          preis: preisAlsZahl,
        },
      ]);
    }

    formularLeeren();
    setErfolgsmeldung("");
    setSupabaseFehler("");
  }

  function sammelscheinBearbeiten(sammelschein: Sammelschein) {
    setBearbeiteteId(sammelschein.id);
    setNummer(sammelschein.nummer);
    setPreis(sammelschein.preis.toFixed(2).replace(".", ","));
    setPositionen([...sammelschein.positionen]);
    setMenge("");
    setArtikel("Hemd");
    setErfolgsmeldung("");
    setSupabaseFehler("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bearbeitungAbbrechen() {
    formularLeeren();
  }

  function sammelscheinLoeschen(id: number) {
    if (!window.confirm("Möchtest du diesen Sammelschein wirklich löschen?")) {
      return;
    }

    setSammelscheine((aktuelleSammelscheine) =>
      aktuelleSammelscheine.filter((sammelschein) => sammelschein.id !== id),
    );

    if (bearbeiteteId === id) formularLeeren();
    setErfolgsmeldung("");
  }

  const gesamtTeile = sammelscheine.reduce(
    (summe, sammelschein) =>
      summe +
      sammelschein.positionen.reduce(
        (positionsSumme, position) => positionsSumme + position.menge,
        0,
      ),
    0,
  );

  const gesamtBetrag = sammelscheine.reduce(
    (summe, sammelschein) => summe + sammelschein.preis,
    0,
  );

  async function lieferscheinFertigstellen() {
    if (speichert) return;

    if (sammelscheine.length === 0) {
      alert("Der Lieferschein enthält noch keine Sammelscheine.");
      return;
    }

    if (bearbeiteteId !== null) {
      alert("Bitte speichere oder beende zuerst die Bearbeitung.");
      return;
    }

    if (
      !Number.isInteger(ausgewaehlteAnnahmestelleId) ||
      ausgewaehlteAnnahmestelleId < 1
    ) {
      setSupabaseFehler(
        "Die Annahmestellen-ID fehlt. Bitte öffne die Kasse erneut über eine Annahmestelle.",
      );
      return;
    }

    if (
      !window.confirm(
        `Möchtest du den Lieferschein für ${ausgewaehlteAnnahmestelle} wirklich fertigstellen?`,
      )
    ) {
      return;
    }

    setSpeichert(true);
    setSupabaseFehler("");
    setErfolgsmeldung("");

    const db = supabase as any;
    let gespeicherterLieferscheinId: number | null = null;

    try {
      const neueLieferscheinNummer =
        await naechsteCloudLieferscheinNummerErmitteln();
      const fertiggestelltAm = new Date().toISOString();

      const { data: gespeicherterLieferschein, error: lieferscheinFehler } =
        await db
          .from("lieferscheine")
          .insert({
            nummer: neueLieferscheinNummer,
            annahmestelle_id: ausgewaehlteAnnahmestelleId,
            status: "fertig",
            gesamtbetrag: gesamtBetrag,
            gesamtteile: gesamtTeile,
            fertiggestellt_am: fertiggestelltAm,
          })
          .select("id")
          .single();

      if (lieferscheinFehler || !gespeicherterLieferschein) {
        throw new Error(
          lieferscheinFehler?.message ??
            "Der Lieferschein konnte nicht gespeichert werden.",
        );
      }

      gespeicherterLieferscheinId = gespeicherterLieferschein.id;

      for (const sammelschein of sammelscheine) {
        const {
          data: gespeicherterSammelschein,
          error: sammelscheinFehler,
        } = await db
          .from("sammelscheine")
          .insert({
            lieferschein_id: gespeicherterLieferscheinId,
            nummer: sammelschein.nummer,
            preis: sammelschein.preis,
          })
          .select("id")
          .single();

        if (sammelscheinFehler || !gespeicherterSammelschein) {
          throw new Error(
            sammelscheinFehler?.message ??
              `Der Sammelschein ${sammelschein.nummer} konnte nicht gespeichert werden.`,
          );
        }

        const { error: positionenFehler } = await db
          .from("sammelschein_positionen")
          .insert(
            sammelschein.positionen.map((position) => ({
              sammelschein_id: gespeicherterSammelschein.id,
              artikel: position.artikel,
              menge: position.menge,
            })),
          );

        if (positionenFehler) throw new Error(positionenFehler.message);
      }

      const fertigerLieferschein: FertigerLieferschein = {
        id: gespeicherterLieferscheinId!,
        nummer: neueLieferscheinNummer,
        status: "Fertig",
        fertiggestelltAm,
        annahmestelle: ausgewaehlteAnnahmestelle,
        sammelscheine: [...sammelscheine],
      };

      setFertigeLieferscheine((aktuelleLieferscheine) => [
        ...aktuelleLieferscheine,
        fertigerLieferschein,
      ]);
      setSammelscheine([]);
      formularLeeren();
      setErfolgsmeldung(
        `Der Lieferschein ${neueLieferscheinNummer} wurde erfolgreich in Supabase gespeichert.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (fehler) {
      console.error("Fehler beim Speichern:", fehler);

      if (gespeicherterLieferscheinId !== null) {
        await db
          .from("lieferscheine")
          .delete()
          .eq("id", gespeicherterLieferscheinId);
      }

      setSupabaseFehler(
        fehler instanceof Error
          ? fehler.message
          : "Der Lieferschein konnte nicht gespeichert werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  const naechsteLieferscheinNummer =
    naechsteLokaleLieferscheinNummerErmitteln();

  function artikelText(position: ArtikelPosition) {
    if (position.menge === 1) return position.artikel;
    return artikelMehrzahl[position.artikel] ?? position.artikel;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">Wash Cloud</p>
            <h1 className="text-2xl font-bold">Kasse</h1>
            <p className="mt-1 text-sm text-slate-300">
              Neuer Lieferschein für {ausgewaehlteAnnahmestelle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/annahmestelle"
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
            >
              Annahmestelle wechseln
            </Link>
            <Link
              href="/lieferscheine"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              Fertige Lieferscheine
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {erfolgsmeldung && (
          <div className="mb-6 rounded-xl bg-green-100 p-4 text-sm font-semibold text-green-800">
            {erfolgsmeldung}
          </div>
        )}

        {supabaseFehler && (
          <div className="mb-6 rounded-xl bg-red-100 p-4 text-sm font-semibold text-red-800">
            <p className="font-bold">Speichern fehlgeschlagen</p>
            <p className="mt-1">{supabaseFehler}</p>
          </div>
        )}

        <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-600">Ausgewählte Annahmestelle</p>
            <p className="mt-1 font-bold text-blue-700">
              {ausgewaehlteAnnahmestelle}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">
              Voraussichtliche nächste Nummer
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {naechsteLieferscheinNummer}
            </p>
          </div>
          <div className="md:text-right">
            <p className="text-sm text-slate-600">
              In diesem Browser fertiggestellt
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {fertigeLieferscheine.length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">
            {bearbeiteteId !== null
              ? "Sammelschein bearbeiten"
              : "Sammelschein erfassen"}
          </h2>

          {bearbeiteteId !== null && (
            <div className="mt-4 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
              Du bearbeitest gerade einen vorhandenen Sammelschein.
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Sammelschein-Nummer
              </span>
              <input
                type="text"
                value={nummer}
                onChange={(event) => setNummer(event.target.value)}
                placeholder="z. B. 6080"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Menge</span>
              <input
                type="number"
                min="1"
                value={menge}
                onChange={(event) => setMenge(event.target.value)}
                placeholder="z. B. 10"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Artikel</span>
              <select
                value={artikel}
                onChange={(event) => setArtikel(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                <option value="Hemd">Hemd</option>
                <option value="Hose">Hose</option>
                <option value="Jacke">Jacke</option>
                <option value="Anzug">Anzug</option>
                <option value="Mantel">Mantel</option>
                <option value="Kleid">Kleid</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={artikelHinzufuegen}
            className="mt-6 rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-600"
          >
            + Artikel hinzufügen
          </button>

          {positionen.length > 0 && (
            <div className="mt-6 rounded-xl bg-slate-100 p-4">
              <h3 className="font-bold text-slate-900">
                Inhalt des Sammelscheins
              </h3>
              <div className="mt-3 space-y-2">
                {positionen.map((position) => (
                  <div
                    key={position.id}
                    className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-slate-900"
                  >
                    <span>
                      {position.menge} {artikelText(position)}
                    </span>
                    <button
                      type="button"
                      onClick={() => artikelPositionLoeschen(position.id)}
                      className="text-sm font-semibold text-red-600"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="mt-6 block max-w-sm">
            <span className="text-sm font-medium text-slate-700">
              Gesamtpreis dieser Nummer
            </span>
            <input
              type="text"
              value={preis}
              onChange={(event) => setPreis(event.target.value)}
              placeholder="z. B. 38,00"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={sammelscheinSpeichern}
            className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-bold text-white"
          >
            {bearbeiteteId !== null
              ? "Änderungen speichern"
              : "+ Sammelschein hinzufügen"}
          </button>

          {bearbeiteteId !== null && (
            <button
              type="button"
              onClick={bearbeitungAbbrechen}
              className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
            >
              Bearbeitung abbrechen
            </button>
          )}
        </div>

        {sammelscheine.length > 0 && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Aktueller Lieferschein
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Annahmestelle: {" "}
                  <span className="font-bold text-slate-900">
                    {ausgewaehlteAnnahmestelle}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Voraussichtliche Nummer: {" "}
                  <span className="font-bold text-slate-900">
                    {naechsteLieferscheinNummer}
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                Entwurf
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {sammelscheine.map((sammelschein) => (
                <SammelscheinKarte
                  key={sammelschein.id}
                  sammelschein={sammelschein}
                  onBearbeiten={sammelscheinBearbeiten}
                  onLoeschen={sammelscheinLoeschen}
                />
              ))}
            </div>

            <div className="mt-6">
              <LieferscheinStatistik
                anzahlSammelscheine={sammelscheine.length}
                gesamtTeile={gesamtTeile}
                gesamtBetrag={gesamtBetrag}
              />
            </div>

            <button
              type="button"
              onClick={lieferscheinFertigstellen}
              disabled={speichert}
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {speichert
                ? "Lieferschein wird gespeichert ..."
                : `Lieferschein ${naechsteLieferscheinNummer} fertigstellen`}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}