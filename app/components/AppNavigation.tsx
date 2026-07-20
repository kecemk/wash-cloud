"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useState } from "react";
import { useBenutzer } from "../context/BenutzerContext";
import {
  Berechtigung,
  rolleFormatieren,
} from "../lib/rechte";

type NavigationsEintrag = {
  href: string;
  name: string;
  berechtigung: Berechtigung;
};

const navigationsEintraege: NavigationsEintrag[] = [
  {
    href: "/",
    name: "Startseite",
    berechtigung: "dashboard_anzeigen",
  },
  {
    href: "/lieferscheine",
    name: "Lieferscheine",
    berechtigung: "lieferscheine_anzeigen",
  },
  {
    href: "/lieferungen",
    name: "Lieferungen",
    berechtigung: "lieferungen_anzeigen",
  },
  {
    href: "/kunden",
    name: "Kunden",
    berechtigung: "kunden_anzeigen",
  },
  {
    href: "/rechnungen",
    name: "Rechnungen",
    berechtigung: "rechnungen_anzeigen",
  },
  {
    href: "/lager",
    name: "Lager",
    berechtigung: "lager_anzeigen",
  },
  {
    href: "/chat",
    name: "Chat",
    berechtigung: "chat_anzeigen",
  },
  {
    href: "/annahmestellen",
    name: "Annahmestellen",
    berechtigung: "annahmestellen_anzeigen",
  },
  {
    href: "/benutzer",
    name: "Benutzer",
    berechtigung: "benutzer_anzeigen",
  },
];

function benutzerNameErmitteln(
  vorname: string,
  nachname: string,
  benutzername: string,
) {
  const name = [
    vorname,
    nachname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || benutzername;
}

function linkIstAktiv(
  aktuellerPfad: string,
  href: string,
) {
  if (href === "/") {
    return aktuellerPfad === "/";
  }

  return (
    aktuellerPfad === href ||
    aktuellerPfad.startsWith(
      `${href}/`,
    )
  );
}

export default function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const [
    meldetAb,
    setMeldetAb,
  ] = useState(false);

  const [
    abmeldeFehler,
    setAbmeldeFehler,
  ] = useState("");

  const {
    aktuellerBenutzer,
    laedt,
    fehler,
    istAngemeldet,
    abmelden,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const sichtbareNavigation =
    navigationsEintraege.filter(
      (eintrag) =>
        hatAktuellerBenutzerBerechtigung(
          eintrag.berechtigung,
        ),
    );

  async function benutzerAbmelden() {
    if (meldetAb) {
      return;
    }

    setMeldetAb(true);
    setAbmeldeFehler("");

    try {
      await abmelden();
      router.replace(
        "/login?grund=abgemeldet",
      );
      router.refresh();
    } catch (unbekannterFehler) {
      console.error(
        "Die Abmeldung ist fehlgeschlagen:",
        unbekannterFehler,
      );

      setAbmeldeFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Abmeldung ist fehlgeschlagen.",
      );
    } finally {
      setMeldetAb(false);
    }
  }

  const navigationAusblenden =
    pathname === "/login" ||
    pathname ===
      "/passwort-zuruecksetzen";

  if (navigationAusblenden) {
    return null;
  }

  return (
    <nav className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xl font-bold text-slate-950"
          >
            ☁ Wash Cloud
          </Link>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
            {laedt && (
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                Anmeldung wird geprüft ...
              </div>
            )}

            {!laedt && fehler && (
              <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
                {fehler}
              </div>
            )}

            {!laedt &&
              aktuellerBenutzer && (
                <>
                  <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm">
                    <p className="font-bold text-slate-900">
                      {benutzerNameErmitteln(
                        aktuellerBenutzer.vorname,
                        aktuellerBenutzer.nachname,
                        aktuellerBenutzer.benutzername,
                      )}
                    </p>

                    <p className="text-slate-600">
                      {rolleFormatieren(
                        aktuellerBenutzer.rolle,
                      )}
                      {" · "}@
                      {
                        aktuellerBenutzer.benutzername
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void benutzerAbmelden()
                    }
                    disabled={meldetAb}
                    className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {meldetAb
                      ? "Abmeldung läuft ..."
                      : "Abmelden"}
                  </button>
                </>
              )}

            {!laedt &&
              !istAngemeldet && (
                <Link
                  href="/login"
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                >
                  Anmelden
                </Link>
              )}

            {!laedt &&
              istAngemeldet &&
              !aktuellerBenutzer &&
              !fehler && (
                <div className="rounded-xl bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-800">
                  Kein verknüpfter aktiver Benutzer
                </div>
              )}
          </div>
        </div>

        {abmeldeFehler && (
          <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
            {abmeldeFehler}
          </div>
        )}

        {aktuellerBenutzer && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sichtbareNavigation.map(
              (eintrag) => {
                const istAktiv =
                  linkIstAktiv(
                    pathname,
                    eintrag.href,
                  );

                return (
                  <Link
                    key={eintrag.href}
                    href={eintrag.href}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      istAktiv
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {eintrag.name}
                  </Link>
                );
              },
            )}
          </div>
        )}
      </div>
    </nav>
  );
}