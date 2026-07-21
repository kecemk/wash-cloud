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

type PositionFotos = Record<number, File[]>;

const MAXIMALE_FOTOGROESSE =
  10 * 1024 * 1024;

function dateinameBereinigen(
  dateiname: string,
) {
  return dateiname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "foto.jpg";
}

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

  const [
    freierArtikel,
    setFreierArtikel,
  ] = useState("");

  const [preis, setPreis] =
    useState("");

  const [positionen, setPositionen] =
    useState<ArtikelPosition[]>([]);

  const [
    positionFotos,
    setPositionFotos,
  ] = useState<PositionFotos>({});

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

  const [
    kundenAuswahlIstOffen,
    setKundenAuswahlIstOffen,
  ] = useState(false);

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

    const ausgewaehlterArtikel =
      artikel === "Sonstiges"
        ? freierArtikel.trim()
        : artikel;

    if (!ausgewaehlterArtikel) {
      alert(
        "Bitte gib die Bezeichnung des Artikels ein.",
      );
      return;
    }

    setPositionen(
      (aktuellePositionen) => [
        ...aktuellePositionen,
        {
          id: Date.now(),
          menge: mengeAlsZahl,
          artikel: ausgewaehlterArtikel,
        },
      ],
    );

    setMenge("");
    setFreierArtikel("");
    setErfolgsmeldung("");
    setSupabaseFehler("");
  }

  function fotosZuPositionHinzufuegen(
    positionId: number,
    dateien: FileList | null,
  ) {
    if (!dateien) {
      return;
    }

    const neueFotos = Array.from(
      dateien,
    ).filter((datei) => {
      if (
        !datei.type.startsWith("image/")
      ) {
        alert(
          `${datei.name} ist keine Bilddatei.`,
        );
        return false;
      }

      if (
        datei.size >
        MAXIMALE_FOTOGROESSE
      ) {
        alert(
          `${datei.name} ist größer als 10 MB.`,
        );
        return false;
      }

      return true;
    });

    if (neueFotos.length === 0) {
      return;
    }

    setPositionFotos(
      (aktuelleFotos) => ({
        ...aktuelleFotos,
        [positionId]: [
          ...(
            aktuelleFotos[
              positionId
            ] ?? []
          ),
          ...neueFotos,
        ],
      }),
    );

    setErfolgsmeldung(
      `${neueFotos.length} Foto${
        neueFotos.length === 1
          ? ""
          : "s"
      } wurde${
        neueFotos.length === 1
          ? ""
          : "n"
      } zur Artikelposition hinzugefügt.`,
    );
    setSupabaseFehler("");
  }

  function fotoVonPositionEntfernen(
    positionId: number,
    fotoIndex: number,
  ) {
    setPositionFotos(
      (aktuelleFotos) => {
        const verbleibendeFotos = (
          aktuelleFotos[positionId] ??
          []
        ).filter(
          (_, index) =>
            index !== fotoIndex,
        );

        const neueFotos = {
          ...aktuelleFotos,
        };

        if (
          verbleibendeFotos.length ===
          0
        ) {
          delete neueFotos[
            positionId
          ];
        } else {
          neueFotos[positionId] =
            verbleibendeFotos;
        }

        return neueFotos;
      },
    );
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

    setPositionFotos(
      (aktuelleFotos) => {
        const neueFotos = {
          ...aktuelleFotos,
        };

        delete neueFotos[id];

        return neueFotos;
      },
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
    setFreierArtikel("");
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
    setFreierArtikel("");
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

    const geloeschterSammelschein =
      sammelscheine.find(
        (sammelschein) =>
          sammelschein.id === id,
      );

    setSammelscheine(
      (aktuelleSammelscheine) =>
        aktuelleSammelscheine.filter(
          (sammelschein) =>
            sammelschein.id !== id,
        ),
    );

    if (geloeschterSammelschein) {
      setPositionFotos(
        (aktuelleFotos) => {
          const neueFotos = {
            ...aktuelleFotos,
          };

          geloeschterSammelschein.positionen.forEach(
            (position) => {
              delete neueFotos[
                position.id
              ];
            },
          );

          return neueFotos;
        },
      );
    }

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

    const hochgeladeneDateipfade:
      string[] = [];

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

      const {
        data: authDaten,
        error: authFehler,
      } = await supabase.auth.getUser();

      if (
        authFehler ||
        !authDaten.user
      ) {
        throw new Error(
          authFehler?.message ??
            "Der angemeldete Benutzer konnte nicht ermittelt werden.",
        );
      }

      const {
        data: benutzerDaten,
        error: benutzerFehler,
      } = await supabase
        .from("benutzer")
        .select("id")
        .eq(
          "auth_user_id",
          authDaten.user.id,
        )
        .eq("aktiv", true)
        .single();

      if (
        benutzerFehler ||
        !benutzerDaten
      ) {
        throw new Error(
          benutzerFehler?.message ??
            "Der aktive Washly-Benutzer konnte nicht ermittelt werden.",
        );
      }

      const benutzerId = Number(
        benutzerDaten.id,
      );

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

        for (
          const position of
          sammelschein.positionen
        ) {
          const {
            data:
              gespeichertePosition,
            error:
              positionFehler,
          } = await supabase
            .from(
              "sammelschein_positionen",
            )
            .insert({
              sammelschein_id:
                gespeicherterSammelschein.id,
              artikel:
                position.artikel,
              menge:
                position.menge,
            })
            .select("id")
            .single();

          if (
            positionFehler ||
            !gespeichertePosition
          ) {
            throw new Error(
              positionFehler?.message ??
                `Die Position ${position.artikel} konnte nicht gespeichert werden.`,
            );
          }

          const fotos =
            positionFotos[
              position.id
            ] ?? [];

          for (
            const foto of fotos
          ) {
            const bereinigterDateiname =
              dateinameBereinigen(
                foto.name,
              );

            const dateipfad = [
              String(
                ausgewaehlteAnnahmestelleId,
              ),
              String(
                neueLieferscheinId,
              ),
              String(
                gespeicherterSammelschein.id,
              ),
              String(
                gespeichertePosition.id,
              ),
              `${crypto.randomUUID()}-${bereinigterDateiname}`,
            ].join("/");

            const {
              error: uploadFehler,
            } = await supabase.storage
              .from(
                "lieferschein-fotos",
              )
              .upload(
                dateipfad,
                foto,
                {
                  cacheControl:
                    "3600",
                  contentType:
                    foto.type,
                  upsert: false,
                },
              );

            if (uploadFehler) {
              throw new Error(
                `Das Foto ${foto.name} konnte nicht hochgeladen werden: ${uploadFehler.message}`,
              );
            }

            hochgeladeneDateipfade.push(
              dateipfad,
            );

            const {
              error: fotoFehler,
            } = await supabase
              .from(
                "lieferschein_fotos",
              )
              .insert({
                lieferschein_id:
                  neueLieferscheinId,
                sammelschein_position_id:
                  gespeichertePosition.id,
                dateipfad,
                dateiname:
                  foto.name,
                dateityp:
                  foto.type ||
                  null,
                dateigroesse:
                  foto.size,
                benutzer_id:
                  benutzerId,
              });

            if (fotoFehler) {
              throw new Error(
                `Die Zuordnung für ${foto.name} konnte nicht gespeichert werden: ${fotoFehler.message}`,
              );
            }
          }
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
      setPositionFotos({});
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
        hochgeladeneDateipfade.length >
        0
      ) {
        await supabase.storage
          .from("lieferschein-fotos")
          .remove(
            hochgeladeneDateipfade,
          );
      }

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
              Washly
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
              href="/"
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
            >
              Zurück zur Auswahl
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

        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Ausgewählte Annahmestelle
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {ausgewaehlteAnnahmestelle}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-slate-600">
                Neuer Lieferschein
              </p>

              <p className="mt-1 font-bold text-slate-950">
                {naechsteLieferscheinNummer}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <button
            type="button"
            onClick={() =>
              setKundenAuswahlIstOffen(
                (istOffen) => !istOffen,
              )
            }
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <p className="font-bold text-slate-950">
                Kunde auswählen
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Optional – ohne Auswahl wird der Auftrag als Laufkunde gespeichert.
              </p>
            </div>

            <span className="text-xl font-bold text-blue-700">
              {kundenAuswahlIstOffen ? "−" : "+"}
            </span>
          </button>

          {kundenAuswahlIstOffen && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-slate-700">
                    Kunde für diesen Lieferschein
                  </span>

                  <select
                    value={ausgewaehlteKundenId}
                    onChange={(event) => {
                      setAusgewaehlteKundenId(
                        event.target.value,
                      );

                      setErfolgsmeldung("");
                      setSupabaseFehler("");
                    }}
                    disabled={kundenWerdenGeladen}
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
                        {kundenNameErmitteln(kunde)}
                      </option>
                    ))}
                  </select>
                </label>

                <Link
                  href="/kunden"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  Kunden verwalten
                </Link>
              </div>

              {ausgewaehlterKunde && (
                <div className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-900">
                  <p className="font-bold">
                    {kundenNameErmitteln(
                      ausgewaehlterKunde,
                    )}
                  </p>

                  <p className="mt-1 text-sm">
                    {ausgewaehlterKunde.kundennummer}
                    {ausgewaehlterKunde.telefon
                      ? ` · ${ausgewaehlterKunde.telefon}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Schritt 1
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
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
                inputMode="numeric"
                value={nummer}
                onChange={(event) =>
                  setNummer(
                    event.target.value,
                  )
                }
                placeholder="z. B. 6080"
                autoFocus
                className="mt-2 w-full rounded-xl border-2 border-blue-300 px-4 py-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-700"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Menge
              </span>

              <input
                type="number"
                inputMode="numeric"
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

                <option value="Sonstiges">
                  Sonstiges / selbst eingeben
                </option>
              </select>
            </label>
          </div>

          {artikel === "Sonstiges" && (
            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">
                Eigener Artikel
              </span>

              <input
                type="text"
                value={freierArtikel}
                onChange={(event) =>
                  setFreierArtikel(
                    event.target.value,
                  )
                }
                placeholder="z. B. Schlafsack, Gardine oder Teppichdecke"
                className="mt-2 w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700"
              />
            </label>
          )}

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
                      className="rounded-lg bg-white px-4 py-3 text-slate-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-semibold">
                          {position.menge}{" "}
                          {artikelText(
                            position,
                          )}
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="cursor-pointer rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white">
                            📷 Foto aufnehmen

                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              multiple
                              onChange={(event) => {
                                fotosZuPositionHinzufuegen(
                                  position.id,
                                  event.target.files,
                                );

                                event.target.value =
                                  "";
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              artikelPositionLoeschen(
                                position.id,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>

                      {(
                        positionFotos[
                          position.id
                        ] ?? []
                      ).length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                          <p className="text-sm font-bold text-green-700">
                            {
                              positionFotos[
                                position.id
                              ].length
                            }{" "}
                            Foto
                            {positionFotos[
                              position.id
                            ].length === 1
                              ? ""
                              : "s"}{" "}
                            ausgewählt
                          </p>

                          {positionFotos[
                            position.id
                          ].map(
                            (
                              foto,
                              fotoIndex,
                            ) => (
                              <div
                                key={`${foto.name}-${foto.lastModified}-${fotoIndex}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm"
                              >
                                <span className="min-w-0 truncate">
                                  {foto.name}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    fotoVonPositionEntfernen(
                                      position.id,
                                      fotoIndex,
                                    )
                                  }
                                  className="font-bold text-red-600"
                                >
                                  Foto entfernen
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      )}
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
              inputMode="decimal"
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
          <div className="mx-auto mt-8 max-w-3xl rounded-3xl bg-white p-6 shadow">
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

            {Object.keys(
              positionFotos,
            ).length > 0 && (
              <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                Die ausgewählten Fotos werden
                zusammen mit dem Lieferschein
                hochgeladen. Bitte die Seite bis
                zum erfolgreichen Abschluss nicht
                schließen.
              </div>
            )}

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