"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LieferscheinStatistik from "../components/LieferscheinStatistik";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import SammelscheinKarte from "../components/SammelscheinKarte";
import { supabase } from "../lib/supabase";
import type {
  ArtikelPosition,
  FertigerLieferschein,
  Sammelschein,
} from "./types";

type DatenbankKunde = {
  id: number;
  kundennummer: string;
  vorname: string | null;
  nachname: string | null;
  firma: string | null;
  telefon: string | null;
  aktiv: boolean;
};

type Kunde = {
  id: number;
  kundennummer: string;
  vorname: string;
  nachname: string;
  firma: string;
  telefon: string;
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

function nummerAusLieferscheinNummer(
  lieferscheinNummer: string,
) {
  const nummerAlsZahl = Number(
    lieferscheinNummer.replace("LS-", ""),
  );

  return Number.isInteger(nummerAlsZahl)
    ? nummerAlsZahl
    : 0;
}

function kundeUmwandeln(
  daten: DatenbankKunde,
): Kunde {
  return {
    id: daten.id,
    kundennummer: daten.kundennummer,
    vorname: daten.vorname ?? "",
    nachname: daten.nachname ?? "",
    firma: daten.firma ?? "",
    telefon: daten.telefon ?? "",
  };
}

function kundenNameErmitteln(kunde: Kunde) {
  if (kunde.firma.trim()) {
    return kunde.firma;
  }

  const name = [
    kunde.vorname,
    kunde.nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unbekannter Kunde";
}

export default function KassePage() {
  const searchParams = useSearchParams();

  const ausgewaehlteAnnahmestelle =
    searchParams.get("name")?.trim() ||
    "Unbekannte Annahmestelle";

  const ausgewaehlteAnnahmestelleId = Number(
    searchParams.get("annahmestelle"),
  );

  const [nummer, setNummer] =
    useState("");

  const [menge, setMenge] =
    useState("");

  const [artikel, setArtikel] =
    useState("Hemd");

  const [preis, setPreis] =
    useState("");

  const [positionen, setPositionen] =
    useState<ArtikelPosition[]>([]);

  const [sammelscheine, setSammelscheine] =
    useState<Sammelschein[]>([]);

  const [
    fertigeLieferscheine,
    setFertigeLieferscheine,
  ] = useState<FertigerLieferschein[]>([]);

  const [
    bearbeiteteId,
    setBearbeiteteId,
  ] = useState<number | null>(null);

  const [kunden, setKunden] =
    useState<Kunde[]>([]);

  const [
    ausgewaehlteKundenId,
    setAusgewaehlteKundenId,
  ] = useState("");

  const [
    kundenWerdenGeladen,
    setKundenWerdenGeladen,
  ] = useState(true);

  const [kundenFehler, setKundenFehler] =
    useState("");

  const [datenGeladen, setDatenGeladen] =
    useState(false);

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  const [
    supabaseFehler,
    setSupabaseFehler,
  ] = useState("");

  const [speichert, setSpeichert] =
    useState(false);

  useEffect(() => {
    async function kundenLaden() {
      setKundenWerdenGeladen(true);
      setKundenFehler("");

      try {
        const { data, error } =
          await supabase
            .from("kunden")
            .select(`
              id,
              kundennummer,
              vorname,
              nachname,
              firma,
              telefon,
              aktiv
            `)
            .eq("aktiv", true)
            .order("firma", {
              ascending: true,
              nullsFirst: false,
            })
            .order("nachname", {
              ascending: true,
              nullsFirst: false,
            });

        if (error) {
          throw new Error(error.message);
        }

        const geladeneKunden = (
          (data ?? []) as DatenbankKunde[]
        ).map(kundeUmwandeln);

        setKunden(geladeneKunden);
      } catch (unbekannterFehler) {
        console.error(
          "Die Kunden konnten nicht geladen werden:",
          unbekannterFehler,
        );

        setKundenFehler(
          unbekannterFehler instanceof Error
            ? unbekannterFehler.message
            : "Die Kunden konnten nicht geladen werden.",
        );
      } finally {
        setKundenWerdenGeladen(false);
      }
    }

    void kundenLaden();
  }, []);

  useEffect(() => {
    try {
      const gespeicherterEntwurf =
        localStorage.getItem(
          ENTWURF_SPEICHER_NAME,
        );

      if (gespeicherterEntwurf) {
        const gespeicherteSammelscheine =
          JSON.parse(
            gespeicherterEntwurf,
          ) as Sammelschein[];

        if (
          Array.isArray(
            gespeicherteSammelscheine,
          )
        ) {
          setSammelscheine(
            gespeicherteSammelscheine,
          );
        }
      }

      const gespeicherteFertigeLieferscheine =
        localStorage.getItem(
          FERTIGE_LIEFERSCHEINE_SPEICHER_NAME,
        );

      if (
        gespeicherteFertigeLieferscheine
      ) {
        const geladeneDaten =
          JSON.parse(
            gespeicherteFertigeLieferscheine,
          ) as Partial<FertigerLieferschein>[];

        if (Array.isArray(geladeneDaten)) {
          setFertigeLieferscheine(
            geladeneDaten.map(
              (lieferschein, index) => ({
                id:
                  lieferschein.id ??
                  Date.now() + index,
                nummer:
                  lieferschein.nummer ??
                  lieferscheinNummerFormatieren(
                    index + 1,
                  ),
                status: "Fertig" as const,
                fertiggestelltAm:
                  lieferschein.fertiggestelltAm ??
                  new Date().toISOString(),
                annahmestelle:
                  lieferschein.annahmestelle ??
                  "Unbekannte Annahmestelle",
                sammelscheine:
                  lieferschein.sammelscheine ??
                  [],
              }),
            ),
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
        JSON.stringify(
          fertigeLieferscheine,
        ),
      );
    } catch (fehler) {
      console.error(
        "Die fertigen Lieferscheine konnten nicht lokal gespeichert werden:",
        fehler,
      );
    }
  }, [
    fertigeLieferscheine,
    datenGeladen,
  ]);

  const ausgewaehlterKunde =
    useMemo(() => {
      if (!ausgewaehlteKundenId) {
        return null;
      }

      const kundenId = Number(
        ausgewaehlteKundenId,
      );

      return (
        kunden.find(
          (kunde) => kunde.id === kundenId,
        ) ?? null
      );
    }, [
      kunden,
      ausgewaehlteKundenId,
    ]);

  function naechsteLokaleLieferscheinNummerErmitteln() {
    const hoechsteNummer =
      fertigeLieferscheine.reduce(
        (
          hoechsterWert,
          lieferschein,
        ) =>
          Math.max(
            hoechsterWert,
            nummerAusLieferscheinNummer(
              lieferschein.nummer,
            ),
          ),
        0,
      );

    return lieferscheinNummerFormatieren(
      hoechsteNummer + 1,
    );
  }

  async function naechsteCloudLieferscheinNummerErmitteln() {
    const { data, error } =
      await supabase
        .from("lieferscheine")
        .select("nummer")
        .order("nummer", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const hoechsteCloudNummer =
      data?.nummer
        ? nummerAusLieferscheinNummer(
            data.nummer,
          )
        : 0;

    const hoechsteLokaleNummer =
      fertigeLieferscheine.reduce(
        (
          hoechsterWert,
          lieferschein,
        ) =>
          Math.max(
            hoechsterWert,
            nummerAusLieferscheinNummer(
              lieferschein.nummer,
            ),
          ),
        0,
      );

    return lieferscheinNummerFormatieren(
      Math.max(
        hoechsteCloudNummer,
        hoechsteLokaleNummer,
      ) + 1,
    );
  }

  function artikelHinzufuegen() {
    const mengeAlsZahl = Number(menge);

    if (
      !Number.isInteger(mengeAlsZahl) ||
      mengeAlsZahl < 1
    ) {
      alert(
        "Bitte eine gültige Menge eingeben.",
      );
      return;
    }

    setPositionen(
      (aktuellePositionen) => [
        ...aktuellePositionen,
        {
          id: Date.now(),
          menge: mengeAlsZahl,
          artikel,
        },
      ],
    );

    setMenge("");
    setErfolgsmeldung("");
    setSupabaseFehler("");
  }

  function artikelPositionLoeschen(
    id: number,
  ) {
    setPositionen(
      (aktuellePositionen) =>
        aktuellePositionen.filter(
          (position) =>
            position.id !== id,
        ),
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
          sammelschein.nummer ===
            sammelscheinNummer &&
          sammelschein.id !==
            ausgenommeneId,
      ) ||
      fertigeLieferscheine.some(
        (lieferschein) =>
          lieferschein.sammelscheine.some(
            (sammelschein) =>
              sammelschein.nummer ===
              sammelscheinNummer,
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
    const bereinigteNummer =
      nummer.trim();

    const preisAlsZahl = Number(
      preis
        .replace("€", "")
        .replace(",", ".")
        .trim(),
    );

    if (bereinigteNummer === "") {
      alert(
        "Bitte eine Sammelschein-Nummer eingeben.",
      );
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
      alert(
        "Bitte mindestens einen Artikel hinzufügen.",
      );
      return;
    }

    if (
      Number.isNaN(preisAlsZahl) ||
      preisAlsZahl <= 0
    ) {
      alert(
        "Bitte einen gültigen Gesamtpreis eingeben.",
      );
      return;
    }

    if (bearbeiteteId !== null) {
      setSammelscheine(
        (aktuelleSammelscheine) =>
          aktuelleSammelscheine.map(
            (sammelschein) =>
              sammelschein.id ===
              bearbeiteteId
                ? {
                    ...sammelschein,
                    nummer:
                      bereinigteNummer,
                    positionen: [
                      ...positionen,
                    ],
                    preis: preisAlsZahl,
                  }
                : sammelschein,
          ),
      );
    } else {
      setSammelscheine(
        (aktuelleSammelscheine) => [
          ...aktuelleSammelscheine,
          {
            id: Date.now(),
            nummer: bereinigteNummer,
            positionen: [
              ...positionen,
            ],
            preis: preisAlsZahl,
          },
        ],
      );
    }

    formularLeeren();
    setErfolgsmeldung("");
    setSupabaseFehler("");
  }

  function sammelscheinBearbeiten(
    sammelschein: Sammelschein,
  ) {
    setBearbeiteteId(
      sammelschein.id,
    );

    setNummer(
      sammelschein.nummer,
    );

    setPreis(
      sammelschein.preis
        .toFixed(2)
        .replace(".", ","),
    );

    setPositionen([
      ...sammelschein.positionen,
    ]);

    setMenge("");
    setArtikel("Hemd");
    setErfolgsmeldung("");
    setSupabaseFehler("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function bearbeitungAbbrechen() {
    formularLeeren();
  }

  function sammelscheinLoeschen(
    id: number,
  ) {
    if (
      !window.confirm(
        "Möchtest du diesen Sammelschein wirklich löschen?",
      )
    ) {
      return;
    }

    setSammelscheine(
      (aktuelleSammelscheine) =>
        aktuelleSammelscheine.filter(
          (sammelschein) =>
            sammelschein.id !== id,
        ),
    );

    if (bearbeiteteId === id) {
      formularLeeren();
    }

    setErfolgsmeldung("");
  }

  const gesamtTeile =
    sammelscheine.reduce(
      (summe, sammelschein) =>
        summe +
        sammelschein.positionen.reduce(
          (
            positionsSumme,
            position,
          ) =>
            positionsSumme +
            position.menge,
          0,
        ),
      0,
    );

  const gesamtBetrag =
    sammelscheine.reduce(
      (summe, sammelschein) =>
        summe + sammelschein.preis,
      0,
    );

  async function lieferscheinFertigstellen() {
    if (speichert) {
      return;
    }

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

    if (
      !Number.isInteger(
        ausgewaehlteAnnahmestelleId,
      ) ||
      ausgewaehlteAnnahmestelleId < 1
    ) {
      setSupabaseFehler(
        "Die Annahmestellen-ID fehlt. Bitte öffne die Kasse erneut über eine Annahmestelle.",
      );
      return;
    }

    const kundenText =
      ausgewaehlterKunde
        ? ` und den Kunden ${kundenNameErmitteln(
            ausgewaehlterKunde,
          )}`
        : " als Laufkunde";

    if (
      !window.confirm(
        `Möchtest du den Lieferschein für ${ausgewaehlteAnnahmestelle}${kundenText} wirklich fertigstellen?`,
      )
    ) {
      return;
    }

    setSpeichert(true);
    setSupabaseFehler("");
    setErfolgsmeldung("");

    let gespeicherterLieferscheinId:
      | number
      | null = null;

    try {
      const neueLieferscheinNummer =
        await naechsteCloudLieferscheinNummerErmitteln();

      const fertiggestelltAm =
        new Date().toISOString();

      const { data, error } =
        await supabase
          .from("lieferscheine")
          .insert({
            nummer:
              neueLieferscheinNummer,
            annahmestelle_id:
              ausgewaehlteAnnahmestelleId,
            kunde_id:
              ausgewaehlterKunde?.id ??
              null,
            status: "fertig",
            gesamtbetrag:
              gesamtBetrag,
            gesamtteile:
              gesamtTeile,
            fertiggestellt_am:
              fertiggestelltAm,
          })
          .select("id")
          .single();

      if (error || !data) {
        throw new Error(
          error?.message ??
            "Der Lieferschein konnte nicht gespeichert werden.",
        );
      }

      const neueLieferscheinId =
        data.id;

      gespeicherterLieferscheinId =
        neueLieferscheinId;

      for (
        const sammelschein of
        sammelscheine
      ) {
        const {
          data:
            gespeicherterSammelschein,
          error:
            sammelscheinFehler,
        } = await supabase
          .from("sammelscheine")
          .insert({
            lieferschein_id:
              neueLieferscheinId,
            nummer:
              sammelschein.nummer,
            preis:
              sammelschein.preis,
          })
          .select("id")
          .single();

        if (
          sammelscheinFehler ||
          !gespeicherterSammelschein
        ) {
          throw new Error(
            sammelscheinFehler?.message ??
              `Der Sammelschein ${sammelschein.nummer} konnte nicht gespeichert werden.`,
          );
        }

        const {
          error: positionenFehler,
        } = await supabase
          .from(
            "sammelschein_positionen",
          )
          .insert(
            sammelschein.positionen.map(
              (position) => ({
                sammelschein_id:
                  gespeicherterSammelschein.id,
                artikel:
                  position.artikel,
                menge:
                  position.menge,
              }),
            ),
          );

        if (positionenFehler) {
          throw new Error(
            positionenFehler.message,
          );
        }
      }

      const fertigerLieferschein:
        FertigerLieferschein = {
          id: neueLieferscheinId,
          nummer:
            neueLieferscheinNummer,
          status: "Fertig",
          fertiggestelltAm,
          annahmestelle:
            ausgewaehlteAnnahmestelle,
          sammelscheine: [
            ...sammelscheine,
          ],
        };

      setFertigeLieferscheine(
        (aktuelleLieferscheine) => [
          ...aktuelleLieferscheine,
          fertigerLieferschein,
        ],
      );

      setSammelscheine([]);
      setAusgewaehlteKundenId("");
      formularLeeren();

      setErfolgsmeldung(
        ausgewaehlterKunde
          ? `Der Lieferschein ${neueLieferscheinNummer} wurde für ${kundenNameErmitteln(
              ausgewaehlterKunde,
            )} erfolgreich in Supabase gespeichert.`
          : `Der Lieferschein ${neueLieferscheinNummer} wurde als Laufkunden-Auftrag erfolgreich in Supabase gespeichert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (fehler) {
      console.error(
        "Fehler beim Speichern:",
        fehler,
      );

      if (
        gespeicherterLieferscheinId !==
        null
      ) {
        await supabase
          .from("lieferscheine")
          .delete()
          .eq(
            "id",
            gespeicherterLieferscheinId,
          );
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

  function artikelText(
    position: ArtikelPosition,
  ) {
    if (position.menge === 1) {
      return position.artikel;
    }

    return (
      artikelMehrzahl[
        position.artikel
      ] ?? position.artikel
    );
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Kasse
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Neuer Lieferschein für{" "}
              {ausgewaehlteAnnahmestelle}
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
            <p className="font-bold">
              Speichern fehlgeschlagen
            </p>

            <p className="mt-1">
              {supabaseFehler}
            </p>
          </div>
        )}

        {kundenFehler && (
          <div className="mb-6 rounded-xl bg-yellow-100 p-4 text-sm text-yellow-800">
            <p className="font-bold">
              Kunden konnten nicht geladen werden
            </p>

            <p className="mt-1">
              {kundenFehler}
            </p>

            <p className="mt-1">
              Lieferscheine können weiterhin als
              Laufkunde erstellt werden.
            </p>
          </div>
        )}

        <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-600">
              Ausgewählte Annahmestelle
            </p>

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

        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Kunde
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Optional einen bestehenden Kunden
                auswählen.
              </p>
            </div>

            <Link
              href="/kunden"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Kunden verwalten
            </Link>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-slate-700">
              Kunde für diesen Lieferschein
            </span>

            <select
              value={
                ausgewaehlteKundenId
              }
              onChange={(event) => {
                setAusgewaehlteKundenId(
                  event.target.value,
                );

                setErfolgsmeldung("");
                setSupabaseFehler("");
              }}
              disabled={
                kundenWerdenGeladen
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {kundenWerdenGeladen
                  ? "Kunden werden geladen ..."
                  : "Laufkunde – kein Kunde ausgewählt"}
              </option>

              {kunden.map((kunde) => (
                <option
                  key={kunde.id}
                  value={kunde.id}
                >
                  {kunde.kundennummer} –{" "}
                  {kundenNameErmitteln(
                    kunde,
                  )}
                </option>
              ))}
            </select>
          </label>

          {ausgewaehlterKunde ? (
            <div className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-900">
              <p className="font-bold">
                {kundenNameErmitteln(
                  ausgewaehlterKunde,
                )}
              </p>

              <p className="mt-1 text-sm">
                {
                  ausgewaehlterKunde.kundennummer
                }
                {ausgewaehlterKunde.telefon
                  ? ` · ${ausgewaehlterKunde.telefon}`
                  : ""}
              </p>

              <Link
                href={`/kunde/${encodeURIComponent(
                  ausgewaehlterKunde.kundennummer,
                )}`}
                className="mt-3 inline-block text-sm font-bold text-blue-700 hover:underline"
              >
                Kundendetails öffnen
              </Link>
            </div>
          ) : (
            !kundenWerdenGeladen && (
              <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                Dieser Lieferschein wird ohne
                Kundenverknüpfung als Laufkunde
                gespeichert.
              </div>
            )
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">
            {bearbeiteteId !== null
              ? "Sammelschein bearbeiten"
              : "Sammelschein erfassen"}
          </h2>

          {bearbeiteteId !== null && (
            <div className="mt-4 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
              Du bearbeitest gerade einen
              vorhandenen Sammelschein.
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
                  setNummer(
                    event.target.value,
                  )
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
                  setMenge(
                    event.target.value,
                  )
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
                  setArtikel(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                <option value="Hemd">
                  Hemd
                </option>

                <option value="Hose">
                  Hose
                </option>

                <option value="Jacke">
                  Jacke
                </option>

                <option value="Anzug">
                  Anzug
                </option>

                <option value="Mantel">
                  Mantel
                </option>

                <option value="Kleid">
                  Kleid
                </option>
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
                {positionen.map(
                  (position) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-slate-900"
                    >
                      <span>
                        {position.menge}{" "}
                        {artikelText(
                          position,
                        )}
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
                  ),
                )}
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
                setPreis(
                  event.target.value,
                )
              }
              placeholder="z. B. 38,00"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={
              sammelscheinSpeichern
            }
            className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-bold text-white"
          >
            {bearbeiteteId !== null
              ? "Änderungen speichern"
              : "+ Sammelschein hinzufügen"}
          </button>

          {bearbeiteteId !== null && (
            <button
              type="button"
              onClick={
                bearbeitungAbbrechen
              }
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
                  Annahmestelle:{" "}
                  <span className="font-bold text-slate-900">
                    {
                      ausgewaehlteAnnahmestelle
                    }
                  </span>
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Kunde:{" "}
                  <span className="font-bold text-slate-900">
                    {ausgewaehlterKunde
                      ? `${ausgewaehlterKunde.kundennummer} – ${kundenNameErmitteln(
                          ausgewaehlterKunde,
                        )}`
                      : "Laufkunde"}
                  </span>
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Voraussichtliche Nummer:{" "}
                  <span className="font-bold text-slate-900">
                    {
                      naechsteLieferscheinNummer
                    }
                  </span>
                </p>
              </div>

              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                Entwurf
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {sammelscheine.map(
                (sammelschein) => (
                  <SammelscheinKarte
                    key={
                      sammelschein.id
                    }
                    sammelschein={
                      sammelschein
                    }
                    onBearbeiten={
                      sammelscheinBearbeiten
                    }
                    onLoeschen={
                      sammelscheinLoeschen
                    }
                  />
                ),
              )}
            </div>

            <div className="mt-6">
              <LieferscheinStatistik
                anzahlSammelscheine={
                  sammelscheine.length
                }
                gesamtTeile={
                  gesamtTeile
                }
                gesamtBetrag={
                  gesamtBetrag
                }
              />
            </div>

            <button
              type="button"
              onClick={
                lieferscheinFertigstellen
              }
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
    </ZugriffsSchutz>
  );
}