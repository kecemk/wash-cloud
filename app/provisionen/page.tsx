"use client";

import { useEffect, useMemo, useState } from "react";
import { useBenutzer } from "../context/BenutzerContext";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
  aktiv: boolean;
};

type Provision = {
  id: number;
  annahmestelle_id: number;
  provisionssatz: number;
  aktiv: boolean;
};

function zahlFormatieren(wert: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(wert);
}

function eingabeZuZahl(wert: string) {
  const bereinigt = wert
    .replace(/\./g, "")
    .replace(",", ".")
    .replace("€", "")
    .trim();

  const zahl = Number(bereinigt);

  return Number.isFinite(zahl) ? zahl : 0;
}

export default function ProvisionenPage() {
  const { aktuellerBenutzer, laedt } = useBenutzer();

  const [annahmestellen, setAnnahmestellen] = useState<Annahmestelle[]>([]);
  const [provisionen, setProvisionen] = useState<Provision[]>([]);
  const [ausgewaehlteId, setAusgewaehlteId] = useState("");
  const [provisionssatz, setProvisionssatz] = useState("");
  const [umsatzBrutto, setUmsatzBrutto] = useState("");
  const [datenWerdenGeladen, setDatenWerdenGeladen] = useState(true);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");

  const istAdmin = aktuellerBenutzer?.rolle === "admin";

  useEffect(() => {
    async function datenLaden() {
      if (!istAdmin) {
        setDatenWerdenGeladen(false);
        return;
      }

      setDatenWerdenGeladen(true);
      setFehler("");

      const [
        { data: annahmestellenDaten, error: annahmestellenFehler },
        { data: provisionsDaten, error: provisionsFehler },
      ] = await Promise.all([
        supabase
          .from("annahmestellen")
          .select("id, name, aktiv")
          .eq("aktiv", true)
          .order("name", { ascending: true }),
        supabase
          .from("annahmestellen_provisionen")
          .select("id, annahmestelle_id, provisionssatz, aktiv")
          .eq("aktiv", true),
      ]);

      if (annahmestellenFehler) {
        setFehler(annahmestellenFehler.message);
        setDatenWerdenGeladen(false);
        return;
      }

      if (provisionsFehler) {
        setFehler(provisionsFehler.message);
        setDatenWerdenGeladen(false);
        return;
      }

      const geladeneAnnahmestellen =
        (annahmestellenDaten as Annahmestelle[] | null) ?? [];
      const geladeneProvisionen =
        (provisionsDaten as Provision[] | null) ?? [];

      setAnnahmestellen(geladeneAnnahmestellen);
      setProvisionen(geladeneProvisionen);

      if (geladeneAnnahmestellen.length > 0) {
        const ersteId = String(geladeneAnnahmestellen[0].id);
        setAusgewaehlteId(ersteId);

        const vorhandeneProvision = geladeneProvisionen.find(
          (eintrag) =>
            eintrag.annahmestelle_id === geladeneAnnahmestellen[0].id,
        );

        setProvisionssatz(
          vorhandeneProvision
            ? String(vorhandeneProvision.provisionssatz).replace(".", ",")
            : "",
        );
      }

      setDatenWerdenGeladen(false);
    }

    if (!laedt) {
      void datenLaden();
    }
  }, [istAdmin, laedt]);

  const ausgewaehlteAnnahmestelle = useMemo(() => {
    const id = Number(ausgewaehlteId);

    return (
      annahmestellen.find((annahmestelle) => annahmestelle.id === id) ?? null
    );
  }, [annahmestellen, ausgewaehlteId]);

  const umsatzBruttoZahl = eingabeZuZahl(umsatzBrutto);
  const provisionssatzZahl = eingabeZuZahl(provisionssatz);

  const umsatzNetto = umsatzBruttoZahl / 1.19;
  const provisionNetto =
    umsatzNetto * (provisionssatzZahl / 100);
  const provisionMwst = provisionNetto * 0.19;
  const provisionBrutto = provisionNetto + provisionMwst;
  const eigenerAnteilNetto = umsatzNetto - provisionNetto;

  function annahmestelleWechseln(neueId: string) {
    setAusgewaehlteId(neueId);
    setErfolg("");
    setFehler("");

    const id = Number(neueId);
    const vorhandeneProvision = provisionen.find(
      (eintrag) => eintrag.annahmestelle_id === id,
    );

    setProvisionssatz(
      vorhandeneProvision
        ? String(vorhandeneProvision.provisionssatz).replace(".", ",")
        : "",
    );
  }

  async function provisionssatzSpeichern() {
    if (!ausgewaehlteAnnahmestelle) {
      setFehler("Bitte zuerst eine Annahmestelle auswählen.");
      return;
    }

    if (
      !Number.isFinite(provisionssatzZahl) ||
      provisionssatzZahl < 0 ||
      provisionssatzZahl > 100
    ) {
      setFehler("Bitte einen Provisionssatz zwischen 0 und 100 eingeben.");
      return;
    }

    setSpeichert(true);
    setFehler("");
    setErfolg("");

    const { data, error } = await supabase
      .from("annahmestellen_provisionen")
      .upsert(
        {
          annahmestelle_id: ausgewaehlteAnnahmestelle.id,
          provisionssatz: provisionssatzZahl,
          aktiv: true,
          aktualisiert_am: new Date().toISOString(),
        },
        {
          onConflict: "annahmestelle_id",
        },
      )
      .select("id, annahmestelle_id, provisionssatz, aktiv")
      .single();

    if (error || !data) {
      setFehler(
        error?.message ?? "Der Provisionssatz konnte nicht gespeichert werden.",
      );
      setSpeichert(false);
      return;
    }

    const gespeicherteProvision = data as Provision;

    setProvisionen((aktuelleProvisionen) => {
      const vorhanden = aktuelleProvisionen.some(
        (eintrag) =>
          eintrag.annahmestelle_id === gespeicherteProvision.annahmestelle_id,
      );

      if (vorhanden) {
        return aktuelleProvisionen.map((eintrag) =>
          eintrag.annahmestelle_id === gespeicherteProvision.annahmestelle_id
            ? gespeicherteProvision
            : eintrag,
        );
      }

      return [...aktuelleProvisionen, gespeicherteProvision];
    });

    setErfolg(
      `Der Provisionssatz für ${ausgewaehlteAnnahmestelle.name} wurde gespeichert.`,
    );
    setSpeichert(false);
  }

  if (laedt) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          Anmeldung wird geprüft ...
        </div>
      </main>
    );
  }

  if (!istAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-900">
            Zugriff nicht erlaubt
          </h1>
          <p className="mt-2 text-red-800">
            Der Provisionsbereich ist ausschließlich für Administratoren sichtbar.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-300">Washly · Nur Admin</p>
          <h1 className="mt-1 text-2xl font-bold">Provisionen</h1>
          <p className="mt-1 text-sm text-slate-300">
            Individuelle Provisionssätze je Annahmestelle berechnen und speichern.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {fehler && (
          <div className="mb-5 rounded-xl bg-red-100 p-4 text-sm font-semibold text-red-800">
            {fehler}
          </div>
        )}

        {erfolg && (
          <div className="mb-5 rounded-xl bg-green-100 p-4 text-sm font-semibold text-green-800">
            {erfolg}
          </div>
        )}

        {datenWerdenGeladen ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            Daten werden geladen ...
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="text-lg font-bold text-slate-950">
                Annahmestelle & Provisionssatz
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="text-sm font-medium text-slate-700">
                    Annahmestelle
                  </span>
                  <select
                    value={ausgewaehlteId}
                    onChange={(event) =>
                      annahmestelleWechseln(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  >
                    {annahmestellen.length === 0 && (
                      <option value="">Keine Annahmestelle vorhanden</option>
                    )}

                    {annahmestellen.map((annahmestelle) => (
                      <option
                        key={annahmestelle.id}
                        value={annahmestelle.id}
                      >
                        {annahmestelle.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-sm font-medium text-slate-700">
                    Provision in %
                  </span>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={provisionssatz}
                      onChange={(event) => {
                        setProvisionssatz(event.target.value);
                        setErfolg("");
                        setFehler("");
                      }}
                      placeholder="z. B. 40"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold text-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => void provisionssatzSpeichern()}
                      disabled={speichert || !ausgewaehlteAnnahmestelle}
                      className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {speichert ? "Speichert ..." : "Speichern"}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Provisionsrechner
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {ausgewaehlteAnnahmestelle?.name ?? "Annahmestelle"}
                </h2>
              </div>

              <label className="mt-5 block max-w-md">
                <span className="text-sm font-medium text-slate-700">
                  Umsatz brutto
                </span>
                <div className="mt-2 flex items-center rounded-xl border-2 border-blue-300 bg-white px-4">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={umsatzBrutto}
                    onChange={(event) => setUmsatzBrutto(event.target.value)}
                    placeholder="z. B. 2.492,00"
                    className="min-w-0 flex-1 py-4 text-2xl font-bold text-slate-950 outline-none"
                  />
                  <span className="font-bold text-slate-600">€</span>
                </div>
              </label>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-600">Umsatz netto</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">
                    {zahlFormatieren(umsatzNetto)} €
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">
                    Provision netto ({zahlFormatieren(provisionssatzZahl)} %)
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-950">
                    {zahlFormatieren(provisionNetto)} €
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    19 % MwSt. auf Provision
                  </p>
                  <p className="mt-1 text-xl font-bold text-amber-950">
                    {zahlFormatieren(provisionMwst)} €
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-sm text-green-700">Provision brutto</p>
                  <p className="mt-1 text-xl font-bold text-green-950">
                    {zahlFormatieren(provisionBrutto)} €
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">
                  Dein verbleibender Anteil netto
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {zahlFormatieren(eigenerAnteilNetto)} €
                </p>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Berechnung: Bruttoumsatz ÷ 1,19 = Nettoumsatz. Die Provision
                wird auf den Nettoumsatz berechnet; anschließend werden 19 %
                MwSt. auf die Provision aufgeschlagen.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
