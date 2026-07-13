"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LieferscheinStatistik from "../components/LieferscheinStatistik";
import SammelscheinKarte from "../components/SammelscheinKarte";

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

type FertigerLieferschein = {
  id: number;
  nummer: string;
  status: "Fertig";
  fertiggestelltAm: string;
  annahmestelle: string;
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

const ENTWURF_SPEICHER_NAME =
  "wash-cloud-lieferschein-entwurf";

const FERTIGE_LIEFERSCHEINE_SPEICHER_NAME =
  "wash-cloud-fertige-lieferscheine";

function lieferscheinNummerFormatieren(
  laufendeNummer: number,
) {
  return `LS-${String(laufendeNummer).padStart(6, "0")}`;
}

export default function KassePage() {
  const [nummer, setNummer] = useState("");
  const [menge, setMenge] = useState("");
  const [artikel, setArtikel] = useState("Hemd");
  const [preis, setPreis] = useState("");

  const [positionen, setPositionen] =
    useState<ArtikelPosition[]>([]);

  const [sammelscheine, setSammelscheine] =
    useState<Sammelschein[]>([]);

  const [fertigeLieferscheine, setFertigeLieferscheine] =
    useState<FertigerLieferschein[]>([]);

  const [bearbeiteteId, setBearbeiteteId] =
    useState<number | null>(null);

  const [datenGeladen, setDatenGeladen] = useState(false);
  const [erfolgsmeldung, setErfolgsmeldung] = useState("");

  useEffect(() => {
    try {
      const gespeicherterEntwurf = localStorage.getItem(
        ENTWURF_SPEICHER_NAME,
      );

      if (gespeicherterEntwurf) {
        const gespeicherteSammelscheine = JSON.parse(
          gespeicherterEntwurf,
        ) as Sammelschein[];

        if (Array.isArray(gespeicherteSammelscheine)) {
          setSammelscheine(gespeicherteSammelscheine);
        }
      }

      const gespeicherteFertigeLieferscheine =
        localStorage.getItem(
          FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
        );

      if (gespeicherteFertigeLieferscheine) {
        const geladeneDaten = JSON.parse(
          gespeicherteFertigeLieferscheine,
        ) as Partial<FertigerLieferschein>[];

        if (Array.isArray(geladeneDaten)) {
          const nummerierteLieferscheine = geladeneDaten.map(
            (lieferschein, index) => ({
              id: lieferschein.id ?? Date.now() + index,
              nummer:
                lieferschein.nummer ??
                lieferscheinNummerFormatieren(index + 1),
              status: "Fertig" as const,
              fertiggestelltAm:
                lieferschein.fertiggestelltAm ??
                new Date().toISOString(),
              annahmestelle:
                lieferschein.annahmestelle ?? "AnnahmeL1",
              sammelscheine:
                lieferschein.sammelscheine ?? [],
            }),
          );

          setFertigeLieferscheine(
            nummerierteLieferscheine,
          );
        }
      }
    } catch (fehler) {
      console.error(
        "Die lokalen Daten konnten nicht geladen werden:",
        fehler,
      );
    } finally {
      setDatenGeladen(true);
    }
  }, []);

  useEffect(() => {
    if (!datenGeladen) {
      return;
    }

    try {
      localStorage.setItem(
        ENTWURF_SPEICHER_NAME,
        JSON.stringify(sammelscheine),
      );
    } catch (fehler) {
      console.error(
        "Der lokale Entwurf konnte nicht gespeichert werden:",
        fehler,
      );
    }
  }, [sammelscheine, datenGeladen]);

  useEffect(() => {
    if (!datenGeladen) {
      return;
    }

    try {
      localStorage.setItem(
        FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
        JSON.stringify(fertigeLieferscheine),
      );
    } catch (fehler) {
      console.error(
        "Die fertigen Lieferscheine konnten nicht gespeichert werden:",
        fehler,
      );
    }
  }, [fertigeLieferscheine, datenGeladen]);

  function naechsteLieferscheinNummerErmitteln() {
    const hoechsteNummer = fertigeLieferscheine.reduce(
      (hoechsterWert, lieferschein) => {
        const nummerAlsText = lieferschein.nummer.replace(
          "LS-",
          "",
        );

        const nummerAlsZahl = Number(nummerAlsText);

        if (
          Number.isInteger(nummerAlsZahl) &&
          nummerAlsZahl > hoechsterWert
        ) {
          return nummerAlsZahl;
        }

        return hoechsterWert;
      },
      0,
    );

    return lieferscheinNummerFormatieren(
      hoechsteNummer + 1,
    );
  }

  function artikelHinzufuegen() {
    const mengeAlsZahl = Number(menge);

    if (!Number.isInteger(mengeAlsZahl) || mengeAlsZahl < 1) {
      alert("Bitte eine gültige Menge eingeben.");
      return;
    }

    const neuePosition: ArtikelPosition = {
      id: Date.now(),
      menge: mengeAlsZahl,
      artikel,
    };

    setPositionen([...positionen, neuePosition]);
    setMenge("");
    setErfolgsmeldung("");
  }

  function artikelPositionLoeschen(id: number) {
    setPositionen(
      positionen.filter((position) => position.id !== id),
    );

    setErfolgsmeldung("");
  }

  function sammelscheinNummerExistiert(
    sammelscheinNummer: string,
    ausgenommeneId: number | null,
  ) {
    const nummerImAktuellenEntwurfVorhanden =
      sammelscheine.some(
        (sammelschein) =>
          sammelschein.nummer === sammelscheinNummer &&
          sammelschein.id !== ausgenommeneId,
      );

    const nummerInFertigemLieferscheinVorhanden =
      fertigeLieferscheine.some((lieferschein) =>
        lieferschein.sammelscheine.some(
          (sammelschein) =>
            sammelschein.nummer === sammelscheinNummer,
        ),
      );

    return (
      nummerImAktuellenEntwurfVorhanden ||
      nummerInFertigemLieferscheinVorhanden
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

    const bereinigterPreisText = preis
      .replace("€", "")
      .replace(",", ".")
      .trim();

    const preisAlsZahl = Number(bereinigterPreisText);

    if (bereinigteNummer === "") {
      alert("Bitte eine Sammelschein-Nummer eingeben.");
      return;
    }

    if (
      sammelscheinNummerExistiert(
        bereinigteNummer,
        bearbeiteteId,
      )
    ) {
      alert(
        "Diese Sammelschein-Nummer wurde bereits verwendet.",
      );
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
      setSammelscheine(
        sammelscheine.map((sammelschein) => {
          if (sammelschein.id === bearbeiteteId) {
            return {
              ...sammelschein,
              nummer: bereinigteNummer,
              positionen: [...positionen],
              preis: preisAlsZahl,
            };
          }

          return sammelschein;
        }),
      );
    } else {
      const neuerSammelschein: Sammelschein = {
        id: Date.now(),
        nummer: bereinigteNummer,
        positionen: [...positionen],
        preis: preisAlsZahl,
      };

      setSammelscheine([
        ...sammelscheine,
        neuerSammelschein,
      ]);
    }

    formularLeeren();
    setErfolgsmeldung("");
  }

  function sammelscheinBearbeiten(
    sammelschein: Sammelschein,
  ) {
    setBearbeiteteId(sammelschein.id);
    setNummer(sammelschein.nummer);
    setPreis(
      sammelschein.preis.toFixed(2).replace(".", ","),
    );
    setPositionen([...sammelschein.positionen]);
    setMenge("");
    setArtikel("Hemd");
    setErfolgsmeldung("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function bearbeitungAbbrechen() {
    formularLeeren();
  }

  function sammelscheinLoeschen(id: number) {
    const bestaetigt = window.confirm(
      "Möchtest du diesen Sammelschein wirklich löschen?",
    );

    if (!bestaetigt) {
      return;
    }

    setSammelscheine(
      sammelscheine.filter(
        (sammelschein) => sammelschein.id !== id,
      ),
    );

    if (bearbeiteteId === id) {
      formularLeeren();
    }

    setErfolgsmeldung("");
  }

  function lieferscheinFertigstellen() {
    if (sammelscheine.length === 0) {
      alert(
        "Der Lieferschein enthält noch keine Sammelscheine.",
      );
      return;
    }

    if (bearbeiteteId !== null) {
      alert(
        "Bitte speichere oder beende zuerst die Bearbeitung.",
      );
      return;
    }

    const neueLieferscheinNummer =
      naechsteLieferscheinNummerErmitteln();

    const bestaetigt = window.confirm(
      `Möchtest du den Lieferschein ${neueLieferscheinNummer} wirklich fertigstellen? Danach wird ein neuer leerer Lieferschein begonnen.`,
    );

    if (!bestaetigt) {
      return;
    }

    const fertigerLieferschein: FertigerLieferschein = {
      id: Date.now(),
      nummer: neueLieferscheinNummer,
      status: "Fertig",
      fertiggestelltAm: new Date().toISOString(),
      annahmestelle: "AnnahmeL1",
      sammelscheine: [...sammelscheine],
    };

    setFertigeLieferscheine([
      ...fertigeLieferscheine,
      fertigerLieferschein,
    ]);

    setSammelscheine([]);
    formularLeeren();

    setErfolgsmeldung(
      `Der Lieferschein ${neueLieferscheinNummer} wurde fertiggestellt und lokal gespeichert.`,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const gesamtTeile = sammelscheine.reduce(
    (summe, sammelschein) => {
      const teileDesSammelscheins =
        sammelschein.positionen.reduce(
          (positionsSumme, position) =>
            positionsSumme + position.menge,
          0,
        );

      return summe + teileDesSammelscheins;
    },
    0,
  );

  const gesamtBetrag = sammelscheine.reduce(
    (summe, sammelschein) =>
      summe + sammelschein.preis,
    0,
  );

  const naechsteLieferscheinNummer =
    naechsteLieferscheinNummerErmitteln();

  function artikelText(position: ArtikelPosition) {
    if (position.menge === 1) {
      return position.artikel;
    }

    return (
      artikelMehrzahl[position.artikel] ??
      position.artikel
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Kasse
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Neuer Lieferschein für AnnahmeL1
            </p>
          </div>

          <Link
            href="/lieferscheine"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Fertige Lieferscheine
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {erfolgsmeldung && (
          <div className="mb-6 rounded-xl bg-green-100 p-4 text-sm font-semibold text-green-800">
            {erfolgsmeldung}
          </div>
        )}

        <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-600">
              Status des aktuellen Lieferscheins
            </p>

            <p className="mt-1 font-bold text-orange-600">
              Entwurf
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600">
              Nächste Lieferschein-Nummer
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {naechsteLieferscheinNummer}
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-sm text-slate-600">
              Lokal fertiggestellt
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
              Du bearbeitest gerade einen vorhandenen
              Sammelschein.
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
                onChange={(event) =>
                  setNummer(event.target.value)
                }
                placeholder="z. B. 6080"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Menge
              </span>

              <input
                type="number"
                min="1"
                value={menge}
                onChange={(event) =>
                  setMenge(event.target.value)
                }
                placeholder="z. B. 10"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Artikel
              </span>

              <select
                value={artikel}
                onChange={(event) =>
                  setArtikel(event.target.value)
                }
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
                      {position.menge}{" "}
                      {artikelText(position)}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        artikelPositionLoeschen(
                          position.id,
                        )
                      }
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
              onChange={(event) =>
                setPreis(event.target.value)
              }
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
                  Nummer nach Fertigstellung:{" "}
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
                anzahlSammelscheine={
                  sammelscheine.length
                }
                gesamtTeile={gesamtTeile}
                gesamtBetrag={gesamtBetrag}
              />
            </div>

            <button
              type="button"
              onClick={lieferscheinFertigstellen}
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white"
            >
              Lieferschein{" "}
              {naechsteLieferscheinNummer} fertigstellen
            </button>
          </div>
        )}
      </section>
    </main>
  );
}