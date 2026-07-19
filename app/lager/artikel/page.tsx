"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { supabase } from "../../lib/supabase";

type Lagerartikel = {
  id: number;
  name: string;
  kategorie: string | null;
  einheit: string;
  bestand: number;
  mindestbestand: number;
  einkaufspreis: number | null;
  aktiv: boolean;
};

type ArtikelFormular = {
  name: string;
  kategorie: string;
  einheit: string;
  anfangsbestand: string;
  mindestbestand: string;
  einkaufspreis: string;
};

type BearbeitenFormular = {
  artikelId: number | null;
  name: string;
  kategorie: string;
  einheit: string;
  mindestbestand: string;
  einkaufspreis: string;
};

type WareneingangFormular = {
  artikelId: string;
  menge: string;
  notiz: string;
};

type KorrekturFormular = {
  artikelId: string;
  richtung: "plus" | "minus";
  menge: string;
  grund: string;
};

const leeresArtikelFormular: ArtikelFormular = {
  name: "",
  kategorie: "",
  einheit: "Stück",
  anfangsbestand: "0",
  mindestbestand: "0",
  einkaufspreis: "",
};

const leeresBearbeitenFormular: BearbeitenFormular = {
  artikelId: null,
  name: "",
  kategorie: "",
  einheit: "",
  mindestbestand: "0",
  einkaufspreis: "",
};

const leeresWareneingangFormular: WareneingangFormular = {
  artikelId: "",
  menge: "1",
  notiz: "",
};

const leeresKorrekturFormular: KorrekturFormular = {
  artikelId: "",
  richtung: "minus",
  menge: "1",
  grund: "",
};

function zahlEinlesen(
  wert: string,
) {
  return Number(
    wert.trim().replace(",", "."),
  );
}

function zahlFormatieren(
  wert: number,
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      maximumFractionDigits: 3,
    },
  ).format(wert);
}

function preisFormatieren(
  wert: number | null,
) {
  if (wert === null) {
    return "Nicht angegeben";
  }

  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(wert);
}

function lagerartikelUmwandeln(
  eintrag: {
    id: number | string;
    name: string;
    kategorie: string | null;
    einheit: string;
    bestand: number | string;
    mindestbestand: number | string;
    einkaufspreis: number | string | null;
    aktiv: boolean;
  },
): Lagerartikel {
  return {
    id: Number(eintrag.id),
    name: String(eintrag.name),
    kategorie:
      eintrag.kategorie === null
        ? null
        : String(eintrag.kategorie),
    einheit: String(eintrag.einheit),
    bestand: Number(eintrag.bestand),
    mindestbestand: Number(
      eintrag.mindestbestand,
    ),
    einkaufspreis:
      eintrag.einkaufspreis === null
        ? null
        : Number(eintrag.einkaufspreis),
    aktiv: Boolean(eintrag.aktiv),
  };
}

export default function LagerArtikelPage() {
  const [artikel, setArtikel] =
    useState<Lagerartikel[]>([]);

  const [
    artikelFormular,
    setArtikelFormular,
  ] = useState<ArtikelFormular>(
    leeresArtikelFormular,
  );

  const [
    bearbeitenFormular,
    setBearbeitenFormular,
  ] = useState<BearbeitenFormular>(
    leeresBearbeitenFormular,
  );

  const [
    wareneingangFormular,
    setWareneingangFormular,
  ] = useState<WareneingangFormular>(
    leeresWareneingangFormular,
  );

  const [
    korrekturFormular,
    setKorrekturFormular,
  ] = useState<KorrekturFormular>(
    leeresKorrekturFormular,
  );

  const [laedt, setLaedt] =
    useState(true);

  const [speichert, setSpeichert] =
    useState(false);

  const [bearbeitet, setBearbeitet] =
    useState(false);

  const [bucht, setBucht] =
    useState(false);

  const [
    korrigiert,
    setKorrigiert,
  ] = useState(false);

  const [
    statusWirdGeaendert,
    setStatusWirdGeaendert,
  ] = useState<number | null>(null);

  const [fehler, setFehler] =
    useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  useEffect(() => {
    void artikelLaden();
  }, []);

  async function artikelLaden() {
    setLaedt(true);
    setFehler("");

    try {
      const { data, error } =
        await supabase
          .from("lagerartikel")
          .select(`
            id,
            name,
            kategorie,
            einheit,
            bestand,
            mindestbestand,
            einkaufspreis,
            aktiv
          `)
          .order("aktiv", {
            ascending: false,
          })
          .order("name", {
            ascending: true,
          });

      if (error) {
        throw new Error(error.message);
      }

      setArtikel(
        (data ?? []).map(
          (eintrag) =>
            lagerartikelUmwandeln(
              eintrag,
            ),
        ),
      );
    } catch (unbekannterFehler) {
      console.error(
        "Die Lagerartikel konnten nicht geladen werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Lagerartikel konnten nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  function artikelFeldAendern(
    feld: keyof ArtikelFormular,
    wert: string,
  ) {
    setArtikelFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]: wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  function bearbeitenFeldAendern(
    feld: Exclude<
      keyof BearbeitenFormular,
      "artikelId"
    >,
    wert: string,
  ) {
    setBearbeitenFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]: wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  function wareneingangFeldAendern(
    feld: keyof WareneingangFormular,
    wert: string,
  ) {
    setWareneingangFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]: wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  function korrekturFeldAendern(
    feld: keyof KorrekturFormular,
    wert: string,
  ) {
    setKorrekturFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]:
          feld === "richtung"
            ? wert as KorrekturFormular["richtung"]
            : wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  function artikelBearbeitungStarten(
    eintrag: Lagerartikel,
  ) {
    setBearbeitenFormular({
      artikelId: eintrag.id,
      name: eintrag.name,
      kategorie:
        eintrag.kategorie ?? "",
      einheit: eintrag.einheit,
      mindestbestand: String(
        eintrag.mindestbestand,
      ),
      einkaufspreis:
        eintrag.einkaufspreis === null
          ? ""
          : String(
              eintrag.einkaufspreis,
            ),
    });

    setFehler("");
    setErfolgsmeldung("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function artikelBearbeitungAbbrechen() {
    setBearbeitenFormular(
      leeresBearbeitenFormular,
    );
  }

  async function artikelAnlegen(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (speichert) {
      return;
    }

    const name =
      artikelFormular.name.trim();

    const einheit =
      artikelFormular.einheit.trim();

    const anfangsbestand =
      zahlEinlesen(
        artikelFormular.anfangsbestand,
      );

    const mindestbestand =
      zahlEinlesen(
        artikelFormular.mindestbestand,
      );

    const einkaufspreisText =
      artikelFormular.einkaufspreis.trim();

    const einkaufspreis =
      einkaufspreisText
        ? zahlEinlesen(
            einkaufspreisText,
          )
        : null;

    if (!name) {
      setFehler(
        "Bitte gib einen Artikelnamen ein.",
      );
      return;
    }

    if (!einheit) {
      setFehler(
        "Bitte gib eine Einheit ein.",
      );
      return;
    }

    if (
      !Number.isFinite(
        anfangsbestand,
      ) ||
      anfangsbestand < 0
    ) {
      setFehler(
        "Der Anfangsbestand darf nicht negativ sein.",
      );
      return;
    }

    if (
      !Number.isFinite(
        mindestbestand,
      ) ||
      mindestbestand < 0
    ) {
      setFehler(
        "Der Mindestbestand darf nicht negativ sein.",
      );
      return;
    }

    if (
      einkaufspreis !== null &&
      (
        !Number.isFinite(
          einkaufspreis,
        ) ||
        einkaufspreis < 0
      )
    ) {
      setFehler(
        "Bitte gib einen gültigen Einkaufspreis ein.",
      );
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const {
        data: neuerArtikel,
        error: artikelFehler,
      } = await supabase
        .from("lagerartikel")
        .insert({
          name,
          kategorie:
            artikelFormular.kategorie
              .trim() || null,
          einheit,
          bestand: 0,
          mindestbestand,
          einkaufspreis,
          aktiv: true,
        })
        .select("id")
        .single();

      if (
        artikelFehler ||
        !neuerArtikel
      ) {
        throw new Error(
          artikelFehler?.message ??
            "Der Lagerartikel konnte nicht angelegt werden.",
        );
      }

      const neueArtikelId =
        Number(neuerArtikel.id);

      if (anfangsbestand > 0) {
        const { error: bestandsFehler } =
          await supabase.rpc(
            "lagerbewegung_buchen",
            {
              p_lagerartikel_id:
                neueArtikelId,
              p_buchungsart:
                "wareneingang",
              p_menge:
                anfangsbestand,
              p_notiz:
                "Anfangsbestand bei Artikelanlage",
            },
          );

        if (bestandsFehler) {
          await supabase
            .from("lagerartikel")
            .delete()
            .eq(
              "id",
              neueArtikelId,
            );

          throw new Error(
            bestandsFehler.message,
          );
        }
      }

      setArtikelFormular(
        leeresArtikelFormular,
      );

      setErfolgsmeldung(
        `Der Lagerartikel ${name} wurde angelegt.`,
      );

      await artikelLaden();
    } catch (unbekannterFehler) {
      console.error(
        "Der Lagerartikel konnte nicht angelegt werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Der Lagerartikel konnte nicht angelegt werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  async function artikelBearbeiten(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      bearbeitet ||
      bearbeitenFormular.artikelId === null
    ) {
      return;
    }

    const name =
      bearbeitenFormular.name.trim();

    const einheit =
      bearbeitenFormular.einheit.trim();

    const mindestbestand =
      zahlEinlesen(
        bearbeitenFormular.mindestbestand,
      );

    const einkaufspreisText =
      bearbeitenFormular.einkaufspreis.trim();

    const einkaufspreis =
      einkaufspreisText
        ? zahlEinlesen(
            einkaufspreisText,
          )
        : null;

    if (!name || !einheit) {
      setFehler(
        "Artikelname und Einheit sind Pflichtfelder.",
      );
      return;
    }

    if (
      !Number.isFinite(
        mindestbestand,
      ) ||
      mindestbestand < 0
    ) {
      setFehler(
        "Der Mindestbestand darf nicht negativ sein.",
      );
      return;
    }

    if (
      einkaufspreis !== null &&
      (
        !Number.isFinite(
          einkaufspreis,
        ) ||
        einkaufspreis < 0
      )
    ) {
      setFehler(
        "Bitte gib einen gültigen Einkaufspreis ein.",
      );
      return;
    }

    setBearbeitet(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const { error } =
        await supabase
          .from("lagerartikel")
          .update({
            name,
            kategorie:
              bearbeitenFormular.kategorie
                .trim() || null,
            einheit,
            mindestbestand,
            einkaufspreis,
          })
          .eq(
            "id",
            bearbeitenFormular.artikelId,
          );

      if (error) {
        throw new Error(error.message);
      }

      setBearbeitenFormular(
        leeresBearbeitenFormular,
      );

      setErfolgsmeldung(
        `Der Lagerartikel ${name} wurde aktualisiert.`,
      );

      await artikelLaden();
    } catch (unbekannterFehler) {
      console.error(
        "Der Lagerartikel konnte nicht bearbeitet werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Der Lagerartikel konnte nicht bearbeitet werden.",
      );
    } finally {
      setBearbeitet(false);
    }
  }

  async function wareneingangBuchen(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (bucht) {
      return;
    }

    const artikelId =
      Number(
        wareneingangFormular.artikelId,
      );

    const menge =
      zahlEinlesen(
        wareneingangFormular.menge,
      );

    if (
      !Number.isInteger(artikelId) ||
      artikelId <= 0
    ) {
      setFehler(
        "Bitte wähle einen Lagerartikel aus.",
      );
      return;
    }

    if (
      !Number.isFinite(menge) ||
      menge <= 0
    ) {
      setFehler(
        "Bitte gib eine Menge größer als 0 ein.",
      );
      return;
    }

    setBucht(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const ausgewaehlterArtikel =
        artikel.find(
          (eintrag) =>
            eintrag.id === artikelId,
        );

      const { error } =
        await supabase.rpc(
          "lagerbewegung_buchen",
          {
            p_lagerartikel_id:
              artikelId,
            p_buchungsart:
              "wareneingang",
            p_menge: menge,
            p_notiz:
              wareneingangFormular.notiz
                .trim() || null,
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      setWareneingangFormular(
        leeresWareneingangFormular,
      );

      setErfolgsmeldung(
        ausgewaehlterArtikel
          ? `${zahlFormatieren(
              menge,
            )} ${
              ausgewaehlterArtikel.einheit
            } ${
              ausgewaehlterArtikel.name
            } wurden als Wareneingang gebucht.`
          : "Der Wareneingang wurde gebucht.",
      );

      await artikelLaden();
    } catch (unbekannterFehler) {
      console.error(
        "Der Wareneingang konnte nicht gebucht werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Der Wareneingang konnte nicht gebucht werden.",
      );
    } finally {
      setBucht(false);
    }
  }

  async function bestandKorrigieren(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (korrigiert) {
      return;
    }

    const artikelId = Number(
      korrekturFormular.artikelId,
    );

    const menge = zahlEinlesen(
      korrekturFormular.menge,
    );

    const grund =
      korrekturFormular.grund.trim();

    if (
      !Number.isInteger(artikelId) ||
      artikelId <= 0
    ) {
      setFehler(
        "Bitte wähle einen Lagerartikel aus.",
      );
      return;
    }

    if (
      !Number.isFinite(menge) ||
      menge <= 0
    ) {
      setFehler(
        "Bitte gib eine Korrekturmenge größer als 0 ein.",
      );
      return;
    }

    if (!grund) {
      setFehler(
        "Bitte gib einen Grund für die Bestandskorrektur ein.",
      );
      return;
    }

    const ausgewaehlterArtikel =
      artikel.find(
        (eintrag) =>
          eintrag.id === artikelId,
      );

    if (
      korrekturFormular.richtung ===
        "minus" &&
      ausgewaehlterArtikel &&
      menge >
        ausgewaehlterArtikel.bestand
    ) {
      setFehler(
        `Die Korrektur ist größer als der aktuelle Bestand von ${zahlFormatieren(
          ausgewaehlterArtikel.bestand,
        )} ${ausgewaehlterArtikel.einheit}.`,
      );
      return;
    }

    const bestaetigt =
      window.confirm(
        `Möchtest du den Bestand von ${
          ausgewaehlterArtikel?.name ??
          "diesem Artikel"
        } wirklich um ${zahlFormatieren(
          menge,
        )} ${
          korrekturFormular.richtung ===
          "plus"
            ? "erhöhen"
            : "verringern"
        }?`,
      );

    if (!bestaetigt) {
      return;
    }

    setKorrigiert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const { error } =
        await supabase.rpc(
          "lagerbewegung_buchen",
          {
            p_lagerartikel_id:
              artikelId,
            p_buchungsart:
              korrekturFormular.richtung ===
              "plus"
                ? "korrektur_plus"
                : "korrektur_minus",
            p_menge: menge,
            p_notiz: grund,
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      setKorrekturFormular(
        leeresKorrekturFormular,
      );

      setErfolgsmeldung(
        `Der Bestand von ${
          ausgewaehlterArtikel?.name ??
          "dem Lagerartikel"
        } wurde korrigiert.`,
      );

      await artikelLaden();
    } catch (unbekannterFehler) {
      console.error(
        "Die Bestandskorrektur konnte nicht gebucht werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Bestandskorrektur konnte nicht gebucht werden.",
      );
    } finally {
      setKorrigiert(false);
    }
  }

  async function artikelStatusAendern(
    ausgewaehlterArtikel: Lagerartikel,
  ) {
    if (
      statusWirdGeaendert !== null
    ) {
      return;
    }

    const neuerStatus =
      !ausgewaehlterArtikel.aktiv;

    const aktion =
      neuerStatus
        ? "aktivieren"
        : "deaktivieren";

    const bestaetigt =
      window.confirm(
        `Möchtest du ${ausgewaehlterArtikel.name} wirklich ${aktion}?`,
      );

    if (!bestaetigt) {
      return;
    }

    setStatusWirdGeaendert(
      ausgewaehlterArtikel.id,
    );

    setFehler("");
    setErfolgsmeldung("");

    try {
      const { error } =
        await supabase
          .from("lagerartikel")
          .update({
            aktiv: neuerStatus,
          })
          .eq(
            "id",
            ausgewaehlterArtikel.id,
          );

      if (error) {
        throw new Error(error.message);
      }

      setErfolgsmeldung(
        `${ausgewaehlterArtikel.name} wurde ${
          neuerStatus
            ? "aktiviert"
            : "deaktiviert"
        }.`,
      );

      await artikelLaden();
    } catch (unbekannterFehler) {
      console.error(
        "Der Artikelstatus konnte nicht geändert werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Der Artikelstatus konnte nicht geändert werden.",
      );
    } finally {
      setStatusWirdGeaendert(null);
    }
  }

  const aktiveArtikel =
    useMemo(
      () =>
        artikel.filter(
          (eintrag) =>
            eintrag.aktiv,
        ),
      [artikel],
    );

  return (
    <ZugriffsSchutz
      berechtigung="lager_verwalten"
      titel="Lagerverwaltung gesperrt"
      beschreibung="Nur Administratoren dürfen Lagerartikel verwalten."
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-6 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Wash Cloud
              </p>

              <h1 className="text-3xl font-bold">
                Lagerverwaltung
              </h1>

              <p className="mt-1 text-slate-300">
                Artikel anlegen, bearbeiten und
                Bestände auffüllen
              </p>
            </div>

            <Link
              href="/lager"
              className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
            >
              Zur Lagerübersicht
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-10">
          {fehler && (
            <div className="mb-6 rounded-2xl bg-red-100 p-5 text-red-800 shadow">
              <p className="font-bold">
                Vorgang fehlgeschlagen
              </p>

              <p className="mt-1">
                {fehler}
              </p>
            </div>
          )}

          {erfolgsmeldung && (
            <div className="mb-6 rounded-2xl bg-green-100 p-5 text-green-800 shadow">
              <p className="font-bold">
                Änderung gespeichert
              </p>

              <p className="mt-1">
                {erfolgsmeldung}
              </p>
            </div>
          )}

          {bearbeitenFormular.artikelId !==
            null && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Lagerartikel bearbeiten
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Der aktuelle Bestand wird dabei
                    nicht verändert.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    artikelBearbeitungAbbrechen
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700"
                >
                  Abbrechen
                </button>
              </div>

              <form
                onSubmit={artikelBearbeiten}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Artikelname
                  </span>

                  <input
                    type="text"
                    value={
                      bearbeitenFormular.name
                    }
                    onChange={(event) =>
                      bearbeitenFeldAendern(
                        "name",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Kategorie
                  </span>

                  <input
                    type="text"
                    value={
                      bearbeitenFormular.kategorie
                    }
                    onChange={(event) =>
                      bearbeitenFeldAendern(
                        "kategorie",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Einheit
                  </span>

                  <input
                    type="text"
                    value={
                      bearbeitenFormular.einheit
                    }
                    onChange={(event) =>
                      bearbeitenFeldAendern(
                        "einheit",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Mindestbestand
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={
                      bearbeitenFormular.mindestbestand
                    }
                    onChange={(event) =>
                      bearbeitenFeldAendern(
                        "mindestbestand",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Einkaufspreis pro Einheit
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      bearbeitenFormular.einkaufspreis
                    }
                    onChange={(event) =>
                      bearbeitenFeldAendern(
                        "einkaufspreis",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    placeholder="0,00"
                  />
                </label>

                <button
                  type="submit"
                  disabled={bearbeitet}
                  className="rounded-xl bg-blue-700 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
                >
                  {bearbeitet
                    ? "Änderungen werden gespeichert ..."
                    : "Änderungen speichern"}
                </button>
              </form>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-slate-950">
                Neuen Artikel anlegen
              </h2>

              <form
                onSubmit={artikelAnlegen}
                className="mt-6 space-y-4"
              >
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Artikelname
                  </span>

                  <input
                    type="text"
                    value={
                      artikelFormular.name
                    }
                    onChange={(event) =>
                      artikelFeldAendern(
                        "name",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    placeholder="zum Beispiel Waschpulver"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Kategorie
                    </span>

                    <input
                      type="text"
                      value={
                        artikelFormular.kategorie
                      }
                      onChange={(event) =>
                        artikelFeldAendern(
                          "kategorie",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                      placeholder="Waschmittel"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Einheit
                    </span>

                    <input
                      type="text"
                      value={
                        artikelFormular.einheit
                      }
                      onChange={(event) =>
                        artikelFeldAendern(
                          "einheit",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                      placeholder="Sack, Liter oder Stück"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Anfangsbestand
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={
                        artikelFormular.anfangsbestand
                      }
                      onChange={(event) =>
                        artikelFeldAendern(
                          "anfangsbestand",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Mindestbestand
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={
                        artikelFormular.mindestbestand
                      }
                      onChange={(event) =>
                        artikelFeldAendern(
                          "mindestbestand",
                          event.target.value,
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Einkaufspreis pro Einheit
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      artikelFormular.einkaufspreis
                    }
                    onChange={(event) =>
                      artikelFeldAendern(
                        "einkaufspreis",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    placeholder="0,00"
                  />
                </label>

                <button
                  type="submit"
                  disabled={speichert}
                  className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {speichert
                    ? "Artikel wird angelegt ..."
                    : "Artikel anlegen"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-slate-950">
                Wareneingang buchen
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Eingehende Ware erhöht den Bestand
                und wird in der Historie gespeichert.
              </p>

              <form
                onSubmit={wareneingangBuchen}
                className="mt-6 space-y-4"
              >
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Lagerartikel
                  </span>

                  <select
                    value={
                      wareneingangFormular.artikelId
                    }
                    onChange={(event) =>
                      wareneingangFeldAendern(
                        "artikelId",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  >
                    <option value="">
                      Artikel auswählen
                    </option>

                    {aktiveArtikel.map(
                      (eintrag) => (
                        <option
                          key={eintrag.id}
                          value={eintrag.id}
                        >
                          {eintrag.name} –{" "}
                          {zahlFormatieren(
                            eintrag.bestand,
                          )}{" "}
                          {eintrag.einheit}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Eingegangene Menge
                  </span>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={
                      wareneingangFormular.menge
                    }
                    onChange={(event) =>
                      wareneingangFeldAendern(
                        "menge",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Notiz
                  </span>

                  <textarea
                    value={
                      wareneingangFormular.notiz
                    }
                    onChange={(event) =>
                      wareneingangFeldAendern(
                        "notiz",
                        event.target.value,
                      )
                    }
                    rows={3}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    bucht ||
                    aktiveArtikel.length === 0
                  }
                  className="w-full rounded-xl bg-blue-700 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bucht
                    ? "Wareneingang wird gebucht ..."
                    : "Wareneingang buchen"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-2xl font-bold text-slate-950">
                Bestand korrigieren
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Nur für Inventurfehler oder andere
                begründete Abweichungen.
              </p>

              <form
                onSubmit={bestandKorrigieren}
                className="mt-6 space-y-4"
              >
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Lagerartikel
                  </span>

                  <select
                    value={
                      korrekturFormular.artikelId
                    }
                    onChange={(event) =>
                      korrekturFeldAendern(
                        "artikelId",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  >
                    <option value="">
                      Artikel auswählen
                    </option>

                    {aktiveArtikel.map(
                      (eintrag) => (
                        <option
                          key={eintrag.id}
                          value={eintrag.id}
                        >
                          {eintrag.name} –{" "}
                          {zahlFormatieren(
                            eintrag.bestand,
                          )}{" "}
                          {eintrag.einheit}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Korrekturrichtung
                  </span>

                  <select
                    value={
                      korrekturFormular.richtung
                    }
                    onChange={(event) =>
                      korrekturFeldAendern(
                        "richtung",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  >
                    <option value="minus">
                      Bestand verringern
                    </option>

                    <option value="plus">
                      Bestand erhöhen
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Korrekturmenge
                  </span>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={
                      korrekturFormular.menge
                    }
                    onChange={(event) =>
                      korrekturFeldAendern(
                        "menge",
                        event.target.value,
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Grund
                  </span>

                  <textarea
                    value={
                      korrekturFormular.grund
                    }
                    onChange={(event) =>
                      korrekturFeldAendern(
                        "grund",
                        event.target.value,
                      )
                    }
                    rows={3}
                    required
                    placeholder="zum Beispiel Inventur"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    korrigiert ||
                    aktiveArtikel.length === 0
                  }
                  className="w-full rounded-xl bg-orange-700 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {korrigiert
                    ? "Bestand wird korrigiert ..."
                    : "Bestand korrigieren"}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-950">
              Lagerartikel
            </h2>

            {laedt && (
              <div className="mt-4 rounded-2xl bg-white p-6 shadow">
                <p className="text-slate-600">
                  Lagerartikel werden geladen ...
                </p>
              </div>
            )}

            {!laedt &&
              artikel.length === 0 && (
                <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow">
                  <p className="text-slate-600">
                    Noch keine Lagerartikel vorhanden.
                  </p>
                </div>
              )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {!laedt &&
                artikel.map(
                  (eintrag) => (
                    <article
                      key={eintrag.id}
                      className="rounded-2xl bg-white p-6 shadow"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">
                            {eintrag.kategorie ||
                              "Ohne Kategorie"}
                          </p>

                          <h3 className="mt-1 text-xl font-bold text-slate-950">
                            {eintrag.name}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            eintrag.aktiv
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {eintrag.aktiv
                            ? "Aktiv"
                            : "Inaktiv"}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-slate-500">
                            Bestand
                          </p>

                          <p className="mt-1 font-semibold text-slate-950">
                            {zahlFormatieren(
                              eintrag.bestand,
                            )}{" "}
                            {eintrag.einheit}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Mindestbestand
                          </p>

                          <p className="mt-1 font-semibold text-slate-950">
                            {zahlFormatieren(
                              eintrag.mindestbestand,
                            )}{" "}
                            {eintrag.einheit}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Einkaufspreis
                          </p>

                          <p className="mt-1 font-semibold text-slate-950">
                            {preisFormatieren(
                              eintrag.einkaufspreis,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            artikelBearbeitungStarten(
                              eintrag,
                            )
                          }
                          className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
                        >
                          Artikel bearbeiten
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void artikelStatusAendern(
                              eintrag,
                            )
                          }
                          disabled={
                            statusWirdGeaendert !==
                            null
                          }
                          className={`rounded-xl px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                            eintrag.aktiv
                              ? "bg-red-700"
                              : "bg-green-700"
                          }`}
                        >
                          {statusWirdGeaendert ===
                          eintrag.id
                            ? "Status wird geändert ..."
                            : eintrag.aktiv
                              ? "Artikel deaktivieren"
                              : "Artikel aktivieren"}
                        </button>
                      </div>
                    </article>
                  ),
                )}
            </div>
          </div>
        </section>
      </main>
    </ZugriffsSchutz>
  );
}