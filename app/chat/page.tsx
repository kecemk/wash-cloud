"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { useBenutzer } from "../context/BenutzerContext";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
};

type DatenbankAbsender = {
  id: number;
  benutzername: string;
  vorname: string | null;
  nachname: string | null;
  rolle: string;
};

type DatenbankNachricht = {
  id: number;
  annahmestelle_id: number;
  absender_benutzer_id: number;
  nachricht: string | null;
  dateipfad: string | null;
  dateiname: string | null;
  dateityp: string | null;
  dateigroesse: number | null;
  erstellt_am: string;
  benutzer:
    | DatenbankAbsender
    | DatenbankAbsender[]
    | null;
};

type ChatNachricht = {
  id: number;
  annahmestelleId: number;
  absenderBenutzerId: number;
  nachricht: string;
  dateipfad: string | null;
  dateiname: string;
  dateityp: string;
  dateigroesse: number | null;
  erstelltAm: string;
  absenderName: string;
  absenderRolle: string;
  signierteUrl: string | null;
};

type ChatLesestatus = {
  annahmestelle_id: number;
  zuletzt_gelesen_am: string;
};

type ChatNachrichtenZeit = {
  annahmestelle_id: number;
  absender_benutzer_id: number;
  erstellt_am: string;
};

function einzelnesElementErmitteln<T>(
  wert: T | T[] | null,
): T | null {
  if (Array.isArray(wert)) {
    return wert[0] ?? null;
  }

  return wert;
}

function absenderNameErmitteln(
  absender: DatenbankAbsender | null,
) {
  if (!absender) {
    return "Unbekannter Benutzer";
  }

  const name = [
    absender.vorname ?? "",
    absender.nachname ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || absender.benutzername;
}

function rolleFormatieren(rolle: string) {
  if (rolle === "admin") {
    return "Administrator";
  }

  if (rolle === "mitarbeiter") {
    return "Mitarbeiter";
  }

  if (rolle === "annahmestelle") {
    return "Annahmestelle";
  }

  return rolle || "Unbekannt";
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

function dateinameBereinigen(
  dateiname: string,
) {
  return dateiname
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export default function ChatPage() {
  const {
    aktuellerBenutzer,
    laedt: benutzerWirdGeladen,
  } = useBenutzer();

  const [
    annahmestellen,
    setAnnahmestellen,
  ] = useState<Annahmestelle[]>([]);

  const [
    ausgewaehlteAnnahmestelleId,
    setAusgewaehlteAnnahmestelleId,
  ] = useState<number | null>(null);

  const [
    nachrichten,
    setNachrichten,
  ] = useState<ChatNachricht[]>([]);

  const [
    ungeleseneJeAnnahmestelle,
    setUngeleseneJeAnnahmestelle,
  ] = useState<Record<number, number>>({});

  const [nachricht, setNachricht] =
    useState("");

  const [foto, setFoto] =
    useState<File | null>(null);

  const [laedt, setLaedt] =
    useState(true);

  const [sendet, setSendet] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const dateiEingabeRef =
    useRef<HTMLInputElement | null>(null);

  const nachrichtenEndeRef =
    useRef<HTMLDivElement | null>(null);

  const istInternerBenutzer =
    aktuellerBenutzer?.rolle === "admin" ||
    aktuellerBenutzer?.rolle ===
      "mitarbeiter";

  const darfLoeschen =
    aktuellerBenutzer?.rolle === "admin";

  const ausgewaehlteAnnahmestelle =
    useMemo(
      () =>
        annahmestellen.find(
          (annahmestelle) =>
            annahmestelle.id ===
            ausgewaehlteAnnahmestelleId,
        ) ?? null,
      [
        annahmestellen,
        ausgewaehlteAnnahmestelleId,
      ],
    );

  useEffect(() => {
    if (
      benutzerWirdGeladen ||
      !aktuellerBenutzer
    ) {
      return;
    }

    let istAktiv = true;

    async function grunddatenLaden() {
      setLaedt(true);
      setFehler("");

      if (
        aktuellerBenutzer?.rolle ===
        "annahmestelle"
      ) {
        if (
          aktuellerBenutzer.annahmestelleId ===
          null
        ) {
          setFehler(
            "Diesem Benutzer ist keine Annahmestelle zugeordnet.",
          );
          setAnnahmestellen([]);
          setAusgewaehlteAnnahmestelleId(
            null,
          );
          setLaedt(false);
          return;
        }

        setAnnahmestellen([
          {
            id:
              aktuellerBenutzer.annahmestelleId,
            name:
              aktuellerBenutzer.annahmestelle,
          },
        ]);

        setAusgewaehlteAnnahmestelleId(
          aktuellerBenutzer.annahmestelleId,
        );

        setLaedt(false);
        return;
      }

      if (!istInternerBenutzer) {
        setFehler(
          "Deine Rolle darf den Chat nicht öffnen.",
        );
        setAnnahmestellen([]);
        setAusgewaehlteAnnahmestelleId(
          null,
        );
        setLaedt(false);
        return;
      }

      const { data, error } =
        await supabase
          .from("annahmestellen")
          .select("id, name")
          .eq("aktiv", true)
          .order("name", {
            ascending: true,
          });

      if (!istAktiv) {
        return;
      }

      if (error) {
        setFehler(error.message);
        setAnnahmestellen([]);
        setLaedt(false);
        return;
      }

      const geladeneAnnahmestellen =
        (data ?? []) as Annahmestelle[];

      setAnnahmestellen(
        geladeneAnnahmestellen,
      );

      setAusgewaehlteAnnahmestelleId(
        (aktuelleId) =>
          aktuelleId ??
          geladeneAnnahmestellen[0]?.id ??
          null,
      );

      setLaedt(false);
    }

    void grunddatenLaden();

    return () => {
      istAktiv = false;
    };
  }, [
    aktuellerBenutzer,
    benutzerWirdGeladen,
    istInternerBenutzer,
  ]);

  useEffect(() => {
    if (
      !aktuellerBenutzer ||
      annahmestellen.length === 0
    ) {
      setUngeleseneJeAnnahmestelle({});
      return;
    }

    const aktuellerBenutzerId =
      aktuellerBenutzer.id;

    let istAktiv = true;

    async function ungeleseneNachrichtenLaden() {
      const [
        lesestatusErgebnis,
        nachrichtenErgebnis,
      ] = await Promise.all([
        supabase
          .from("chat_lesestatus")
          .select(`
            annahmestelle_id,
            zuletzt_gelesen_am
          `)
          .eq(
            "benutzer_id",
            aktuellerBenutzerId,
          ),
        supabase
          .from("chat_nachrichten")
          .select(`
            annahmestelle_id,
            absender_benutzer_id,
            erstellt_am
          `),
      ]);

      if (!istAktiv) {
        return;
      }

      if (
        lesestatusErgebnis.error ||
        nachrichtenErgebnis.error
      ) {
        console.error(
          "Ungelesene Chatnachrichten konnten nicht geladen werden:",
          lesestatusErgebnis.error ??
            nachrichtenErgebnis.error,
        );
        return;
      }

      const lesestatusDaten =
        (lesestatusErgebnis.data ??
          []) as ChatLesestatus[];

      const nachrichtenDaten =
        (nachrichtenErgebnis.data ??
          []) as ChatNachrichtenZeit[];

      const zuletztGelesenJeAnnahmestelle =
        new Map<number, number>();

      for (const lesestatus of lesestatusDaten) {
        const zeit = new Date(
          lesestatus.zuletzt_gelesen_am,
        ).getTime();

        zuletztGelesenJeAnnahmestelle.set(
          lesestatus.annahmestelle_id,
          Number.isFinite(zeit) ? zeit : 0,
        );
      }

      const neueAnzahlen: Record<
        number,
        number
      > = {};

      for (const annahmestelle of annahmestellen) {
        neueAnzahlen[annahmestelle.id] = 0;
      }

      for (const chatNachricht of nachrichtenDaten) {
        if (
          chatNachricht.absender_benutzer_id ===
          aktuellerBenutzerId
        ) {
          continue;
        }

        const nachrichtenZeit = new Date(
          chatNachricht.erstellt_am,
        ).getTime();

        const zuletztGelesen =
          zuletztGelesenJeAnnahmestelle.get(
            chatNachricht.annahmestelle_id,
          ) ?? 0;

        if (
          Number.isFinite(nachrichtenZeit) &&
          nachrichtenZeit > zuletztGelesen
        ) {
          neueAnzahlen[
            chatNachricht.annahmestelle_id
          ] =
            (neueAnzahlen[
              chatNachricht.annahmestelle_id
            ] ?? 0) + 1;
        }
      }

      setUngeleseneJeAnnahmestelle(
        neueAnzahlen,
      );
    }

    void ungeleseneNachrichtenLaden();

    const intervall = window.setInterval(
      () => {
        void ungeleseneNachrichtenLaden();
      },
      3000,
    );

    return () => {
      istAktiv = false;
      window.clearInterval(intervall);
    };
  }, [
    aktuellerBenutzer,
    annahmestellen,
  ]);

  useEffect(() => {
    if (
      !ausgewaehlteAnnahmestelleId
    ) {
      setNachrichten([]);
      return;
    }

    const aktuelleAnnahmestelleId =
      ausgewaehlteAnnahmestelleId;

    const aktuellerBenutzerId =
      aktuellerBenutzer?.id ?? null;

    let istAktiv = true;

    async function nachrichtenLaden(
      still = false,
    ) {
      if (!still) {
        setLaedt(true);
      }

      const { data, error } =
        await supabase
          .from("chat_nachrichten")
          .select(`
            id,
            annahmestelle_id,
            absender_benutzer_id,
            nachricht,
            dateipfad,
            dateiname,
            dateityp,
            dateigroesse,
            erstellt_am,
            benutzer:absender_benutzer_id (
              id,
              benutzername,
              vorname,
              nachname,
              rolle
            )
          `)
          .eq(
            "annahmestelle_id",
            aktuelleAnnahmestelleId,
          )
          .order("erstellt_am", {
            ascending: true,
          });

      if (!istAktiv) {
        return;
      }

      if (error) {
        setFehler(error.message);
        setNachrichten([]);

        if (!still) {
          setLaedt(false);
        }

        return;
      }

      const geladeneNachrichten =
        await Promise.all(
          (
            (data ?? []) as DatenbankNachricht[]
          ).map(
            async (
              datenbankNachricht,
            ): Promise<ChatNachricht> => {
              const absender =
                einzelnesElementErmitteln(
                  datenbankNachricht.benutzer,
                );

              let signierteUrl: string | null =
                null;

              if (
                datenbankNachricht.dateipfad
              ) {
                const {
                  data: signierteDaten,
                  error: signaturFehler,
                } = await supabase.storage
                  .from("chat-dateien")
                  .createSignedUrl(
                    datenbankNachricht.dateipfad,
                    60 * 60,
                  );

                if (!signaturFehler) {
                  signierteUrl =
                    signierteDaten.signedUrl;
                }
              }

              return {
                id:
                  datenbankNachricht.id,
                annahmestelleId:
                  datenbankNachricht.annahmestelle_id,
                absenderBenutzerId:
                  datenbankNachricht.absender_benutzer_id,
                nachricht:
                  datenbankNachricht.nachricht ??
                  "",
                dateipfad:
                  datenbankNachricht.dateipfad,
                dateiname:
                  datenbankNachricht.dateiname ??
                  "",
                dateityp:
                  datenbankNachricht.dateityp ??
                  "",
                dateigroesse:
                  datenbankNachricht.dateigroesse,
                erstelltAm:
                  datenbankNachricht.erstellt_am,
                absenderName:
                  absenderNameErmitteln(
                    absender,
                  ),
                absenderRolle:
                  absender?.rolle ?? "",
                signierteUrl,
              };
            },
          ),
        );

      if (!istAktiv) {
        return;
      }

      setNachrichten(
        geladeneNachrichten,
      );
      setFehler("");

      if (aktuellerBenutzerId !== null) {
        const gelesenAm =
          new Date().toISOString();

        const {
          error: lesestatusFehler,
        } = await supabase
          .from("chat_lesestatus")
          .upsert(
            {
              benutzer_id:
                aktuellerBenutzerId,
              annahmestelle_id:
                aktuelleAnnahmestelleId,
              zuletzt_gelesen_am:
                gelesenAm,
              aktualisiert_am:
                gelesenAm,
            },
            {
              onConflict:
                "benutzer_id,annahmestelle_id",
            },
          );

        if (lesestatusFehler) {
          console.error(
            "Der Chat-Lesestatus konnte nicht gespeichert werden:",
            lesestatusFehler,
          );
        } else {
          setUngeleseneJeAnnahmestelle(
            (aktuelleAnzahlen) => ({
              ...aktuelleAnzahlen,
              [aktuelleAnnahmestelleId]:
                0,
            }),
          );
        }
      }

      if (!still) {
        setLaedt(false);
      }
    }

    void nachrichtenLaden();

    const intervall = window.setInterval(
      () => {
        void nachrichtenLaden(true);
      },
      3000,
    );

    return () => {
      istAktiv = false;
      window.clearInterval(intervall);
    };
  }, [
    ausgewaehlteAnnahmestelleId,
    aktuellerBenutzer,
  ]);

  useEffect(() => {
    nachrichtenEndeRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [nachrichten]);

  function fotoAuswaehlen(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const ausgewaehlteDatei =
      event.target.files?.[0] ?? null;

    if (!ausgewaehlteDatei) {
      setFoto(null);
      return;
    }

    if (
      !ausgewaehlteDatei.type.startsWith(
        "image/",
      )
    ) {
      setFehler(
        "Bitte wähle eine Bilddatei aus.",
      );
      event.target.value = "";
      setFoto(null);
      return;
    }

    if (
      ausgewaehlteDatei.size >
      10 * 1024 * 1024
    ) {
      setFehler(
        "Das Foto darf höchstens 10 MB groß sein.",
      );
      event.target.value = "";
      setFoto(null);
      return;
    }

    setFoto(ausgewaehlteDatei);
    setFehler("");
  }

  async function nachrichtSenden(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      sendet ||
      !aktuellerBenutzer ||
      !ausgewaehlteAnnahmestelleId
    ) {
      return;
    }

    const bereinigteNachricht =
      nachricht.trim();

    if (!bereinigteNachricht && !foto) {
      setFehler(
        "Bitte schreibe eine Nachricht oder wähle ein Foto aus.",
      );
      return;
    }

    setSendet(true);
    setFehler("");

    let hochgeladenerDateipfad:
      | string
      | null = null;

    try {
      if (foto) {
        const dateipfad =
          `${ausgewaehlteAnnahmestelleId}/` +
          `${crypto.randomUUID()}-` +
          dateinameBereinigen(
            foto.name,
          );

        const {
          error: uploadFehler,
        } = await supabase.storage
          .from("chat-dateien")
          .upload(dateipfad, foto, {
            cacheControl: "3600",
            upsert: false,
            contentType: foto.type,
          });

        if (uploadFehler) {
          throw new Error(
            uploadFehler.message,
          );
        }

        hochgeladenerDateipfad =
          dateipfad;
      }

      const { error: insertFehler } =
        await supabase
          .from("chat_nachrichten")
          .insert({
            annahmestelle_id:
              ausgewaehlteAnnahmestelleId,
            absender_benutzer_id:
              aktuellerBenutzer.id,
            nachricht:
              bereinigteNachricht ||
              null,
            dateipfad:
              hochgeladenerDateipfad,
            dateiname:
              foto?.name ?? null,
            dateityp:
              foto?.type ?? null,
            dateigroesse:
              foto?.size ?? null,
          });

      if (insertFehler) {
        throw new Error(
          insertFehler.message,
        );
      }

      setNachricht("");
      setFoto(null);

      if (dateiEingabeRef.current) {
        dateiEingabeRef.current.value =
          "";
      }
    } catch (unbekannterFehler) {
      if (hochgeladenerDateipfad) {
        await supabase.storage
          .from("chat-dateien")
          .remove([
            hochgeladenerDateipfad,
          ]);
      }

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Nachricht konnte nicht gesendet werden.",
      );
    } finally {
      setSendet(false);
    }
  }

  async function nachrichtLoeschen(
    chatNachricht: ChatNachricht,
  ) {
    if (!darfLoeschen) {
      return;
    }

    const bestaetigt =
      window.confirm(
        "Möchtest du diese Nachricht wirklich löschen?",
      );

    if (!bestaetigt) {
      return;
    }

    setFehler("");

    try {
      if (chatNachricht.dateipfad) {
        const {
          error: dateiFehler,
        } = await supabase.storage
          .from("chat-dateien")
          .remove([
            chatNachricht.dateipfad,
          ]);

        if (dateiFehler) {
          throw new Error(
            dateiFehler.message,
          );
        }
      }

      const { error } = await supabase
        .from("chat_nachrichten")
        .delete()
        .eq("id", chatNachricht.id);

      if (error) {
        throw new Error(error.message);
      }

      setNachrichten(
        (aktuelleNachrichten) =>
          aktuelleNachrichten.filter(
            (eintrag) =>
              eintrag.id !==
              chatNachricht.id,
          ),
      );
    } catch (unbekannterFehler) {
      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Nachricht konnte nicht gelöscht werden.",
      );
    }
  }

  return (
    <ZugriffsSchutz
      berechtigung="chat_anzeigen"
      titel="Chat gesperrt"
      beschreibung="Der aktuell angemeldete Benutzer darf den Chat nicht öffnen."
      zurueckLink="/"
      zurueckText="Zur Startseite"
    >
      <main className="min-h-screen bg-slate-100">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Wash Cloud
              </p>

              <h1 className="text-2xl font-bold">
                Interner Chat
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                Nachrichten und Fotos zwischen
                Mitarbeitern und Annahmestellen
              </p>
            </div>

            <Link
              href="/"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              Zur Startseite
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {fehler && (
            <div className="mb-5 rounded-2xl bg-red-100 p-5 text-red-800 shadow">
              <p className="font-bold">
                Chatfehler
              </p>

              <p className="mt-1 text-sm">
                {fehler}
              </p>
            </div>
          )}

          <div className="grid min-h-[72vh] overflow-hidden rounded-2xl bg-white shadow lg:grid-cols-[300px_1fr]">
            {istInternerBenutzer && (
              <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
                <h2 className="font-bold text-slate-950">
                  Annahmestellen
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Wähle einen Chat aus.
                </p>

                <div className="mt-4 space-y-2">
                  {annahmestellen.map(
                    (annahmestelle) => (
                      <button
                        key={annahmestelle.id}
                        type="button"
                        onClick={() =>
                          setAusgewaehlteAnnahmestelleId(
                            annahmestelle.id,
                          )
                        }
                        className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
                          ausgewaehlteAnnahmestelleId ===
                          annahmestelle.id
                            ? "bg-slate-950 text-white"
                            : "bg-white text-slate-800 hover:bg-slate-200"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>
                            {annahmestelle.name}
                          </span>

                          {(ungeleseneJeAnnahmestelle[
                            annahmestelle.id
                          ] ?? 0) > 0 && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                              {
                                ungeleseneJeAnnahmestelle[
                                  annahmestelle.id
                                ]
                              }
                            </span>
                          )}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </aside>
            )}

            <div className="flex min-h-[72vh] flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Chat mit
                </p>

                <h2 className="text-xl font-bold text-slate-950">
                  {ausgewaehlteAnnahmestelle
                    ?.name ??
                    "Keine Annahmestelle ausgewählt"}
                </h2>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-100 p-5">
                {laedt && (
                  <p className="text-center text-slate-500">
                    Nachrichten werden geladen ...
                  </p>
                )}

                {!laedt &&
                  nachrichten.length ===
                    0 && (
                    <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
                      Noch keine Nachrichten.
                      Schreibe die erste Nachricht.
                    </div>
                  )}

                {!laedt &&
                  nachrichten.map(
                    (chatNachricht) => {
                      const istEigeneNachricht =
                        chatNachricht.absenderBenutzerId ===
                        aktuellerBenutzer?.id;

                      return (
                        <div
                          key={
                            chatNachricht.id
                          }
                          className={`flex ${
                            istEigeneNachricht
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <article
                            className={`max-w-[88%] rounded-2xl p-4 shadow-sm sm:max-w-[70%] ${
                              istEigeneNachricht
                                ? "bg-blue-700 text-white"
                                : "bg-white text-slate-900"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold">
                                  {
                                    chatNachricht.absenderName
                                  }
                                </p>

                                <p
                                  className={`text-xs ${
                                    istEigeneNachricht
                                      ? "text-blue-100"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {rolleFormatieren(
                                    chatNachricht.absenderRolle,
                                  )}
                                </p>
                              </div>

                              {darfLoeschen && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void nachrichtLoeschen(
                                      chatNachricht,
                                    )
                                  }
                                  className={`text-xs font-bold ${
                                    istEigeneNachricht
                                      ? "text-blue-100"
                                      : "text-red-700"
                                  }`}
                                >
                                  Löschen
                                </button>
                              )}
                            </div>

                            {chatNachricht.nachricht && (
                              <p className="mt-3 whitespace-pre-wrap break-words">
                                {
                                  chatNachricht.nachricht
                                }
                              </p>
                            )}

                            {chatNachricht.signierteUrl && (
                              <a
                                href={
                                  chatNachricht.signierteUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 block overflow-hidden rounded-xl"
                              >
                                <img
                                  src={
                                    chatNachricht.signierteUrl
                                  }
                                  alt={
                                    chatNachricht.dateiname ||
                                    "Chatfoto"
                                  }
                                  className="max-h-80 w-full object-cover"
                                />
                              </a>
                            )}

                            <p
                              className={`mt-3 text-right text-xs ${
                                istEigeneNachricht
                                  ? "text-blue-100"
                                  : "text-slate-400"
                              }`}
                            >
                              {datumFormatieren(
                                chatNachricht.erstelltAm,
                              )}
                            </p>
                          </article>
                        </div>
                      );
                    },
                  )}

                <div
                  ref={nachrichtenEndeRef}
                />
              </div>

              <form
                onSubmit={nachrichtSenden}
                className="border-t border-slate-200 bg-white p-4"
              >
                {foto && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                    <span className="truncate">
                      Foto: {foto.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setFoto(null);

                        if (
                          dateiEingabeRef.current
                        ) {
                          dateiEingabeRef.current.value =
                            "";
                        }
                      }}
                      className="font-bold text-red-700"
                    >
                      Entfernen
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={nachricht}
                    onChange={(event) =>
                      setNachricht(
                        event.target.value,
                      )
                    }
                    placeholder="Nachricht schreiben ..."
                    rows={2}
                    disabled={
                      !ausgewaehlteAnnahmestelleId ||
                      sendet
                    }
                    className="min-h-[56px] flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />

                  <div className="flex gap-2">
                    <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-700">
                      Foto
                      <input
                        ref={dateiEingabeRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={
                          fotoAuswaehlen
                        }
                        disabled={
                          !ausgewaehlteAnnahmestelleId ||
                          sendet
                        }
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={
                        !ausgewaehlteAnnahmestelleId ||
                        sendet
                      }
                      className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendet
                        ? "Wird gesendet ..."
                        : "Senden"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </ZugriffsSchutz>
  );
}