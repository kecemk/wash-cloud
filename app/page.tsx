"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBenutzer } from "./context/BenutzerContext";
import { supabase } from "./lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
  adresse: string | null;
  telefon: string | null;
  aktiv: boolean;
};

type LagerartikelBestand = {
  bestand: number;
  mindestbestand: number;
};

type ChatNachrichtUebersicht = {
  annahmestelle_id: number;
  absender_benutzer_id: number;
  erstellt_am: string;
};

type ChatLesestatusUebersicht = {
  annahmestelle_id: number;
  zuletzt_gelesen_am: string;
};

type DatenbankLieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number | string | null;
  gesamtteile: number | null;
  erstellt_am: string;
  fertiggestellt_am: string | null;
  annahmestellen:
    | { name: string }
    | { name: string }[]
    | null;
};

type LetzterLieferschein = {
  id: number;
  nummer: string;
  status: string;
  gesamtbetrag: number;
  gesamtteile: number;
  datum: string;
  annahmestelle: string;
};

type DatenbankRechnung = {
  id: number;
  status: string;
  gesamtbetrag: number | string | null;
  faellig_am: string | null;
};

type DashboardKennzahlen = {
  umsatzHeute: number;
  umsatzMonat: number;
  lieferscheineHeute: number;
  lieferscheineMonat: number;
  fertigeLieferscheine: number;
  gelieferteLieferscheine: number;
  lieferungenGesamt: number;
  kundenGesamt: number;
  rechnungenGesamt: number;
  offeneRechnungen: number;
  ueberfaelligeRechnungen: number;
  offenerRechnungsbetrag: number;
};

const leereKennzahlen: DashboardKennzahlen = {
  umsatzHeute: 0,
  umsatzMonat: 0,
  lieferscheineHeute: 0,
  lieferscheineMonat: 0,
  fertigeLieferscheine: 0,
  gelieferteLieferscheine: 0,
  lieferungenGesamt: 0,
  kundenGesamt: 0,
  rechnungenGesamt: 0,
  offeneRechnungen: 0,
  ueberfaelligeRechnungen: 0,
  offenerRechnungsbetrag: 0,
};

function zahlUmwandeln(
  wert: number | string | null | undefined,
) {
  const zahl =
    typeof wert === "number"
      ? wert
      : Number(String(wert ?? "0").replace(",", "."));

  return Number.isFinite(zahl) ? zahl : 0;
}

function geldFormatieren(betrag: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(betrag);
}

function datumFormatieren(datum: string) {
  const wert = new Date(datum);

  if (Number.isNaN(wert.getTime())) {
    return "Unbekanntes Datum";
  }

  return wert.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function annahmestellenNameErmitteln(
  annahmestellen:
    | { name: string }
    | { name: string }[]
    | null,
) {
  if (Array.isArray(annahmestellen)) {
    return annahmestellen[0]?.name ?? "Unbekannt";
  }

  return annahmestellen?.name ?? "Unbekannt";
}

function tagesbeginnAlsIso() {
  const datum = new Date();
  datum.setHours(0, 0, 0, 0);
  return datum.toISOString();
}

function monatsbeginnAlsIso() {
  const datum = new Date();
  datum.setDate(1);
  datum.setHours(0, 0, 0, 0);
  return datum.toISOString();
}

export default function Home() {
  const {
    aktuellerBenutzer,
    laedt: benutzerWerdenGeladen,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const [annahmestellen, setAnnahmestellen] =
    useState<Annahmestelle[]>([]);
  const [annahmestellenWerdenGeladen, setAnnahmestellenWerdenGeladen] =
    useState(false);
  const [lagerartikelAnzahl, setLagerartikelAnzahl] = useState(0);
  const [lagerartikelNachbestellen, setLagerartikelNachbestellen] = useState(0);
  const [lagerWirdGeladen, setLagerWirdGeladen] = useState(false);
  const [kennzahlen, setKennzahlen] =
    useState<DashboardKennzahlen>(leereKennzahlen);
  const [letzteLieferscheine, setLetzteLieferscheine] =
    useState<LetzterLieferschein[]>([]);
  const [dashboardWirdGeladen, setDashboardWirdGeladen] = useState(false);
  const [fehler, setFehler] = useState("");
  const [dashboardFehler, setDashboardFehler] = useState("");
  const [kassenAuswahlIstOffen, setKassenAuswahlIstOffen] =
    useState(false);

  const [ungeleseneChatNachrichten, setUngeleseneChatNachrichten] =
    useState(0);
  const [chatHinweisWirdGeladen, setChatHinweisWirdGeladen] =
    useState(false);

  const darfDashboardAnzeigen =
    hatAktuellerBenutzerBerechtigung("dashboard_anzeigen");
  const darfKasseAnzeigen =
    hatAktuellerBenutzerBerechtigung("kasse_anzeigen");
  const darfLieferscheineAnzeigen =
    hatAktuellerBenutzerBerechtigung("lieferscheine_anzeigen");
  const darfRechnungenAnzeigen =
    hatAktuellerBenutzerBerechtigung("rechnungen_anzeigen");
  const darfLagerAnzeigen =
    hatAktuellerBenutzerBerechtigung("lager_anzeigen");
  const darfChatAnzeigen =
    hatAktuellerBenutzerBerechtigung("chat_anzeigen");

  const istAdmin = aktuellerBenutzer?.rolle === "admin";

  useEffect(() => {
    let istAktiv = true;

    async function annahmestellenLaden() {
      if (!darfDashboardAnzeigen || !darfKasseAnzeigen) {
        setAnnahmestellen([]);
        setFehler("");
        setAnnahmestellenWerdenGeladen(false);
        return;
      }

      setAnnahmestellenWerdenGeladen(true);
      setFehler("");

      const { data, error } = await supabase
        .from("annahmestellen")
        .select("id, name, adresse, telefon, aktiv")
        .eq("aktiv", true)
        .order("name", { ascending: true });

      if (!istAktiv) return;

      if (error) {
        setFehler(error.message);
        setAnnahmestellen([]);
      } else {
        setAnnahmestellen((data as Annahmestelle[] | null) ?? []);
      }

      setAnnahmestellenWerdenGeladen(false);
    }

    void annahmestellenLaden();

    return () => {
      istAktiv = false;
    };
  }, [darfDashboardAnzeigen, darfKasseAnzeigen]);

  useEffect(() => {
    let istAktiv = true;

    async function lagerStatusLaden() {
      if (!darfDashboardAnzeigen || !darfLagerAnzeigen) {
        setLagerartikelAnzahl(0);
        setLagerartikelNachbestellen(0);
        setLagerWirdGeladen(false);
        return;
      }

      setLagerWirdGeladen(true);

      const { data, error } = await supabase
        .from("lagerartikel")
        .select("bestand, mindestbestand")
        .eq("aktiv", true);

      if (!istAktiv) return;

      if (error) {
        console.error("Der Lagerstatus konnte nicht geladen werden:", error);
        setLagerartikelAnzahl(0);
        setLagerartikelNachbestellen(0);
      } else {
        const artikel = (data ?? []) as LagerartikelBestand[];
        setLagerartikelAnzahl(artikel.length);
        setLagerartikelNachbestellen(
          artikel.filter(
            (eintrag) =>
              Number(eintrag.bestand) <= Number(eintrag.mindestbestand),
          ).length,
        );
      }

      setLagerWirdGeladen(false);
    }

    void lagerStatusLaden();

    return () => {
      istAktiv = false;
    };
  }, [darfDashboardAnzeigen, darfLagerAnzeigen]);

  useEffect(() => {
    let istAktiv = true;

    async function chefDashboardLaden() {
      if (!darfDashboardAnzeigen || !istAdmin) {
        setKennzahlen(leereKennzahlen);
        setLetzteLieferscheine([]);
        setDashboardWirdGeladen(false);
        setDashboardFehler("");
        return;
      }

      setDashboardWirdGeladen(true);
      setDashboardFehler("");

      const [lieferscheine, lieferungen, kunden, rechnungen] =
        await Promise.all([
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
              annahmestellen (name)
            `)
            .order("erstellt_am", { ascending: false }),
          supabase.from("lieferungen").select("id", { count: "exact", head: true }),
          supabase.from("kunden").select("id", { count: "exact", head: true }),
          supabase
            .from("rechnungen")
            .select("id, status, gesamtbetrag, faellig_am"),
        ]);

      if (!istAktiv) return;

      const ersterFehler =
        lieferscheine.error ?? lieferungen.error ?? kunden.error ?? rechnungen.error;

      if (ersterFehler) {
        setDashboardFehler(ersterFehler.message);
        setDashboardWirdGeladen(false);
        return;
      }

      const daten = (lieferscheine.data ?? []) as DatenbankLieferschein[];
      const heuteZeit = new Date(tagesbeginnAlsIso()).getTime();
      const monatZeit = new Date(monatsbeginnAlsIso()).getTime();

      let umsatzHeute = 0;
      let umsatzMonat = 0;
      let lieferscheineHeute = 0;
      let lieferscheineMonat = 0;
      let fertigeLieferscheine = 0;
      let gelieferteLieferscheine = 0;
      let offeneRechnungen = 0;
      let ueberfaelligeRechnungen = 0;
      let offenerRechnungsbetrag = 0;

      for (const lieferschein of daten) {
        const status = lieferschein.status.trim().toLowerCase();
        const datum = lieferschein.fertiggestellt_am ?? lieferschein.erstellt_am;
        const zeit = new Date(datum).getTime();
        const betrag = zahlUmwandeln(lieferschein.gesamtbetrag);

        if (status === "fertig") fertigeLieferscheine += 1;
        if (status === "geliefert") gelieferteLieferscheine += 1;

        if (Number.isFinite(zeit) && zeit >= heuteZeit) {
          lieferscheineHeute += 1;
          umsatzHeute += betrag;
        }

        if (Number.isFinite(zeit) && zeit >= monatZeit) {
          lieferscheineMonat += 1;
          umsatzMonat += betrag;
        }
      }

      const rechnungsDaten =
        (rechnungen.data ?? []) as DatenbankRechnung[];

      const jetzt = Date.now();

      for (const rechnung of rechnungsDaten) {
        const status =
          rechnung.status.trim().toLowerCase();

        if (status !== "offen") {
          continue;
        }

        offeneRechnungen += 1;
        offenerRechnungsbetrag += zahlUmwandeln(
          rechnung.gesamtbetrag,
        );

        if (!rechnung.faellig_am) {
          continue;
        }

        const faelligkeitsdatum = new Date(
          `${rechnung.faellig_am}T23:59:59`,
        ).getTime();

        if (
          Number.isFinite(faelligkeitsdatum) &&
          faelligkeitsdatum < jetzt
        ) {
          ueberfaelligeRechnungen += 1;
        }
      }

      setKennzahlen({
        umsatzHeute,
        umsatzMonat,
        lieferscheineHeute,
        lieferscheineMonat,
        fertigeLieferscheine,
        gelieferteLieferscheine,
        lieferungenGesamt: lieferungen.count ?? 0,
        kundenGesamt: kunden.count ?? 0,
        rechnungenGesamt: rechnungsDaten.length,
        offeneRechnungen,
        ueberfaelligeRechnungen,
        offenerRechnungsbetrag,
      });

      setLetzteLieferscheine(
        daten.slice(0, 6).map((lieferschein) => ({
          id: lieferschein.id,
          nummer: lieferschein.nummer,
          status: lieferschein.status,
          gesamtbetrag: zahlUmwandeln(lieferschein.gesamtbetrag),
          gesamtteile: lieferschein.gesamtteile ?? 0,
          datum: lieferschein.fertiggestellt_am ?? lieferschein.erstellt_am,
          annahmestelle: annahmestellenNameErmitteln(lieferschein.annahmestellen),
        })),
      );

      setDashboardWirdGeladen(false);
    }

    void chefDashboardLaden();

    return () => {
      istAktiv = false;
    };
  }, [darfDashboardAnzeigen, istAdmin]);

  useEffect(() => {
    let istAktiv = true;
    let zeitgeber: ReturnType<typeof setInterval> | null = null;

    async function ungeleseneNachrichtenLaden() {
      const benutzerId = aktuellerBenutzer?.id ?? null;

      if (!darfChatAnzeigen || benutzerId === null) {
        if (istAktiv) {
          setUngeleseneChatNachrichten(0);
          setChatHinweisWirdGeladen(false);
        }
        return;
      }

      setChatHinweisWirdGeladen(true);

      const [nachrichtenAntwort, lesestatusAntwort] =
        await Promise.all([
          supabase
            .from("chat_nachrichten")
            .select(
              "annahmestelle_id, absender_benutzer_id, erstellt_am",
            ),
          supabase
            .from("chat_lesestatus")
            .select(
              "annahmestelle_id, zuletzt_gelesen_am",
            )
            .eq("benutzer_id", benutzerId),
        ]);

      if (!istAktiv) {
        return;
      }

      if (
        nachrichtenAntwort.error ||
        lesestatusAntwort.error
      ) {
        console.error(
          "Die ungelesenen Chatnachrichten konnten nicht geladen werden:",
          nachrichtenAntwort.error ??
            lesestatusAntwort.error,
        );

        setUngeleseneChatNachrichten(0);
        setChatHinweisWirdGeladen(false);
        return;
      }

      const nachrichten =
        (nachrichtenAntwort.data ??
          []) as ChatNachrichtUebersicht[];

      const lesestatus =
        (lesestatusAntwort.data ??
          []) as ChatLesestatusUebersicht[];

      const gelesenNachAnnahmestelle =
        new Map<number, number>();

      for (const eintrag of lesestatus) {
        gelesenNachAnnahmestelle.set(
          eintrag.annahmestelle_id,
          new Date(
            eintrag.zuletzt_gelesen_am,
          ).getTime(),
        );
      }

      const anzahlUngelesen = nachrichten.filter(
        (nachricht) => {
          if (
            nachricht.absender_benutzer_id ===
            benutzerId
          ) {
            return false;
          }

          const erstelltAm = new Date(
            nachricht.erstellt_am,
          ).getTime();

          const zuletztGelesenAm =
            gelesenNachAnnahmestelle.get(
              nachricht.annahmestelle_id,
            ) ?? 0;

          return (
            Number.isFinite(erstelltAm) &&
            erstelltAm > zuletztGelesenAm
          );
        },
      ).length;

      setUngeleseneChatNachrichten(
        anzahlUngelesen,
      );
      setChatHinweisWirdGeladen(false);
    }

    void ungeleseneNachrichtenLaden();

    zeitgeber = setInterval(() => {
      void ungeleseneNachrichtenLaden();
    }, 10000);

    return () => {
      istAktiv = false;

      if (zeitgeber) {
        clearInterval(zeitgeber);
      }
    };
  }, [
    aktuellerBenutzer?.id,
    darfChatAnzeigen,
  ]);

  if (benutzerWerdenGeladen) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          <p className="text-slate-600">Benutzerrechte werden geladen ...</p>
        </div>
      </main>
    );
  }

  if (aktuellerBenutzer?.rolle === "annahmestelle") {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-bold">Washly</h1>
            <p className="mt-1 text-sm text-slate-300">Annahmestelle</p>
          </div>
        </header>

        <section className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-2">
          {darfLieferscheineAnzeigen && (
            <Link href="/lieferscheine" className="rounded-2xl bg-white p-8 shadow">
              <p className="text-sm font-semibold text-slate-500">Eigene Annahmestelle</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Lieferscheine</h2>
              <p className="mt-3 text-slate-600">Eigene Lieferscheine ansehen und öffnen.</p>
            </Link>
          )}

          {darfRechnungenAnzeigen && (
            <Link href="/rechnungen" className="rounded-2xl bg-white p-8 shadow">
              <p className="text-sm font-semibold text-slate-500">Abrechnung</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Rechnungen</h2>
              <p className="mt-3 text-slate-600">Rechnungen ansehen und öffnen.</p>
            </Link>
          )}

          {darfChatAnzeigen && (
            <Link href="/chat" className="rounded-2xl bg-white p-8 shadow">
              <p className="text-sm font-semibold text-slate-500">Nachrichten</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Chat</h2>
              <p className="mt-3 text-slate-600">
                Nachrichten senden und neue Antworten lesen.
              </p>

              {ungeleseneChatNachrichten > 0 && (
                <span className="mt-5 inline-flex rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
                  {ungeleseneChatNachrichten} ungelesen
                </span>
              )}
            </Link>
          )}
        </section>
      </main>
    );
  }

  if (!darfDashboardAnzeigen) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard gesperrt</h1>
          <p className="mt-2 text-slate-600">
            Der aktuell ausgewählte Benutzer darf das Dashboard nicht anzeigen.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Washly</h1>
            <p className="mt-1 text-sm text-slate-300">
              {istAdmin ? "Chef-Dashboard" : "Mitarbeiteransicht"}
            </p>
          </div>
          <div className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold">
            System online
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {darfKasseAnzeigen && (
          <div className="mb-10">
            <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-center shadow sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Schneller Start
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                Neue Kasse öffnen
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-slate-600">
                Starte einen neuen Vorgang, wähle die Annahmestelle und gib
                anschließend die Sammelscheine ein.
              </p>

              <button
                type="button"
                onClick={() =>
                  setKassenAuswahlIstOffen(
                    (istOffen) => !istOffen,
                  )
                }
                className="mx-auto mt-7 flex h-28 w-28 items-center justify-center rounded-full bg-blue-700 text-7xl font-light leading-none text-white shadow-lg transition hover:scale-105 hover:bg-blue-800"
                aria-label="Neue Kasse öffnen"
              >
                +
              </button>

              <p className="mt-4 font-bold text-slate-900">
                {kassenAuswahlIstOffen
                  ? "Auswahl schließen"
                  : "Neue Kasse"}
              </p>
            </div>

            {kassenAuswahlIstOffen && (
              <div className="mx-auto mt-6 max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-950">
                    Annahmestelle auswählen
                  </h3>

                  <p className="mt-2 text-slate-600">
                    Danach öffnet sich direkt die vorhandene Kasse.
                  </p>
                </div>

                {annahmestellenWerdenGeladen && (
                  <div className="mt-6 rounded-2xl bg-slate-100 p-5 text-center text-slate-600">
                    Annahmestellen werden geladen ...
                  </div>
                )}

                {fehler && (
                  <div className="mt-6 rounded-2xl bg-red-100 p-5 text-red-800">
                    {fehler}
                  </div>
                )}

                {!annahmestellenWerdenGeladen &&
                  !fehler &&
                  annahmestellen.length === 0 && (
                    <div className="mt-6 rounded-2xl bg-orange-100 p-5 text-center text-orange-800">
                      Es wurde keine aktive Annahmestelle gefunden.
                    </div>
                  )}

                {!annahmestellenWerdenGeladen &&
                  !fehler &&
                  annahmestellen.length > 0 && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {annahmestellen.map(
                        (annahmestelle) => (
                          <Link
                            key={annahmestelle.id}
                            href={`/kasse?annahmestelle=${annahmestelle.id}&name=${encodeURIComponent(
                              annahmestelle.name,
                            )}`}
                            className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-blue-600 hover:shadow-md"
                          >
                            <h4 className="text-lg font-bold text-slate-950">
                              {annahmestelle.name}
                            </h4>

                            {annahmestelle.adresse && (
                              <p className="mt-2 text-sm text-slate-600">
                                {annahmestelle.adresse}
                              </p>
                            )}

                            <div className="mt-5 font-bold text-blue-700">
                              Auswählen →
                            </div>
                          </Link>
                        ),
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {darfChatAnzeigen && (
          <Link
            href="/chat"
            className={`mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 shadow transition hover:shadow-md ${
              ungeleseneChatNachrichten > 0
                ? "border-2 border-red-200 bg-red-50"
                : "bg-white"
            }`}
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Chat
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {chatHinweisWirdGeladen
                  ? "Nachrichten werden geprüft ..."
                  : ungeleseneChatNachrichten > 0
                    ? `${ungeleseneChatNachrichten} ungelesene Nachricht${
                        ungeleseneChatNachrichten === 1
                          ? ""
                          : "en"
                      }`
                    : "Keine ungelesenen Nachrichten"}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Chat mit den Annahmestellen öffnen
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                ungeleseneChatNachrichten > 0
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Chat öffnen →
            </span>
          </Link>
        )}

        {istAdmin && (
          <>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                      Geschäftsübersicht
                    </p>

                    <h2 className="mt-2 text-3xl font-bold">
                      Chef-Dashboard
                    </h2>

                    <p className="mt-2 text-sm text-slate-300">
                      Die wichtigsten Kennzahlen und offenen Aufgaben auf einen Blick.
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/10 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-300">
                      Status
                    </p>

                    <p className="mt-1 font-bold text-green-300">
                      System online
                    </p>
                  </div>
                </div>
              </div>

              {dashboardFehler && (
                <div className="m-6 rounded-2xl bg-red-100 p-5 text-red-800">
                  <p className="font-bold">
                    Dashboard-Daten konnten nicht geladen werden.
                  </p>

                  <p className="mt-2 text-sm">
                    {dashboardFehler}
                  </p>
                </div>
              )}

              <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                <div className="bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Umsatz heute
                      </p>

                      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                        {dashboardWirdGeladen
                          ? "..."
                          : geldFormatieren(
                              kennzahlen.umsatzHeute,
                            )}
                      </p>
                    </div>

                    <span className="rounded-xl bg-blue-50 px-3 py-2 text-lg">
                      €
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    {kennzahlen.lieferscheineHeute} Lieferscheine heute
                  </p>
                </div>

                <div className="bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Umsatz im Monat
                      </p>

                      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                        {dashboardWirdGeladen
                          ? "..."
                          : geldFormatieren(
                              kennzahlen.umsatzMonat,
                            )}
                      </p>
                    </div>

                    <span className="rounded-xl bg-green-50 px-3 py-2 text-lg">
                      ↗
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    {kennzahlen.lieferscheineMonat} Lieferscheine im Monat
                  </p>
                </div>

                <Link
                  href="/rechnungen"
                  className={`bg-white p-6 transition hover:bg-slate-50 ${
                    kennzahlen.ueberfaelligeRechnungen > 0
                      ? "ring-2 ring-inset ring-red-200"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Offene Rechnungen
                      </p>

                      <p
                        className={`mt-3 text-3xl font-bold tracking-tight ${
                          kennzahlen.ueberfaelligeRechnungen > 0
                            ? "text-red-700"
                            : "text-slate-950"
                        }`}
                      >
                        {dashboardWirdGeladen
                          ? "..."
                          : kennzahlen.offeneRechnungen}
                      </p>
                    </div>

                    <span
                      className={`rounded-xl px-3 py-2 text-lg ${
                        kennzahlen.ueberfaelligeRechnungen > 0
                          ? "bg-red-100"
                          : "bg-slate-100"
                      }`}
                    >
                      !
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    {geldFormatieren(
                      kennzahlen.offenerRechnungsbetrag,
                    )}{" "}
                    offen
                  </p>

                  <p
                    className={`mt-1 text-xs font-bold ${
                      kennzahlen.ueberfaelligeRechnungen > 0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}
                  >
                    {kennzahlen.ueberfaelligeRechnungen} überfällig
                  </p>
                </Link>

                <Link
                  href="/lieferscheine"
                  className="bg-white p-6 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Fertige Lieferscheine
                      </p>

                      <p className="mt-3 text-3xl font-bold tracking-tight text-blue-700">
                        {dashboardWirdGeladen
                          ? "..."
                          : kennzahlen.fertigeLieferscheine}
                      </p>
                    </div>

                    <span className="rounded-xl bg-blue-50 px-3 py-2 text-lg">
                      ✓
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    Für die Lieferung verfügbar
                  </p>
                </Link>
              </div>

              <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  href="/lager"
                  className={`rounded-2xl border bg-white p-5 transition hover:shadow-sm ${
                    lagerartikelNachbestellen > 0
                      ? "border-red-200"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-500">
                    Lagerwarnungen
                  </p>

                  <p
                    className={`mt-2 text-2xl font-bold ${
                      lagerartikelNachbestellen > 0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}
                  >
                    {lagerWirdGeladen
                      ? "..."
                      : lagerartikelNachbestellen}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {lagerartikelAnzahl} aktive Artikel
                  </p>
                </Link>

                <Link
                  href="/lieferungen"
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    Lieferungen gesamt
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {dashboardWirdGeladen
                      ? "..."
                      : kennzahlen.lieferungenGesamt}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Alle Lieferungen
                  </p>
                </Link>

                <Link
                  href="/kunden"
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    Kunden
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {dashboardWirdGeladen
                      ? "..."
                      : kennzahlen.kundenGesamt}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Aktuelle Kundenanzahl
                  </p>
                </Link>

                <Link
                  href="/lieferscheine"
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    Bereits geliefert
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {dashboardWirdGeladen
                      ? "..."
                      : kennzahlen.gelieferteLieferscheine}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Abgeschlossene Lieferscheine
                  </p>
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Letzte Aktivität</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950">
                      Neueste Lieferscheine
                    </h3>
                  </div>
                  <Link href="/lieferscheine" className="text-sm font-bold text-blue-700">
                    Alle anzeigen
                  </Link>
                </div>

                <div className="mt-5 divide-y divide-slate-200">
                  {letzteLieferscheine.map((lieferschein) => (
                    <Link
                      key={lieferschein.id}
                      href={`/lieferschein/${encodeURIComponent(lieferschein.nummer)}`}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div>
                        <p className="font-bold text-blue-700">{lieferschein.nummer}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {lieferschein.annahmestelle} · {lieferschein.gesamtteile} Teile
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {datumFormatieren(lieferschein.datum)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-950">
                          {geldFormatieren(lieferschein.gesamtbetrag)}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {lieferschein.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}

      </section>
    </main>
  );
}