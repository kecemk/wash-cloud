"use client";

import Link from "next/link";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useBenutzer } from "../context/BenutzerContext";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

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

function kundenNummerFormatieren(
  laufendeNummer: number,
) {
  return `KU-${String(laufendeNummer).padStart(6, "0")}`;
}

function nummerAusKundenNummer(
  kundennummer: string,
) {
  const nummer = Number(
    kundennummer.replace("KU-", ""),
  );

  return Number.isInteger(nummer) ? nummer : 0;
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

function adresseErmitteln(kunde: Kunde) {
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

  return [strasse, ort]
    .filter(Boolean)
    .join(", ");
}

export default function KundenPage() {
  const {
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const darfKundenBearbeiten =
    hatAktuellerBenutzerBerechtigung(
      "kunden_bearbeiten",
    );

  const [kunden, setKunden] =
    useState<Kunde[]>([]);

  const [formular, setFormular] =
    useState<KundenFormular>(
      leeresFormular,
    );

  const [suchbegriff, setSuchbegriff] =
    useState("");

  const [laedt, setLaedt] =
    useState(true);

  const [speichert, setSpeichert] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const [
    erfolgsmeldung,
    setErfolgsmeldung,
  ] = useState("");

  useEffect(() => {
    void kundenLaden();
  }, []);

  async function kundenLaden() {
    setLaedt(true);
    setFehler("");

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
            email,
            strasse,
            hausnummer,
            plz,
            ort,
            notiz,
            aktiv,
            erstellt_am
          `)
          .order("erstellt_am", {
            ascending: false,
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

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Kunden konnten nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }

  async function naechsteKundenNummerErmitteln() {
    const { data, error } =
      await supabase
        .from("kunden")
        .select("kundennummer")
        .order("kundennummer", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const hoechsteNummer =
      data?.kundennummer
        ? nummerAusKundenNummer(
            data.kundennummer,
          )
        : 0;

    return kundenNummerFormatieren(
      hoechsteNummer + 1,
    );
  }

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
        "Der aktuelle Benutzer darf keine Kunden anlegen.",
      );
      return;
    }

    if (speichert) {
      return;
    }

    const nachname =
      formular.nachname.trim();

    const firma =
      formular.firma.trim();

    if (!nachname && !firma) {
      setFehler(
        "Bitte gib mindestens einen Nachnamen oder eine Firma ein.",
      );
      return;
    }

    if (
      formular.email.trim() &&
      !formular.email.includes("@")
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
      const kundennummer =
        await naechsteKundenNummerErmitteln();

      const { error } =
        await supabase
          .from("kunden")
          .insert({
            kundennummer,
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
              formular.email.trim() ||
              null,
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
            aktiv: true,
          });

      if (error) {
        throw new Error(error.message);
      }

      setFormular(leeresFormular);

      setErfolgsmeldung(
        `Der Kunde ${kundennummer} wurde erfolgreich angelegt.`,
      );

      await kundenLaden();

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
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Der Kunde konnte nicht gespeichert werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  const gefilterteKunden =
    useMemo(() => {
      const normalisierterSuchbegriff =
        suchbegriff
          .trim()
          .toLowerCase();

      if (!normalisierterSuchbegriff) {
        return kunden;
      }

      return kunden.filter((kunde) => {
        const suchtext = [
          kunde.kundennummer,
          kunde.vorname,
          kunde.nachname,
          kunde.firma,
          kunde.telefon,
          kunde.email,
          kunde.strasse,
          kunde.hausnummer,
          kunde.plz,
          kunde.ort,
        ]
          .join(" ")
          .toLowerCase();

        return suchtext.includes(
          normalisierterSuchbegriff,
        );
      });
    }, [kunden, suchbegriff]);

  const aktiveKunden = useMemo(
    () =>
      kunden.filter(
        (kunde) => kunde.aktiv,
      ).length,
    [kunden],
  );

  return (
    <ZugriffsSchutz
      berechtigung="kunden_anzeigen"
      titel="Kundenverwaltung gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Kundendaten anzeigen."
    >
      <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Kundenverwaltung
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Kunden anlegen und verwalten
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/lieferungen"
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white"
            >
              Lieferungen
            </Link>

            <Link
              href="/annahmestelle"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              Neue Kasse öffnen
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {erfolgsmeldung && (
          <div className="mb-6 rounded-xl bg-green-100 p-5 text-green-800">
            <p className="font-bold">
              Kunde gespeichert
            </p>

            <p className="mt-1">
              {erfolgsmeldung}
            </p>
          </div>
        )}

        {fehler && (
          <div className="mb-6 rounded-xl bg-red-100 p-5 text-red-800">
            <p className="font-bold">
              Vorgang fehlgeschlagen
            </p>

            <p className="mt-1">
              {fehler}
            </p>
          </div>
        )}

        <div
          className={`grid gap-8 ${
            darfKundenBearbeiten
              ? "xl:grid-cols-[420px_1fr]"
              : ""
          }`}
        >
          {darfKundenBearbeiten && (
          <aside className="h-fit rounded-2xl bg-white p-6 shadow xl:sticky xl:top-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Neuer Kunde
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Mindestens Nachname oder Firma
              ist erforderlich.
            </p>

            <form
              onSubmit={kundeSpeichern}
              className="mt-6 space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Vorname
                  </span>

                  <input
                    type="text"
                    value={formular.vorname}
                    onChange={(event) =>
                      formularFeldAendern(
                        "vorname",
                        event.target.value,
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
                    value={formular.nachname}
                    onChange={(event) =>
                      formularFeldAendern(
                        "nachname",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Firma
                </span>

                <input
                  type="text"
                  value={formular.firma}
                  onChange={(event) =>
                    formularFeldAendern(
                      "firma",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Telefon
                  </span>

                  <input
                    type="tel"
                    value={formular.telefon}
                    onChange={(event) =>
                      formularFeldAendern(
                        "telefon",
                        event.target.value,
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
                    value={formular.email}
                    onChange={(event) =>
                      formularFeldAendern(
                        "email",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Straße
                  </span>

                  <input
                    type="text"
                    value={formular.strasse}
                    onChange={(event) =>
                      formularFeldAendern(
                        "strasse",
                        event.target.value,
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
                    onChange={(event) =>
                      formularFeldAendern(
                        "hausnummer",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    PLZ
                  </span>

                  <input
                    type="text"
                    value={formular.plz}
                    onChange={(event) =>
                      formularFeldAendern(
                        "plz",
                        event.target.value,
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
                    value={formular.ort}
                    onChange={(event) =>
                      formularFeldAendern(
                        "ort",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Notiz
                </span>

                <textarea
                  rows={4}
                  value={formular.notiz}
                  onChange={(event) =>
                    formularFeldAendern(
                      "notiz",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <button
                type="submit"
                disabled={speichert}
                className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {speichert
                  ? "Kunde wird gespeichert ..."
                  : "Kunde anlegen"}
              </button>
            </form>
          </aside>
          )}

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow">
                <p className="text-sm text-slate-600">
                  Kunden insgesamt
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {kunden.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <p className="text-sm text-slate-600">
                  Aktive Kunden
                </p>

                <p className="mt-1 text-3xl font-bold text-green-700">
                  {aktiveKunden}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Kunden suchen
                </span>

                <input
                  type="search"
                  value={suchbegriff}
                  onChange={(event) =>
                    setSuchbegriff(
                      event.target.value,
                    )
                  }
                  placeholder="Name, Firma, Kundennummer, Telefon oder Ort"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Kunden
                </h2>

                <p className="mt-1 text-slate-600">
                  {gefilterteKunden.length} angezeigte
                  Kunden
                </p>
              </div>

              {laedt && (
                <div className="rounded-2xl bg-white p-6 shadow">
                  <p className="text-slate-600">
                    Kunden werden aus Supabase geladen ...
                  </p>
                </div>
              )}

              {!laedt &&
                kunden.length === 0 && (
                  <div className="rounded-2xl bg-white p-8 text-center shadow">
                    <h3 className="text-xl font-bold text-slate-900">
                      Noch keine Kunden
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Lege links den ersten Kunden an.
                    </p>
                  </div>
                )}

              {!laedt &&
                kunden.length > 0 &&
                gefilterteKunden.length === 0 && (
                  <div className="rounded-2xl bg-white p-8 text-center shadow">
                    <h3 className="text-xl font-bold text-slate-900">
                      Keine Kunden gefunden
                    </h3>

                    <p className="mt-2 text-slate-600">
                      Ändere den Suchbegriff und
                      versuche es erneut.
                    </p>
                  </div>
                )}

              <div className="space-y-4">
                {!laedt &&
                  gefilterteKunden.map(
                    (kunde) => {
                      const adresse =
                        adresseErmitteln(
                          kunde,
                        );

                      return (
                        <article
                          key={kunde.id}
                          className="rounded-2xl bg-white p-6 shadow"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-bold text-slate-900">
                                  {kundenNameErmitteln(
                                    kunde,
                                  )}
                                </h3>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                                  {
                                    kunde.kundennummer
                                  }
                                </span>
                              </div>

                              {kunde.firma &&
                                (kunde.vorname ||
                                  kunde.nachname) && (
                                  <p className="mt-1 text-slate-600">
                                    Ansprechpartner:{" "}
                                    {[
                                      kunde.vorname,
                                      kunde.nachname,
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  </p>
                                )}

                              {adresse && (
                                <p className="mt-2 text-slate-600">
                                  {adresse}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                                {kunde.telefon && (
                                  <a
                                    href={`tel:${kunde.telefon}`}
                                    className="font-semibold text-blue-700 hover:underline"
                                  >
                                    {
                                      kunde.telefon
                                    }
                                  </a>
                                )}

                                {kunde.email && (
                                  <a
                                    href={`mailto:${kunde.email}`}
                                    className="font-semibold text-blue-700 hover:underline"
                                  >
                                    {kunde.email}
                                  </a>
                                )}
                              </div>

                              {kunde.notiz && (
                                <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                                  {kunde.notiz}
                                </p>
                              )}

                              <p className="mt-4 text-sm text-slate-500">
                                Erstellt am{" "}
                                {datumFormatieren(
                                  kunde.erstelltAm,
                                )}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                  kunde.aktiv
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {kunde.aktiv
                                  ? "Aktiv"
                                  : "Inaktiv"}
                              </span>

                              <Link
                                href={`/kunde/${encodeURIComponent(
                                  kunde.kundennummer,
                                )}`}
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                              >
                                Kunde öffnen
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    },
                  )}
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>
    </ZugriffsSchutz>
  );
}