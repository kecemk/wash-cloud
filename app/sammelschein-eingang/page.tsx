"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
};

type OffenerSammelschein = {
  id: number;
  annahmestelle_id: number;
  nummer: string;
  status: "offen" | "erledigt";
  erstellt_am: string;
};

export default function SammelscheinEingangPage() {
  const [annahmestellen, setAnnahmestellen] =
    useState<Annahmestelle[]>([]);

  const [
    ausgewaehlteAnnahmestelleId,
    setAusgewaehlteAnnahmestelleId,
  ] = useState("");

  const [nummer, setNummer] =
    useState("");

  const [
    offeneSammelscheine,
    setOffeneSammelscheine,
  ] = useState<OffenerSammelschein[]>([]);

  const [wirdGeladen, setWirdGeladen] =
    useState(true);

  const [speichert, setSpeichert] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const [erfolg, setErfolg] =
    useState("");

  const [
    fotoWirdErkannt,
    setFotoWirdErkannt,
  ] = useState(false);

  const [
    ocrFortschritt,
    setOcrFortschritt,
  ] = useState(0);

  const [
    fotoVorschau,
    setFotoVorschau,
  ] = useState("");

  const [
    erkannteNummern,
    setErkannteNummern,
  ] = useState<string[]>([]);

  const ausgewaehlteAnnahmestelle =
    useMemo(
      () =>
        annahmestellen.find(
          (annahmestelle) =>
            String(annahmestelle.id) ===
            ausgewaehlteAnnahmestelleId,
        ) ?? null,
      [
        annahmestellen,
        ausgewaehlteAnnahmestelleId,
      ],
    );

  useEffect(() => {
    let istAktiv = true;

    async function datenLaden() {
      setWirdGeladen(true);
      setFehler("");

      const [
        annahmestellenErgebnis,
        sammelErgebnis,
      ] = await Promise.all([
        supabase
          .from("annahmestellen")
          .select("id, name")
          .eq("aktiv", true)
          .order("name", {
            ascending: true,
          }),
        supabase
          .from("offene_sammelscheine")
          .select(
            "id, annahmestelle_id, nummer, status, erstellt_am",
          )
          .eq("status", "offen")
          .order("erstellt_am", {
            ascending: false,
          }),
      ]);

      if (!istAktiv) return;

      if (annahmestellenErgebnis.error) {
        setFehler(
          annahmestellenErgebnis.error.message,
        );
        setWirdGeladen(false);
        return;
      }

      if (sammelErgebnis.error) {
        setFehler(
          sammelErgebnis.error.message,
        );
        setWirdGeladen(false);
        return;
      }

      const geladeneAnnahmestellen =
        (annahmestellenErgebnis.data as
          | Annahmestelle[]
          | null) ?? [];

      const geladeneSammelscheine =
        (sammelErgebnis.data as
          | OffenerSammelschein[]
          | null) ?? [];

      setAnnahmestellen(
        geladeneAnnahmestellen,
      );

      setOffeneSammelscheine(
        geladeneSammelscheine,
      );

      if (
        geladeneAnnahmestellen.length > 0
      ) {
        setAusgewaehlteAnnahmestelleId(
          String(
            geladeneAnnahmestellen[0].id,
          ),
        );
      }

      setWirdGeladen(false);
    }

    void datenLaden();

    return () => {
      istAktiv = false;
    };
  }, []);

  const sichtbareSammelscheine =
    useMemo(
      () =>
        offeneSammelscheine.filter(
          (sammelschein) =>
            String(
              sammelscheinAnnahmestelleId(
                sammelschein,
              ),
            ) ===
            ausgewaehlteAnnahmestelleId,
        ),
      [
        offeneSammelscheine,
        ausgewaehlteAnnahmestelleId,
      ],
    );

  function sammelscheinAnnahmestelleId(
    sammelschein: OffenerSammelschein,
  ) {
    return sammelschein.annahmestelle_id;
  }

  async function oberenBildbereichErstellen(
    datei: File,
  ): Promise<Blob | File> {
    try {
      const bild =
        await createImageBitmap(datei);

      const ausschnittHoehe = Math.max(
        1,
        Math.round(bild.height * 0.45),
      );

      const zielBreite = Math.min(
        1800,
        Math.max(1000, bild.width),
      );

      const faktor =
        zielBreite / bild.width;

      const canvas =
        document.createElement("canvas");

      canvas.width = Math.round(
        bild.width * faktor,
      );

      canvas.height = Math.round(
        ausschnittHoehe * faktor,
      );

      const context =
        canvas.getContext("2d");

      if (!context) {
        bild.close();
        return datei;
      }

      context.drawImage(
        bild,
        0,
        0,
        bild.width,
        ausschnittHoehe,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      bild.close();

      const blob =
        await new Promise<Blob | null>(
          (resolve) =>
            canvas.toBlob(
              resolve,
              "image/jpeg",
              0.92,
            ),
        );

      return blob ?? datei;
    } catch {
      return datei;
    }
  }

  function nummernAusTextErmitteln(
    erkannterText: string,
  ) {
    const direkteTreffer =
      erkannterText.match(
        /\d{3,10}/g,
      ) ?? [];

    const zeilenTreffer =
      erkannterText
        .split(/\r?\n/)
        .map((zeile) =>
          zeile.replace(/\D/g, ""),
        )
        .filter(
          (wert) =>
            wert.length >= 3 &&
            wert.length <= 10,
        );

    return Array.from(
      new Set([
        ...direkteTreffer,
        ...zeilenTreffer,
      ]),
    );
  }

  async function fotoAuswerten(
    datei: File,
  ) {
    if (!datei.type.startsWith("image/")) {
      alert(
        "Bitte ein Foto oder eine Bilddatei auswählen.",
      );
      return;
    }

    setFotoWirdErkannt(true);
    setOcrFortschritt(0);
    setFehler("");
    setErfolg("");
    setErkannteNummern([]);

    const vorschauUrl =
      URL.createObjectURL(datei);

    setFotoVorschau(
      (vorherigeVorschau) => {
        if (vorherigeVorschau) {
          URL.revokeObjectURL(
            vorherigeVorschau,
          );
        }

        return vorschauUrl;
      },
    );

    try {
      const {
        createWorker,
        PSM,
      } = await import(
        "tesseract.js"
      );

      const worker =
        await createWorker(
          "eng",
          1,
          {
            logger: (meldung) => {
              if (
                typeof meldung.progress ===
                "number"
              ) {
                setOcrFortschritt(
                  Math.round(
                    meldung.progress * 100,
                  ),
                );
              }
            },
          },
        );

      await worker.setParameters({
        tessedit_char_whitelist:
          "0123456789",
        tessedit_pageseg_mode:
          PSM.SPARSE_TEXT,
      });

      const bildAusschnitt =
        await oberenBildbereichErstellen(
          datei,
        );

      const ergebnis =
        await worker.recognize(
          bildAusschnitt,
        );

      await worker.terminate();

      const gefundeneNummern =
        nummernAusTextErmitteln(
          ergebnis.data.text,
        );

      setErkannteNummern(
        gefundeneNummern,
      );

      if (
        gefundeneNummern.length === 0
      ) {
        setFehler(
          "Es wurde keine eindeutige Nummer erkannt. Du kannst die Nummer weiterhin manuell eingeben oder ein neues Foto aufnehmen.",
        );
        return;
      }

      setNummer(
        gefundeneNummern[0],
      );

      setErfolg(
        `Erkannte Nummer: ${gefundeneNummern[0]}. Bitte vor dem Speichern prüfen.`,
      );
    } catch (error) {
      const meldung =
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler";

      setFehler(
        `Die Fotoerkennung ist fehlgeschlagen: ${meldung}`,
      );
    } finally {
      setFotoWirdErkannt(false);
    }
  }

  async function nummerSpeichern() {
    const bereinigteNummer =
      nummer.trim();

    if (!ausgewaehlteAnnahmestelleId) {
      alert(
        "Bitte zuerst eine Annahmestelle auswählen.",
      );
      return;
    }

    if (!bereinigteNummer) {
      alert(
        "Bitte eine Sammelschein-Nummer eingeben.",
      );
      return;
    }

    const bereitsVorhanden =
      offeneSammelscheine.some(
        (sammelschein) =>
          sammelschein.annahmestelle_id ===
            Number(
              ausgewaehlteAnnahmestelleId,
            ) &&
          sammelschein.nummer ===
            bereinigteNummer &&
          sammelschein.status === "offen",
      );

    if (bereitsVorhanden) {
      alert(
        "Diese Nummer ist für die Annahmestelle bereits offen.",
      );
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolg("");

    const { data, error } =
      await supabase
        .from("offene_sammelscheine")
        .insert({
          annahmestelle_id: Number(
            ausgewaehlteAnnahmestelleId,
          ),
          nummer: bereinigteNummer,
          status: "offen",
          erkannt_durch_ocr: false,
        })
        .select(
          "id, annahmestelle_id, nummer, status, erstellt_am",
        )
        .single();

    if (error || !data) {
      setFehler(
        error?.message ??
          "Die Nummer konnte nicht gespeichert werden.",
      );
      setSpeichert(false);
      return;
    }

    setOffeneSammelscheine(
      (aktuelleSammelscheine) => [
        data as OffenerSammelschein,
        ...aktuelleSammelscheine,
      ],
    );

    setNummer("");
    setErfolg(
      `Sammelschein ${bereinigteNummer} wurde gespeichert.`,
    );
    setSpeichert(false);
  }

  async function nummerLoeschen(
    sammelschein: OffenerSammelschein,
  ) {
    const bestaetigt = window.confirm(
      `Soll die offene Nummer ${sammelschein.nummer} entfernt werden?`,
    );

    if (!bestaetigt) return;

    setFehler("");
    setErfolg("");

    const { error } = await supabase
      .from("offene_sammelscheine")
      .delete()
      .eq("id", sammelschein.id);

    if (error) {
      setFehler(error.message);
      return;
    }

    setOffeneSammelscheine(
      (aktuelleSammelscheine) =>
        aktuelleSammelscheine.filter(
          (eintrag) =>
            eintrag.id !==
            sammelschein.id,
        ),
    );
  }

  return (
    <ZugriffsSchutz
      berechtigung="kasse_anzeigen"
      titel="Sammelschein-Eingang gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Sammelscheine erfassen."
      zurueckLink="/"
      zurueckText="Zur Startseite"
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Washly
              </p>

              <h1 className="text-2xl font-bold">
                Sammelschein-Eingang
              </h1>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-slate-600 px-4 py-2 font-semibold"
            >
              Zur Startseite
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {fehler && (
            <div className="mb-5 rounded-xl bg-red-100 p-4 text-red-800">
              {fehler}
            </div>
          )}

          {erfolg && (
            <div className="mb-5 rounded-xl bg-green-100 p-4 text-green-800">
              {erfolg}
            </div>
          )}

          <section className="rounded-3xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Wareneingang
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Offene Nummer erfassen
            </h2>

            <p className="mt-2 text-slate-600">
              Zuerst erfassen wir die Nummer manuell. Im nächsten Schritt kommt die Fotoerkennung dazu.
            </p>

            {wirdGeladen ? (
              <p className="mt-6 text-slate-600">
                Daten werden geladen ...
              </p>
            ) : (
              <>
                <label className="mt-6 block">
                  <span className="text-sm font-medium text-slate-700">
                    Annahmestelle
                  </span>

                  <select
                    value={
                      ausgewaehlteAnnahmestelleId
                    }
                    onChange={(event) => {
                      setAusgewaehlteAnnahmestelleId(
                        event.target.value,
                      );
                      setErfolg("");
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  >
                    {annahmestellen.map(
                      (annahmestelle) => (
                        <option
                          key={annahmestelle.id}
                          value={annahmestelle.id}
                        >
                          {annahmestelle.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        Nummer per Foto erkennen
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Fotografiere den oberen Bereich des Sammelscheins möglichst gerade und gut beleuchtet.
                      </p>
                    </div>

                    <label className={`cursor-pointer rounded-xl px-5 py-3 font-bold text-white ${
                      fotoWirdErkannt
                        ? "bg-slate-400"
                        : "bg-blue-700"
                    }`}>
                      {fotoWirdErkannt
                        ? `Erkennung ${ocrFortschritt} %`
                        : "📷 Foto aufnehmen"}

                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={
                          fotoWirdErkannt
                        }
                        onChange={(event) => {
                          const datei =
                            event.target
                              .files?.[0];

                          if (datei) {
                            void fotoAuswerten(
                              datei,
                            );
                          }

                          event.target.value =
                            "";
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {fotoWirdErkannt && (
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full bg-blue-700 transition-all"
                        style={{
                          width: `${ocrFortschritt}%`,
                        }}
                      />
                    </div>
                  )}

                  {fotoVorschau && (
                    <img
                      src={fotoVorschau}
                      alt="Aufgenommener Sammelschein"
                      className="mt-4 max-h-64 w-full rounded-xl object-contain"
                    />
                  )}

                  {erkannteNummern.length >
                    1 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Mehrere Nummern erkannt – richtige Nummer auswählen:
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {erkannteNummern.map(
                          (
                            erkannteNummer,
                          ) => (
                            <button
                              key={
                                erkannteNummer
                              }
                              type="button"
                              onClick={() =>
                                setNummer(
                                  erkannteNummer,
                                )
                              }
                              className={`rounded-xl border px-4 py-2 font-bold ${
                                nummer ===
                                erkannteNummer
                                  ? "border-blue-700 bg-blue-700 text-white"
                                  : "border-blue-300 bg-white text-blue-800"
                              }`}
                            >
                              {
                                erkannteNummer
                              }
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nummer}
                    onChange={(event) =>
                      setNummer(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        void nummerSpeichern();
                      }
                    }}
                    placeholder="Sammelschein-Nummer"
                    autoFocus
                    className="min-w-0 flex-1 rounded-xl border-2 border-blue-300 px-4 py-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-700"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void nummerSpeichern()
                    }
                    disabled={speichert}
                    className="rounded-xl bg-blue-700 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {speichert
                      ? "Speichert ..."
                      : "Nummer speichern"}
                  </button>
                </div>
              </>
            )}
          </section>

          {!wirdGeladen &&
            ausgewaehlteAnnahmestelle && (
              <section className="mt-8 rounded-3xl bg-white p-6 shadow sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Offene Sammelscheine
                    </h2>

                    <p className="mt-1 text-slate-600">
                      {
                        ausgewaehlteAnnahmestelle.name
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 font-bold text-blue-800">
                    {
                      sichtbareSammelscheine.length
                    }{" "}
                    offen
                  </span>
                </div>

                {sichtbareSammelscheine.length ===
                0 ? (
                  <div className="mt-6 rounded-xl bg-slate-100 p-5 text-slate-600">
                    Für diese Annahmestelle sind aktuell keine offenen Nummern gespeichert.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {sichtbareSammelscheine.map(
                      (sammelschein) => (
                        <div
                          key={sammelschein.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                        >
                          <span className="text-lg font-bold text-slate-900">
                            {sammelschein.nummer}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              void nummerLoeschen(
                                sammelschein,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
                          >
                            Entfernen
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            )}
        </div>
      </main>
    </ZugriffsSchutz>
  );
}