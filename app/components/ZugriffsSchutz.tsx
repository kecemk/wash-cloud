"use client";

import Link from "next/link";
import {
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { useBenutzer } from "../context/BenutzerContext";
import {
  Berechtigung,
  rolleFormatieren,
} from "../lib/rechte";

type ZugriffsSchutzProps = {
  berechtigung: Berechtigung;
  children: ReactNode;
  titel?: string;
  beschreibung?: string;
  zurueckLink?: string;
  zurueckText?: string;
};

export default function ZugriffsSchutz({
  berechtigung,
  children,
  titel = "Kein Zugriff",
  beschreibung =
    "Der angemeldete Benutzer besitzt nicht die erforderliche Berechtigung für diesen Bereich.",
  zurueckLink = "/",
  zurueckText = "Zur Startseite",
}: ZugriffsSchutzProps) {
  const router = useRouter();

  const {
    aktuellerBenutzer,
    laedt,
    fehler,
    istAngemeldet,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const hatZugriff = useMemo(
    () =>
      hatAktuellerBenutzerBerechtigung(
        berechtigung,
      ),
    [
      berechtigung,
      hatAktuellerBenutzerBerechtigung,
    ],
  );

  useEffect(() => {
    if (
      !laedt &&
      !istAngemeldet
    ) {
      router.replace("/login");
    }
  }, [
    istAngemeldet,
    laedt,
    router,
  ]);

  if (laedt) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-slate-900">
              Anmeldung wird geprüft
            </h1>

            <p className="mt-2 text-slate-600">
              Die Benutzer- und Berechtigungsdaten werden geladen ...
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!istAngemeldet) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-slate-900">
              Weiterleitung zur Anmeldung
            </h1>

            <p className="mt-2 text-slate-600">
              Du musst angemeldet sein, um diesen Bereich zu öffnen.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
            >
              Zur Anmeldung
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (fehler) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl bg-red-100 p-8 text-red-800 shadow">
            <h1 className="text-2xl font-bold">
              Benutzer konnte nicht geladen werden
            </h1>

            <p className="mt-2">
              {fehler}
            </p>

            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-red-800 px-5 py-3 font-bold text-white"
            >
              Zur Anmeldung
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!aktuellerBenutzer) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl bg-orange-100 p-8 text-orange-800 shadow">
            <h1 className="text-2xl font-bold">
              Kein interner Benutzer verknüpft
            </h1>

            <p className="mt-2">
              Das angemeldete Supabase-Konto ist keinem aktiven Benutzer in Wash Cloud zugeordnet.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-orange-800 px-5 py-3 font-bold text-white"
            >
              Zur Anmeldung
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!hatZugriff) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Zugriff verweigert
            </h1>
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 shadow">
            <div className="rounded-xl bg-red-100 p-5 text-red-800">
              <h2 className="text-2xl font-bold">
                {titel}
              </h2>

              <p className="mt-2">
                {beschreibung}
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-slate-100 p-5">
              <p className="text-sm text-slate-600">
                Angemeldeter Benutzer
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                @{aktuellerBenutzer.benutzername}
              </p>

              <p className="mt-1 text-slate-700">
                Rolle:{" "}
                {rolleFormatieren(
                  aktuellerBenutzer.rolle,
                )}
              </p>
            </div>

            <Link
              href={zurueckLink}
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
            >
              {zurueckText}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}