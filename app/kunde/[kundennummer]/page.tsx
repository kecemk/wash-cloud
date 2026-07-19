"use client";

import Link from "next/link";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { useBenutzer } from "../../context/BenutzerContext";
import { useParams } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";

type DatenbankKunde = {
  id: number;
  kundennummer: string;
  vorname: string | null;
  nachname: string | null;
  firma: string | null;
  telefon: string | null;
  email: string | null;
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
  notiz: string | null;
  aktiv: boolean;
  erstellt_am: string;
};

type Kunde = {
  id: number;
  kundennummer: string;
  vorname: string;
  nachname: string;
  firma: string;
  telefon: string;
  email: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  notiz: string;
  aktiv: boolean;
  erstelltAm: string;
};

type KundenFormular = {
  vorname: string;
  nachname: string;
  firma: string;
  telefon: string;
  email: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  notiz: string;
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
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type KundenLieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  gesamtteile: number;
  erstelltAm: string;
  fertiggestelltAm: string | null;
  annahmestelle: string;
};

type DatenbankRechnungLieferschein = {
  id: number;
};

type DatenbankRechnung = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number | string;
  rechnungsdatum: string;
  faellig_am: string | null;
  bezahlt_am: string | null;
  notiz: string | null;
  erstellt_am: string;
  rechnung_lieferscheine:
    | DatenbankRechnungLieferschein[]
    | null;
};

type KundenRechnung = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  rechnungsdatum: string;
  faelligAm: string | null;
  bezahltAm: string | null;
  notiz: string;
  erstelltAm: string;
  anzahlLieferscheine: number;
};

const leeresFormular: KundenFormular = {
  vorname: "",
  nachname: "",
  firma: "",
  telefon: "",
  email: "",
  strasse: "",
  hausnummer: "",
  plz: "",
  ort: "",
  notiz: "",
};

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
    email: daten.email ?? "",
    strasse: daten.strasse ?? "",
    hausnummer: daten.hausnummer ?? "",
    plz: daten.plz ?? "",
    ort: daten.ort ?? "",
    notiz: daten.notiz ?? "",
    aktiv: daten.aktiv,
    erstelltAm: daten.erstellt_am,
  };
}

function formularAusKunde(
  kunde: Kunde,
): KundenFormular {
  return {
    vorname: kunde.vorname,
    nachname: kunde.nachname,
    firma: kunde.firma,
    telefon: kunde.telefon,
    email: kunde.email,
    strasse: kunde.strasse,
    hausnummer: kunde.hausnummer,
    plz: kunde.plz,
    ort: kunde.ort,
    notiz: kunde.notiz,
  };
}

function lieferscheinUmwandeln(
  daten: DatenbankLieferschein,
): KundenLieferschein {
  const annahmestelle = Array.isArray(
    daten.annahmestellen,
  )
    ? daten.annahmestellen[0]?.name
    : daten.annahmestellen?.name;

  return {
    id: daten.id,
    nummer: daten.nummer,
    status: daten.status,
    gesamtbetrag: Number(
      daten.gesamtbetrag,
    ),
    gesamtteile: daten.gesamtteile,
    erstelltAm: daten.erstellt_am,
    fertiggestelltAm:
      daten.fertiggestellt_am,
    annahmestelle:
      annahmestelle ??
      "Unbekannte Annahmestelle",
  };
}

function rechnungUmwandeln(
  daten: DatenbankRechnung,
): KundenRechnung {
  return {
    id: daten.id,
    nummer: daten.nummer,
    status: daten.status,
    gesamtbetrag: Number(
      daten.gesamtbetrag,
    ),
    rechnungsdatum:
      daten.rechnungsdatum,
    faelligAm: daten.faellig_am,
    bezahltAm: daten.bezahlt_am,
    notiz: daten.notiz ?? "",
    erstelltAm: daten.erstellt_am,
    anzahlLieferscheine:
      daten.rechnung_lieferscheine
        ?.length ?? 0,
  };
}

function datumMitUhrzeitFormatieren(
  datum: string | null,
) {
  if (!datum) {
    return "–";
  }

  const datumAlsObjekt =
    new Date(datum);

  if (
    Number.isNaN(
      datumAlsObjekt.getTime(),
    )
  ) {
    return "Unbekanntes Datum";
  }

  return datumAlsObjekt.toLocaleString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function datumFormatieren(
  datum: string | null,
) {
  if (!datum) {
    return "–";
  }

  const datumAlsObjekt =
    new Date(datum);

  if (
    Number.isNaN(
      datumAlsObjekt.getTime(),
    )
  ) {
    return "Unbekanntes Datum";
  }

  return datumAlsObjekt.toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function betragFormatieren(
  betrag: number,
) {
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(betrag);
}

function kundenNameErmitteln(
  kunde: Kunde,
) {
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

function lieferscheinStatusKlassenErmitteln(
  status: string,
) {
  const normalisierterStatus =
    status.trim().toLowerCase();

  if (
    normalisierterStatus ===
    "geliefert"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalisierterStatus ===
    "fertig"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (
    normalisierterStatus ===
    "offen"
  ) {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-slate-200 text-slate-700";
}

function rechnungsStatusTextFormatieren(
  status: string,
) {
  const normalisierterStatus =
    status.trim().toLowerCase();

  if (
    normalisierterStatus === "offen"
  ) {
    return "Offen";
  }

  if (
    normalisierterStatus ===
    "bezahlt"
  ) {
    return "Bezahlt";
  }

  if (
    normalisierterStatus ===
    "storniert"
  ) {
    return "Storniert";
  }

  return status || "Unbekannt";
}

function rechnungsStatusKlassenErmitteln(
  status: string,
) {
  const normalisierterStatus =
    status.trim().toLowerCase();

  if (
    normalisierterStatus ===
    "bezahlt"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalisierterStatus ===
    "offen"
  ) {
    return "bg-orange-100 text-orange-700";
  }

  if (
    normalisierterStatus ===
    "storniert"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

function rechnungIstUeberfaellig(
  rechnung: KundenRechnung,
) {
  if (
    rechnung.status
      .trim()
      .toLowerCase() !== "offen" ||
    !rechnung.faelligAm
  ) {
    return false;
  }

  const faelligkeitsdatum = new Date(
    `${rechnung.faelligAm}T23:59:59`,
  );

  return (
    !Number.isNaN(
      faelligkeitsdatum.getTime(),
    ) &&
    faelligkeitsdatum.getTime() <
      Date.now()
  );
}

export default function KundeDetailPage() {
  const {
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const darfKundenBearbeiten =
    hatAktuellerBenutzerBerechtigung(
      "kunden_bearbeiten",
    );

  const darfRechnungenAnzeigen =
    hatAktuellerBenutzerBerechtigung(
      "rechnungen_anzeigen",
    );

  const darfRechnungenBearbeiten =
    hatAktuellerBenutzerBerechtigung(
      "rechnungen_bearbeiten",
    );

  const params = useParams<{
    kundennummer: string;
  }>();

  const [kunde, setKunde] =
    useState<Kunde | null>(null);

  const [formular, setFormular] =
    useState<KundenFormular>(
      leeresFormular,
    );

  const [
    lieferscheine,
    setLieferscheine,
  ] = useState<
    KundenLieferschein[]
  >([]);

  const [
    rechnungen,
    setRechnungen,
  ] = useState<KundenRechnung[]>(
    [],
  );

  const [
    datenGeladen,
    setDatenGeladen,
  ] = useState(false);

  const [
    historienWerdenGeladen,
    setHistorienWerdenGeladen,
  ] = useState(false);

  const [speichert, setSpeichert] =
    useState(false);

  const [
    statusWirdGeaendert,
    setStatusWirdGeaendert,
  ] = useState(false);

  const [fehler, setFehler] =
    useState("");

  const [
    lieferscheinFehler,
    setLieferscheinFehler,
  ] = useState("");

  const [
    rechnungsFehler,
    setRechnungsFehler,
  ] = useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  useEffect(() => {
    let istAktiv = true;

    async function kundeUndHistorienLaden() {
      setDatenGeladen(false);
      setHistorienWerdenGeladen(true);
      setFehler("");
      setLieferscheinFehler("");
      setRechnungsFehler("");
      setErfolgsmeldung("");

      try {
        const gesuchteKundennummer =
          decodeURIComponent(
            params.kundennummer,
          );

        const {
          data: kundenDaten,
          error: kundenFehler,
        } = await supabase
          .from("kunden")
          .select(`
            id,
            kundennummer,
            vorname,
            nachname,
            firma,
            telefon,
            email,
            strasse,
            hausnummer,
            plz,
            ort,
            notiz,
            aktiv,
            erstellt_am
          `)
          .eq(
            "kundennummer",
            gesuchteKundennummer,
          )
          .single();

        if (!istAktiv) {
          return;
        }

        if (kundenFehler) {
          throw new Error(
            kundenFehler.message,
          );
        }

        if (!kundenDaten) {
          setKunde(null);
          setLieferscheine([]);
          setRechnungen([]);
          return;
        }

        const geladenerKunde =
          kundeUmwandeln(
            kundenDaten as DatenbankKunde,
          );

        setKunde(geladenerKunde);

        setFormular(
          formularAusKunde(
            geladenerKunde,
          ),
        );

        setDatenGeladen(true);

        const [
          lieferscheinErgebnis,
          rechnungsErgebnis,
        ] = await Promise.all([
          supabase
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
              )
            `)
            .eq(
              "kunde_id",
              geladenerKunde.id,
            )
            .order("erstellt_am", {
              ascending: false,
            }),

          supabase
            .from("rechnungen")
            .select(`
              id,
              nummer,
              status,
              gesamtbetrag,
              rechnungsdatum,
              faellig_am,
              bezahlt_am,
              notiz,
              erstellt_am,
              rechnung_lieferscheine (
                id
              )
            `)
            .eq(
              "kunde_id",
              geladenerKunde.id,
            )
            .order("rechnungsdatum", {
              ascending: false,
            })
            .order("erstellt_am", {
              ascending: false,
            }),
        ]);

        if (!istAktiv) {
          return;
        }

        if (
          lieferscheinErgebnis.error
        ) {
          console.error(
            "Die Lieferscheinhistorie konnte nicht geladen werden:",
            lieferscheinErgebnis.error,
          );

          setLieferscheinFehler(
            lieferscheinErgebnis.error
              .message,
          );

          setLieferscheine([]);
        } else {
          const geladeneLieferscheine =
            (
              (lieferscheinErgebnis.data ??
                []) as DatenbankLieferschein[]
            ).map(
              lieferscheinUmwandeln,
            );

          setLieferscheine(
            geladeneLieferscheine,
          );
        }

        if (
          rechnungsErgebnis.error
        ) {
          console.error(
            "Die Rechnungshistorie konnte nicht geladen werden:",
            rechnungsErgebnis.error,
          );

          setRechnungsFehler(
            rechnungsErgebnis.error
              .message,
          );

          setRechnungen([]);
        } else {
          const geladeneRechnungen =
            (
              (rechnungsErgebnis.data ??
                []) as DatenbankRechnung[]
            ).map(
              rechnungUmwandeln,
            );

          setRechnungen(
            geladeneRechnungen,
          );
        }
      } catch (unbekannterFehler) {
        console.error(
          "Der Kunde konnte nicht geladen werden:",
          unbekannterFehler,
        );

        if (!istAktiv) {
          return;
        }

        setFehler(
          unbekannterFehler instanceof
            Error
            ? unbekannterFehler.message
            : "Der Kunde konnte nicht geladen werden.",
        );

        setKunde(null);
        setLieferscheine([]);
        setRechnungen([]);
      } finally {
        if (istAktiv) {
          setDatenGeladen(true);
          setHistorienWerdenGeladen(
            false,
          );
        }
      }
    }

    void kundeUndHistorienLaden();

    return () => {
      istAktiv = false;
    };
  }, [params.kundennummer]);

  const lieferscheinGesamtumsatz =
    useMemo(
      () =>
        lieferscheine.reduce(
          (
            summe,
            lieferschein,
          ) =>
            summe +
            lieferschein.gesamtbetrag,
          0,
        ),
      [lieferscheine],
    );

  const gesamteTeile = useMemo(
    () =>
      lieferscheine.reduce(
        (
          summe,
          lieferschein,
        ) =>
          summe +
          lieferschein.gesamtteile,
        0,
      ),
    [lieferscheine],
  );

  const offeneRechnungen =
    useMemo(
      () =>
        rechnungen.filter(
          (rechnung) =>
            rechnung.status
              .trim()
              .toLowerCase() ===
            "offen",
        ),
      [rechnungen],
    );

  const bezahlteRechnungen =
    useMemo(
      () =>
        rechnungen.filter(
          (rechnung) =>
            rechnung.status
              .trim()
              .toLowerCase() ===
            "bezahlt",
        ),
      [rechnungen],
    );

  const offenerRechnungsbetrag =
    useMemo(
      () =>
        offeneRechnungen.reduce(
          (
            summe,
            rechnung,
          ) =>
            summe +
            rechnung.gesamtbetrag,
          0,
        ),
      [offeneRechnungen],
    );

  const bezahlterRechnungsbetrag =
    useMemo(
      () =>
        bezahlteRechnungen.reduce(
          (
            summe,
            rechnung,
          ) =>
            summe +
            rechnung.gesamtbetrag,
          0,
        ),
      [bezahlteRechnungen],
    );

  const ueberfaelligeRechnungen =
    useMemo(
      () =>
        rechnungen.filter(
          rechnungIstUeberfaellig,
        ).length,
      [rechnungen],
    );

  function formularFeldAendern(
    feld: keyof KundenFormular,
    wert: string,
  ) {
    setFormular(
      (aktuellesFormular) => ({
        ...aktuellesFormular,
        [feld]: wert,
      }),
    );

    setFehler("");
    setErfolgsmeldung("");
  }

  async function kundeSpeichern(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!darfKundenBearbeiten) {
      setFehler(
        "Der aktuelle Benutzer darf keine Kundendaten bearbeiten.",
      );
      return;
    }

    if (!kunde || speichert) {
      return;
    }

    const nachname =
      formular.nachname.trim();

    const firma =
      formular.firma.trim();

    const email =
      formular.email.trim();

    if (!nachname && !firma) {
      setFehler(
        "Bitte gib mindestens einen Nachnamen oder eine Firma ein.",
      );
      return;
    }

    if (
      email &&
      !email.includes("@")
    ) {
      setFehler(
        "Bitte gib eine gültige E-Mail-Adresse ein.",
      );
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const aktualisierteDaten = {
        vorname:
          formular.vorname.trim() ||
          null,
        nachname:
          nachname || null,
        firma:
          firma || null,
        telefon:
          formular.telefon.trim() ||
          null,
        email:
          email || null,
        strasse:
          formular.strasse.trim() ||
          null,
        hausnummer:
          formular.hausnummer.trim() ||
          null,
        plz:
          formular.plz.trim() ||
          null,
        ort:
          formular.ort.trim() ||
          null,
        notiz:
          formular.notiz.trim() ||
          null,
      };

      const { data, error } =
        await supabase
          .from("kunden")
          .update(
            aktualisierteDaten,
          )
          .eq("id", kunde.id)
          .select(`
            id,
            kundennummer,
            vorname,
            nachname,
            firma,
            telefon,
            email,
            strasse,
            hausnummer,
            plz,
            ort,
            notiz,
            aktiv,
            erstellt_am
          `)
          .single();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      const aktualisierterKunde =
        kundeUmwandeln(
          data as DatenbankKunde,
        );

      setKunde(
        aktualisierterKunde,
      );

      setFormular(
        formularAusKunde(
          aktualisierterKunde,
        ),
      );

      setErfolgsmeldung(
        `Die Daten von ${aktualisierterKunde.kundennummer} wurden erfolgreich gespeichert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Der Kunde konnte nicht gespeichert werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Kunde konnte nicht gespeichert werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  async function kundenStatusAendern() {
    if (!darfKundenBearbeiten) {
      setFehler(
        "Der aktuelle Benutzer darf den Kundenstatus nicht ändern.",
      );
      return;
    }

    if (
      !kunde ||
      statusWirdGeaendert
    ) {
      return;
    }

    const neuerStatus =
      !kunde.aktiv;

    const aktion = neuerStatus
      ? "aktivieren"
      : "deaktivieren";

    const bestaetigt =
      window.confirm(
        `Möchtest du den Kunden ${kunde.kundennummer} wirklich ${aktion}?`,
      );

    if (!bestaetigt) {
      return;
    }

    setStatusWirdGeaendert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const { data, error } =
        await supabase
          .from("kunden")
          .update({
            aktiv: neuerStatus,
          })
          .eq("id", kunde.id)
          .select(`
            id,
            kundennummer,
            vorname,
            nachname,
            firma,
            telefon,
            email,
            strasse,
            hausnummer,
            plz,
            ort,
            notiz,
            aktiv,
            erstellt_am
          `)
          .single();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      const aktualisierterKunde =
        kundeUmwandeln(
          data as DatenbankKunde,
        );

      setKunde(
        aktualisierterKunde,
      );

      setErfolgsmeldung(
        neuerStatus
          ? `Der Kunde ${kunde.kundennummer} wurde aktiviert.`
          : `Der Kunde ${kunde.kundennummer} wurde deaktiviert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Der Kundenstatus konnte nicht geändert werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Kundenstatus konnte nicht geändert werden.",
      );
    } finally {
      setStatusWirdGeaendert(false);
    }
  }

  return (
    <ZugriffsSchutz
      berechtigung="kunden_anzeigen"
      titel="Kundendetails gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Kundendaten anzeigen."
      zurueckLink="/kunden"
      zurueckText="Zur Kundenübersicht"
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Kunden-Details
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Kundendaten, Lieferscheine
              und Rechnungen
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {darfRechnungenAnzeigen && (
              <Link
                href="/rechnungen"
                className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
              >
                Rechnungen
              </Link>
            )}

            <Link
              href="/kunden"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              Zurück zu den Kunden
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!datenGeladen && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Kunde wird aus Supabase
              geladen ...
            </p>
          </div>
        )}

        {datenGeladen &&
          fehler && (
            <div className="mb-6 rounded-2xl bg-red-100 p-6 text-red-800 shadow">
              <h2 className="text-xl font-bold">
                Vorgang fehlgeschlagen
              </h2>

              <p className="mt-2">
                {fehler}
              </p>

              {!kunde && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      window.location.reload()
                    }
                    className="rounded-xl bg-red-800 px-5 py-3 font-bold text-white"
                  >
                    Erneut versuchen
                  </button>

                  <Link
                    href="/kunden"
                    className="rounded-xl border border-red-300 bg-white px-5 py-3 font-bold text-red-800"
                  >
                    Zurück zur Übersicht
                  </Link>
                </div>
              )}
            </div>
          )}

        {datenGeladen &&
          erfolgsmeldung && (
            <div className="mb-6 rounded-2xl bg-green-100 p-6 text-green-800 shadow">
              <h2 className="text-xl font-bold">
                Änderung gespeichert
              </h2>

              <p className="mt-2">
                {erfolgsmeldung}
              </p>
            </div>
          )}

        {datenGeladen &&
          !fehler &&
          !kunde && (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <h2 className="text-xl font-bold text-slate-900">
                Kunde nicht gefunden
              </h2>

              <p className="mt-2 text-slate-600">
                Unter dieser Kundennummer
                wurde kein Kunde gefunden.
              </p>

              <Link
                href="/kunden"
                className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Zurück zu den Kunden
              </Link>
            </div>
          )}

        {datenGeladen &&
          kunde && (
            <>
              <div className="mb-6 flex flex-wrap gap-3">
                <Link
                  href="/kunden"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
                >
                  Zurück
                </Link>

                {darfRechnungenBearbeiten && (
                  <Link
                    href="/rechnung/neu"
                    className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
                  >
                    Neue Rechnung
                  </Link>
                )}

                {darfKundenBearbeiten && (
                  <button
                    type="button"
                    onClick={
                      kundenStatusAendern
                    }
                    disabled={
                      statusWirdGeaendert
                    }
                    className={`rounded-xl px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                      kunde.aktiv
                        ? "bg-red-700"
                        : "bg-green-700"
                    }`}
                  >
                    {statusWirdGeaendert
                      ? "Status wird geändert ..."
                      : kunde.aktiv
                        ? "Kunde deaktivieren"
                        : "Kunde aktivieren"}
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-600">
                      Kundennummer
                    </p>

                    <h2 className="mt-1 text-3xl font-bold text-slate-900">
                      {kunde.kundennummer}
                    </h2>

                    <p className="mt-3 text-xl font-semibold text-slate-700">
                      {kundenNameErmitteln(
                        kunde,
                      )}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Angelegt am{" "}
                      {datumMitUhrzeitFormatieren(
                        kunde.erstelltAm,
                      )}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      kunde.aktiv
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {kunde.aktiv
                      ? "Aktiv"
                      : "Inaktiv"}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Lieferscheine
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {lieferscheine.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Gesamtteile
                  </p>

                  <p className="mt-1 text-3xl font-bold text-blue-700">
                    {gesamteTeile}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Lieferscheinumsatz
                  </p>

                  <p className="mt-1 text-3xl font-bold text-green-700">
                    {betragFormatieren(
                      lieferscheinGesamtumsatz,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Rechnungen
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {rechnungen.length}
                  </p>
                </div>
              </div>

              {darfRechnungenAnzeigen && (
                <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Offener Rechnungsbetrag
                  </p>

                  <p className="mt-1 text-3xl font-bold text-orange-700">
                    {betragFormatieren(
                      offenerRechnungsbetrag,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {offeneRechnungen.length}{" "}
                    offene Rechnungen
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Bezahlter Rechnungsbetrag
                  </p>

                  <p className="mt-1 text-3xl font-bold text-green-700">
                    {betragFormatieren(
                      bezahlterRechnungsbetrag,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {bezahlteRechnungen.length}{" "}
                    bezahlte Rechnungen
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-sm text-slate-600">
                    Überfällige Rechnungen
                  </p>

                  <p
                    className={`mt-1 text-3xl font-bold ${
                      ueberfaelligeRechnungen >
                      0
                        ? "text-red-700"
                        : "text-slate-900"
                    }`}
                  >
                    {ueberfaelligeRechnungen}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Rechnungshistorie
                    </h2>

                    <p className="mt-1 text-slate-600">
                      Alle Rechnungen dieses
                      Kunden
                    </p>
                  </div>

                  {darfRechnungenBearbeiten && (
                    <Link
                      href="/rechnung/neu"
                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                    >
                      Neue Rechnung
                    </Link>
                  )}
                </div>

                {rechnungsFehler && (
                  <div className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
                    <p className="font-bold">
                      Rechnungen konnten nicht
                      geladen werden
                    </p>

                    <p className="mt-1 text-sm">
                      {rechnungsFehler}
                    </p>
                  </div>
                )}

                {historienWerdenGeladen && (
                  <div className="mt-5 rounded-xl bg-slate-100 p-4 text-slate-600">
                    Rechnungen werden geladen ...
                  </div>
                )}

                {!historienWerdenGeladen &&
                  !rechnungsFehler &&
                  rechnungen.length === 0 && (
                    <div className="mt-5 rounded-xl bg-slate-100 p-6 text-center">
                      <h3 className="font-bold text-slate-900">
                        Noch keine Rechnungen
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        Für diesen Kunden wurde
                        noch keine Rechnung
                        erstellt.
                      </p>
                    </div>
                  )}

                {!historienWerdenGeladen &&
                  rechnungen.length > 0 && (
                    <div className="mt-5 space-y-4">
                      {rechnungen.map(
                        (rechnung) => {
                          const istUeberfaellig =
                            rechnungIstUeberfaellig(
                              rechnung,
                            );

                          return (
                            <article
                              key={rechnung.id}
                              className="rounded-xl border border-slate-200 p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-900">
                                      {rechnung.nummer}
                                    </h3>

                                    <span
                                      className={`rounded-full px-3 py-1 text-sm font-semibold ${rechnungsStatusKlassenErmitteln(
                                        rechnung.status,
                                      )}`}
                                    >
                                      {rechnungsStatusTextFormatieren(
                                        rechnung.status,
                                      )}
                                    </span>

                                    {istUeberfaellig && (
                                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                                        Überfällig
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                                    <div>
                                      <p className="text-slate-500">
                                        Rechnungsdatum
                                      </p>

                                      <p className="mt-1 font-semibold text-slate-900">
                                        {datumFormatieren(
                                          rechnung.rechnungsdatum,
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-slate-500">
                                        Fällig am
                                      </p>

                                      <p
                                        className={`mt-1 font-semibold ${
                                          istUeberfaellig
                                            ? "text-red-700"
                                            : "text-slate-900"
                                        }`}
                                      >
                                        {datumFormatieren(
                                          rechnung.faelligAm,
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-slate-500">
                                        Lieferscheine
                                      </p>

                                      <p className="mt-1 font-semibold text-slate-900">
                                        {
                                          rechnung.anzahlLieferscheine
                                        }
                                      </p>
                                    </div>
                                  </div>

                                  {rechnung.bezahltAm && (
                                    <p className="mt-3 text-sm font-semibold text-green-700">
                                      Bezahlt am{" "}
                                      {datumMitUhrzeitFormatieren(
                                        rechnung.bezahltAm,
                                      )}
                                    </p>
                                  )}

                                  {rechnung.notiz && (
                                    <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                                      {rechnung.notiz}
                                    </p>
                                  )}
                                </div>

                                <div className="flex min-w-[190px] flex-col items-end gap-4">
                                  <p className="text-2xl font-bold text-slate-900">
                                    {betragFormatieren(
                                      rechnung.gesamtbetrag,
                                    )}
                                  </p>

                                  <Link
                                    href={`/rechnung/${encodeURIComponent(
                                      rechnung.nummer,
                                    )}`}
                                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                                  >
                                    Rechnung öffnen
                                  </Link>
                                </div>
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  )}
              </div>
                </>
              )}

              <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Lieferscheinhistorie
                  </h2>

                  <p className="mt-1 text-slate-600">
                    Alle mit diesem Kunden
                    verknüpften Lieferscheine
                  </p>
                </div>

                {lieferscheinFehler && (
                  <div className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
                    <p className="font-bold">
                      Lieferscheine konnten nicht
                      geladen werden
                    </p>

                    <p className="mt-1 text-sm">
                      {lieferscheinFehler}
                    </p>
                  </div>
                )}

                {historienWerdenGeladen && (
                  <div className="mt-5 rounded-xl bg-slate-100 p-4 text-slate-600">
                    Lieferscheine werden
                    geladen ...
                  </div>
                )}

                {!historienWerdenGeladen &&
                  !lieferscheinFehler &&
                  lieferscheine.length ===
                    0 && (
                    <div className="mt-5 rounded-xl bg-slate-100 p-6 text-center">
                      <h3 className="font-bold text-slate-900">
                        Noch keine
                        Lieferscheine
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        Diesem Kunden wurde
                        noch kein Lieferschein
                        zugeordnet.
                      </p>
                    </div>
                  )}

                {!historienWerdenGeladen &&
                  lieferscheine.length >
                    0 && (
                    <div className="mt-5 space-y-4">
                      {lieferscheine.map(
                        (lieferschein) => (
                          <article
                            key={
                              lieferschein.id
                            }
                            className="rounded-xl border border-slate-200 p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-xl font-bold text-slate-900">
                                    {
                                      lieferschein.nummer
                                    }
                                  </h3>

                                  <span
                                    className={`rounded-full px-3 py-1 text-sm font-semibold ${lieferscheinStatusKlassenErmitteln(
                                      lieferschein.status,
                                    )}`}
                                  >
                                    {
                                      lieferschein.status
                                    }
                                  </span>
                                </div>

                                <p className="mt-2 text-sm text-slate-600">
                                  {
                                    lieferschein.annahmestelle
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  Erstellt am{" "}
                                  {datumMitUhrzeitFormatieren(
                                    lieferschein.erstelltAm,
                                  )}
                                </p>
                              </div>

                              <Link
                                href={`/lieferschein/${encodeURIComponent(
                                  lieferschein.nummer,
                                )}`}
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                              >
                                Lieferschein öffnen
                              </Link>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl bg-slate-100 p-4">
                                <p className="text-sm text-slate-600">
                                  Gesamtteile
                                </p>

                                <p className="mt-1 text-xl font-bold text-slate-900">
                                  {
                                    lieferschein.gesamtteile
                                  }
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-100 p-4">
                                <p className="text-sm text-slate-600">
                                  Gesamtbetrag
                                </p>

                                <p className="mt-1 text-xl font-bold text-slate-900">
                                  {betragFormatieren(
                                    lieferschein.gesamtbetrag,
                                  )}
                                </p>
                              </div>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
              </div>

              {darfKundenBearbeiten && (
              <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                <form
                  onSubmit={
                    kundeSpeichern
                  }
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Kundendaten bearbeiten
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Persönliche Daten,
                      Kontakt und Anschrift
                      ändern
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Persönliche Daten
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Vorname
                        </span>

                        <input
                          type="text"
                          value={
                            formular.vorname
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "vorname",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Nachname
                        </span>

                        <input
                          type="text"
                          value={
                            formular.nachname
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "nachname",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-sm font-medium text-slate-700">
                        Firma
                      </span>

                      <input
                        type="text"
                        value={
                          formular.firma
                        }
                        onChange={(
                          event,
                        ) =>
                          formularFeldAendern(
                            "firma",
                            event.target
                              .value,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      />
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Kontakt
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Telefon
                        </span>

                        <input
                          type="tel"
                          value={
                            formular.telefon
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "telefon",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          E-Mail
                        </span>

                        <input
                          type="email"
                          value={
                            formular.email
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "email",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Anschrift
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Straße
                        </span>

                        <input
                          type="text"
                          value={
                            formular.strasse
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "strasse",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Hausnummer
                        </span>

                        <input
                          type="text"
                          value={
                            formular.hausnummer
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "hausnummer",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          PLZ
                        </span>

                        <input
                          type="text"
                          value={
                            formular.plz
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "plz",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">
                          Ort
                        </span>

                        <input
                          type="text"
                          value={
                            formular.ort
                          }
                          onChange={(
                            event,
                          ) =>
                            formularFeldAendern(
                              "ort",
                              event.target
                                .value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <label className="block">
                      <span className="text-xl font-bold text-slate-900">
                        Notiz
                      </span>

                      <textarea
                        rows={5}
                        value={
                          formular.notiz
                        }
                        onChange={(
                          event,
                        ) =>
                          formularFeldAendern(
                            "notiz",
                            event.target
                              .value,
                          )
                        }
                        className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                      />
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <button
                      type="submit"
                      disabled={speichert}
                      className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {speichert
                        ? "Änderungen werden gespeichert ..."
                        : "Änderungen speichern"}
                    </button>
                  </div>
                </form>
              </div>
              )}
            </>
          )}
      </section>
      </main>
    </ZugriffsSchutz>
  );
}