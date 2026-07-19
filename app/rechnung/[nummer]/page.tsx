"use client";

import Link from "next/link";
import ZugriffsSchutz from "../../components/ZugriffsSchutz";
import { useBenutzer } from "../../context/BenutzerContext";
import { useParams } from "next/navigation";
import {
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
};

type DatenbankAnnahmestelle = {
  name: string;
};

type DatenbankLieferschein = {
  id: number;
  annahmestelle_id: number | null;
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
};

type DatenbankRechnungLieferschein = {
  id: number;
  lieferschein_id: number;
  lieferscheine:
    | DatenbankLieferschein
    | DatenbankLieferschein[]
    | null;
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
  kunden:
    | DatenbankKunde
    | DatenbankKunde[]
    | null;
  rechnung_lieferscheine:
    | DatenbankRechnungLieferschein[]
    | null;
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
};

type Lieferschein = {
  id: number;
  annahmestelleId: number | null;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  gesamtteile: number;
  erstelltAm: string;
  fertiggestelltAm: string | null;
  annahmestelle: string;
};

type Rechnung = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  rechnungsdatum: string;
  faelligAm: string | null;
  bezahltAm: string | null;
  notiz: string;
  erstelltAm: string;
  kunde: Kunde | null;
  lieferscheine: Lieferschein[];
};

function einzelnesElementErmitteln<T>(
  wert: T | T[] | null,
): T | null {
  if (Array.isArray(wert)) {
    return wert[0] ?? null;
  }

  return wert;
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
    email: daten.email ?? "",
    strasse: daten.strasse ?? "",
    hausnummer: daten.hausnummer ?? "",
    plz: daten.plz ?? "",
    ort: daten.ort ?? "",
  };
}

function lieferscheinUmwandeln(
  daten: DatenbankLieferschein,
): Lieferschein {
  const annahmestellenDaten =
    einzelnesElementErmitteln(
      daten.annahmestellen,
    );

  return {
    id: daten.id,
    annahmestelleId:
      daten.annahmestelle_id,
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
      annahmestellenDaten?.name ??
      "Unbekannte Annahmestelle",
  };
}

function rechnungUmwandeln(
  daten: DatenbankRechnung,
): Rechnung {
  const kundenDaten =
    einzelnesElementErmitteln(
      daten.kunden,
    );

  const lieferscheine =
    daten.rechnung_lieferscheine
      ?.map((verknuepfung) =>
        einzelnesElementErmitteln(
          verknuepfung.lieferscheine,
        ),
      )
      .filter(
        (
          lieferschein,
        ): lieferschein is DatenbankLieferschein =>
          lieferschein !== null,
      )
      .map(lieferscheinUmwandeln) ?? [];

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
    kunde: kundenDaten
      ? kundeUmwandeln(kundenDaten)
      : null,
    lieferscheine,
  };
}

function kundenNameErmitteln(
  kunde: Kunde | null,
) {
  if (!kunde) {
    return "Unbekannter Kunde";
  }

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

function ansprechpartnerErmitteln(
  kunde: Kunde | null,
) {
  if (!kunde) {
    return "";
  }

  return [
    kunde.vorname,
    kunde.nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function adresseErmitteln(
  kunde: Kunde | null,
) {
  if (!kunde) {
    return [];
  }

  const strasse = [
    kunde.strasse,
    kunde.hausnummer,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const ort = [
    kunde.plz,
    kunde.ort,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [strasse, ort].filter(Boolean);
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

function statusTextFormatieren(
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

function statusKlassenErmitteln(
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
    normalisierterStatus === "offen"
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
  rechnung: Rechnung,
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

export default function RechnungDetailPage() {
  const {
    aktuellerBenutzer,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const darfRechnungenBearbeiten =
    hatAktuellerBenutzerBerechtigung(
      "rechnungen_bearbeiten",
    );

  const params = useParams<{
    nummer: string;
  }>();

  const [
    rechnung,
    setRechnung,
  ] = useState<Rechnung | null>(null);

  const [
    datenGeladen,
    setDatenGeladen,
  ] = useState(false);

  const [
    statusWirdGeaendert,
    setStatusWirdGeaendert,
  ] = useState(false);

  const [fehler, setFehler] =
    useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  useEffect(() => {
    let istAktiv = true;

    async function rechnungLaden() {
      setDatenGeladen(false);
      setFehler("");
      setErfolgsmeldung("");

      try {
        const gesuchteNummer =
          decodeURIComponent(
            params.nummer,
          );

        const { data, error } =
          await supabase
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
              kunden (
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
                ort
              ),
              rechnung_lieferscheine (
                id,
                lieferschein_id,
                lieferscheine (
                  id,
                  annahmestelle_id,
                  nummer,
                  status,
                  gesamtbetrag,
                  gesamtteile,
                  erstellt_am,
                  fertiggestellt_am,
                  annahmestellen (
                    name
                  )
                )
              )
            `)
            .eq(
              "nummer",
              gesuchteNummer,
            )
            .single();

        if (!istAktiv) {
          return;
        }

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!data) {
          setRechnung(null);
          return;
        }

        const geladeneRechnung =
          rechnungUmwandeln(
            data as DatenbankRechnung,
          );

        if (
          aktuellerBenutzer?.rolle ===
          "annahmestelle"
        ) {
          const annahmestellenId =
            aktuellerBenutzer.annahmestelleId;

          const status =
            geladeneRechnung.status
              .trim()
              .toLowerCase();

          const istFreigegeben =
            status !== "entwurf";

          const hatLieferscheine =
            geladeneRechnung.lieferscheine
              .length > 0;

          const alleLieferscheineSindEigen =
            hatLieferscheine &&
            annahmestellenId !== null &&
            geladeneRechnung.lieferscheine.every(
              (lieferschein) =>
                lieferschein.annahmestelleId ===
                annahmestellenId,
            );

          if (
            !istFreigegeben ||
            !alleLieferscheineSindEigen
          ) {
            setRechnung(null);
            setFehler(
              "Diese Rechnung ist für die aktuelle Annahmestelle nicht freigegeben.",
            );
            return;
          }
        }

        setRechnung(
          geladeneRechnung,
        );
      } catch (unbekannterFehler) {
        console.error(
          "Die Rechnung konnte nicht geladen werden:",
          unbekannterFehler,
        );

        if (!istAktiv) {
          return;
        }

        setFehler(
          unbekannterFehler instanceof
            Error
            ? unbekannterFehler.message
            : "Die Rechnung konnte nicht geladen werden.",
        );

        setRechnung(null);
      } finally {
        if (istAktiv) {
          setDatenGeladen(true);
        }
      }
    }

    void rechnungLaden();

    return () => {
      istAktiv = false;
    };
  }, [params.nummer, aktuellerBenutzer]);

  const berechneterGesamtbetrag =
    useMemo(
      () =>
        rechnung?.lieferscheine.reduce(
          (
            summe,
            lieferschein,
          ) =>
            summe +
            lieferschein.gesamtbetrag,
          0,
        ) ?? 0,
      [rechnung],
    );

  const gesamteTeile = useMemo(
    () =>
      rechnung?.lieferscheine.reduce(
        (
          summe,
          lieferschein,
        ) =>
          summe +
          lieferschein.gesamtteile,
        0,
      ) ?? 0,
    [rechnung],
  );

  async function alsBezahltMarkieren() {
    if (
      !darfRechnungenBearbeiten ||
      !rechnung ||
      statusWirdGeaendert ||
      rechnung.status
        .trim()
        .toLowerCase() === "bezahlt"
    ) {
      return;
    }

    const bestaetigt =
      window.confirm(
        `Möchtest du die Rechnung ${rechnung.nummer} wirklich als bezahlt markieren?`,
      );

    if (!bestaetigt) {
      return;
    }

    setStatusWirdGeaendert(true);
    setFehler("");
    setErfolgsmeldung("");

    try {
      const bezahltAm =
        new Date().toISOString();

      const { data, error } =
        await supabase
          .from("rechnungen")
          .update({
            status: "bezahlt",
            bezahlt_am: bezahltAm,
          })
          .eq("id", rechnung.id)
          .select(`
            id,
            status,
            bezahlt_am
          `)
          .single();

      if (error || !data) {
        throw new Error(
          error?.message ??
            "Der Rechnungsstatus konnte nicht geändert werden.",
        );
      }

      setRechnung(
        (aktuelleRechnung) =>
          aktuelleRechnung
            ? {
                ...aktuelleRechnung,
                status: data.status,
                bezahltAm:
                  data.bezahlt_am,
              }
            : null,
      );

      setErfolgsmeldung(
        `Die Rechnung ${rechnung.nummer} wurde als bezahlt markiert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (unbekannterFehler) {
      console.error(
        "Der Rechnungsstatus konnte nicht geändert werden:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof
          Error
          ? unbekannterFehler.message
          : "Der Rechnungsstatus konnte nicht geändert werden.",
      );
    } finally {
      setStatusWirdGeaendert(false);
    }
  }

  function rechnungDrucken() {
    window.print();
  }

  const istBezahlt =
    rechnung?.status
      .trim()
      .toLowerCase() === "bezahlt";

  const istStorniert =
    rechnung?.status
      .trim()
      .toLowerCase() === "storniert";

  const istUeberfaellig =
    rechnung
      ? rechnungIstUeberfaellig(
          rechnung,
        )
      : false;

  const kundenAdresse =
    adresseErmitteln(
      rechnung?.kunde ?? null,
    );

  const ansprechpartner =
    ansprechpartnerErmitteln(
      rechnung?.kunde ?? null,
    );

  return (
    <ZugriffsSchutz
      berechtigung="rechnungen_anzeigen"
      titel="Rechnungsdetails gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Rechnungsdetails anzeigen."
      zurueckLink="/rechnungen"
      zurueckText="Zur Rechnungsübersicht"
    >
      <main className="min-h-screen bg-slate-50 print:bg-white">
      <header className="bg-slate-950 px-6 py-5 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Rechnungsdetails
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Rechnung ansehen, drucken
              und verwalten
            </p>
          </div>

          <Link
            href="/rechnungen"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Zurück zu den Rechnungen
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        {!datenGeladen && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-slate-600">
              Rechnung wird aus Supabase
              geladen ...
            </p>
          </div>
        )}

        {datenGeladen &&
          fehler && (
            <div className="mb-6 rounded-2xl bg-red-100 p-6 text-red-800 shadow print:hidden">
              <h2 className="text-xl font-bold">
                Vorgang fehlgeschlagen
              </h2>

              <p className="mt-2">
                {fehler}
              </p>

              {!rechnung && (
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
                    href="/rechnungen"
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
            <div className="mb-6 rounded-2xl bg-green-100 p-6 text-green-800 shadow print:hidden">
              <h2 className="text-xl font-bold">
                Status geändert
              </h2>

              <p className="mt-2">
                {erfolgsmeldung}
              </p>
            </div>
          )}

        {datenGeladen &&
          !fehler &&
          !rechnung && (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <h2 className="text-xl font-bold text-slate-900">
                Rechnung nicht gefunden
              </h2>

              <p className="mt-2 text-slate-600">
                Unter dieser Rechnungsnummer
                wurde keine Rechnung gefunden.
              </p>

              <Link
                href="/rechnungen"
                className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Zurück zu den Rechnungen
              </Link>
            </div>
          )}

        {datenGeladen &&
          rechnung && (
            <>
              <div className="mb-6 flex flex-wrap gap-3 print:hidden">
                <Link
                  href="/rechnungen"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
                >
                  Zurück
                </Link>

                <button
                  type="button"
                  onClick={
                    rechnungDrucken
                  }
                  className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white"
                >
                  Rechnung drucken
                </button>

                {darfRechnungenBearbeiten &&
                  !istBezahlt &&
                  !istStorniert && (
                    <button
                      type="button"
                      onClick={
                        alsBezahltMarkieren
                      }
                      disabled={
                        statusWirdGeaendert
                      }
                      className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusWirdGeaendert
                        ? "Status wird geändert ..."
                        : "Als bezahlt markieren"}
                    </button>
                  )}
              </div>

              <article className="rounded-2xl bg-white p-8 shadow print:rounded-none print:p-8 print:shadow-none">
                <div className="flex flex-wrap items-start justify-between gap-8">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                      Wash Cloud
                    </p>

                    <h1 className="mt-2 text-4xl font-bold text-slate-950">
                      Rechnung
                    </h1>

                    <p className="mt-2 text-xl font-bold text-slate-700">
                      {rechnung.nummer}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span
                      className={`inline-block rounded-full px-4 py-2 text-sm font-bold ${statusKlassenErmitteln(
                        rechnung.status,
                      )}`}
                    >
                      {statusTextFormatieren(
                        rechnung.status,
                      )}
                    </span>

                    {istUeberfaellig && (
                      <p className="mt-2 font-bold text-red-700">
                        Rechnung ist überfällig
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-10 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Rechnungsempfänger
                    </p>

                    <p className="mt-3 text-xl font-bold text-slate-900">
                      {kundenNameErmitteln(
                        rechnung.kunde,
                      )}
                    </p>

                    {rechnung.kunde && (
                      <p className="mt-1 text-sm text-slate-600">
                        {
                          rechnung.kunde
                            .kundennummer
                        }
                      </p>
                    )}

                    {rechnung.kunde?.firma &&
                      ansprechpartner && (
                        <p className="mt-3 text-slate-700">
                          Ansprechpartner:{" "}
                          {ansprechpartner}
                        </p>
                      )}

                    {kundenAdresse.length >
                      0 && (
                      <div className="mt-3 text-slate-700">
                        {kundenAdresse.map(
                          (zeile) => (
                            <p key={zeile}>
                              {zeile}
                            </p>
                          ),
                        )}
                      </div>
                    )}

                    {rechnung.kunde
                      ?.telefon && (
                      <p className="mt-3 text-sm text-slate-600">
                        Telefon:{" "}
                        {
                          rechnung.kunde
                            .telefon
                        }
                      </p>
                    )}

                    {rechnung.kunde?.email && (
                      <p className="mt-1 text-sm text-slate-600">
                        E-Mail:{" "}
                        {rechnung.kunde.email}
                      </p>
                    )}
                  </div>

                  <div className="md:text-right">
                    <div>
                      <p className="text-sm text-slate-500">
                        Rechnungsdatum
                      </p>

                      <p className="mt-1 font-bold text-slate-900">
                        {datumFormatieren(
                          rechnung.rechnungsdatum,
                        )}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-slate-500">
                        Fällig am
                      </p>

                      <p
                        className={`mt-1 font-bold ${
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

                    {rechnung.bezahltAm && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-500">
                          Bezahlt am
                        </p>

                        <p className="mt-1 font-bold text-green-700">
                          {datumMitUhrzeitFormatieren(
                            rechnung.bezahltAm,
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Abgerechnete Lieferscheine
                  </h2>

                  {rechnung.lieferscheine
                    .length === 0 ? (
                    <div className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
                      Dieser Rechnung sind keine
                      Lieferscheine zugeordnet.
                    </div>
                  ) : (
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b-2 border-slate-300 text-sm text-slate-600">
                            <th className="px-3 py-3">
                              Lieferschein
                            </th>

                            <th className="px-3 py-3">
                              Annahmestelle
                            </th>

                            <th className="px-3 py-3">
                              Datum
                            </th>

                            <th className="px-3 py-3 text-right">
                              Teile
                            </th>

                            <th className="px-3 py-3 text-right">
                              Betrag
                            </th>

                            <th className="px-3 py-3 text-right print:hidden">
                              Aktion
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {rechnung.lieferscheine.map(
                            (
                              lieferschein,
                            ) => (
                              <tr
                                key={
                                  lieferschein.id
                                }
                                className="border-b border-slate-200"
                              >
                                <td className="px-3 py-4 font-bold text-slate-900">
                                  {
                                    lieferschein.nummer
                                  }
                                </td>

                                <td className="px-3 py-4 text-slate-700">
                                  {
                                    lieferschein.annahmestelle
                                  }
                                </td>

                                <td className="px-3 py-4 text-slate-700">
                                  {datumFormatieren(
                                    lieferschein.erstelltAm,
                                  )}
                                </td>

                                <td className="px-3 py-4 text-right font-semibold text-slate-900">
                                  {
                                    lieferschein.gesamtteile
                                  }
                                </td>

                                <td className="px-3 py-4 text-right font-bold text-slate-900">
                                  {betragFormatieren(
                                    lieferschein.gesamtbetrag,
                                  )}
                                </td>

                                <td className="px-3 py-4 text-right print:hidden">
                                  <Link
                                    href={`/lieferschein/${encodeURIComponent(
                                      lieferschein.nummer,
                                    )}`}
                                    className="font-bold text-blue-700 hover:underline"
                                  >
                                    Öffnen
                                  </Link>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-10 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-100 p-5">
                    <p className="text-sm text-slate-600">
                      Lieferscheine
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {
                        rechnung.lieferscheine
                          .length
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-5">
                    <p className="text-sm text-slate-600">
                      Gesamtteile
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      {gesamteTeile}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-5 text-white">
                    <p className="text-sm text-slate-300">
                      Rechnungsbetrag
                    </p>

                    <p className="mt-1 text-3xl font-bold">
                      {betragFormatieren(
                        rechnung.gesamtbetrag,
                      )}
                    </p>
                  </div>
                </div>

                {Math.abs(
                  berechneterGesamtbetrag -
                    rechnung.gesamtbetrag,
                ) > 0.01 && (
                  <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-yellow-800 print:hidden">
                    <p className="font-bold">
                      Hinweis
                    </p>

                    <p className="mt-1 text-sm">
                      Die Summe der verbundenen
                      Lieferscheine stimmt nicht
                      mit dem gespeicherten
                      Rechnungsbetrag überein.
                    </p>
                  </div>
                )}

                {rechnung.notiz && (
                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <h2 className="text-lg font-bold text-slate-900">
                      Notiz
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-slate-700">
                      {rechnung.notiz}
                    </p>
                  </div>
                )}

                <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
                  <p>
                    Erstellt am{" "}
                    {datumMitUhrzeitFormatieren(
                      rechnung.erstelltAm,
                    )}
                  </p>
                </div>
              </article>
            </>
          )}
      </section>
      </main>
    </ZugriffsSchutz>
  );
}