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
  nurAdmin?: boolean;
};

const hauptNavigation: NavigationsEintrag[] = [
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
    href: "/chat",
    name: "Chat",
    berechtigung: "chat_anzeigen",
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
];

const weitereNavigation: NavigationsEintrag[] = [
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
    href: "/annahmestellen",
    name: "Annahmestellen",
    berechtigung: "annahmestellen_anzeigen",
  },
  {
    href: "/benutzer",
    name: "Benutzer",
    berechtigung: "benutzer_anzeigen",
  },
  {
    href: "/artikel",
    name: "Artikelverwaltung",
    berechtigung: "dashboard_anzeigen",
    nurAdmin: true,
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

  const [
    mehrIstOffen,
    setMehrIstOffen,
  ] = useState(false);

  const [
    mobilIstOffen,
    setMobilIstOffen,
  ] = useState(false);

  const {
    aktuellerBenutzer,
    laedt,
    fehler,
    istAngemeldet,
    abmelden,
    hatAktuellerBenutzerBerechtigung,
  } = useBenutzer();

  const sichtbareHauptNavigation =
    hauptNavigation.filter(
      (eintrag) =>
        hatAktuellerBenutzerBerechtigung(
          eintrag.berechtigung,
        ),
    );

  const sichtbareWeitereNavigation =
    weitereNavigation.filter(
      (eintrag) =>
        hatAktuellerBenutzerBerechtigung(
          eintrag.berechtigung,
        ) &&
        (!eintrag.nurAdmin ||
          aktuellerBenutzer?.rolle === "admin"),
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
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="shrink-0 text-xl font-bold text-slate-950"
            onClick={() => {
              setMehrIstOffen(false);
              setMobilIstOffen(false);
            }}
          >
            Washly
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {sichtbareHauptNavigation.map(
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
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() =>
                      setMehrIstOffen(false)
                    }
                  >
                    {eintrag.name}
                  </Link>
                );
              },
            )}

            {sichtbareWeitereNavigation.length >
              0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setMehrIstOffen(
                      (istOffen) => !istOffen,
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    sichtbareWeitereNavigation.some(
                      (eintrag) =>
                        linkIstAktiv(
                          pathname,
                          eintrag.href,
                        ),
                    )
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Mehr
                  <span className="ml-2">
                    {mehrIstOffen ? "▲" : "▼"}
                  </span>
                </button>

                {mehrIstOffen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {sichtbareWeitereNavigation.map(
                      (eintrag) => (
                        <Link
                          key={eintrag.href}
                          href={eintrag.href}
                          onClick={() =>
                            setMehrIstOffen(false)
                          }
                          className={`block rounded-xl px-4 py-3 text-sm font-bold ${
                            linkIstAktiv(
                              pathname,
                              eintrag.href,
                            )
                              ? "bg-slate-950 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {eintrag.name}
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {laedt && (
              <div className="hidden rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 sm:block">
                Anmeldung wird geprüft ...
              </div>
            )}

            {!laedt && fehler && (
              <div className="hidden rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-800 md:block">
                {fehler}
              </div>
            )}

            {!laedt &&
              aktuellerBenutzer && (
                <div className="hidden rounded-xl bg-slate-100 px-3 py-2 text-sm xl:block">
                  <p className="font-bold text-slate-900">
                    {benutzerNameErmitteln(
                      aktuellerBenutzer.vorname,
                      aktuellerBenutzer.nachname,
                      aktuellerBenutzer.benutzername,
                    )}
                  </p>

                  <p className="text-xs text-slate-600">
                    {rolleFormatieren(
                      aktuellerBenutzer.rolle,
                    )}
                  </p>
                </div>
              )}

            {!laedt &&
              aktuellerBenutzer && (
                <button
                  type="button"
                  onClick={() =>
                    void benutzerAbmelden()
                  }
                  disabled={meldetAb}
                  className="hidden rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:block"
                >
                  {meldetAb
                    ? "..."
                    : "Abmelden"}
                </button>
              )}

            {!laedt &&
              !istAngemeldet && (
                <Link
                  href="/login"
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                >
                  Anmelden
                </Link>
              )}

            {aktuellerBenutzer && (
              <button
                type="button"
                onClick={() =>
                  setMobilIstOffen(
                    (istOffen) => !istOffen,
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 lg:hidden"
                aria-label="Menü öffnen"
              >
                {mobilIstOffen ? "Schließen" : "Menü"}
              </button>
            )}
          </div>
        </div>

        {abmeldeFehler && (
          <div className="mt-3 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
            {abmeldeFehler}
          </div>
        )}

        {aktuellerBenutzer &&
          mobilIstOffen && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:hidden">
            <div className="mb-3 rounded-xl bg-white px-4 py-3">
              <p className="font-bold text-slate-900">
                {benutzerNameErmitteln(
                  aktuellerBenutzer.vorname,
                  aktuellerBenutzer.nachname,
                  aktuellerBenutzer.benutzername,
                )}
              </p>

              <p className="text-sm text-slate-600">
                {rolleFormatieren(
                  aktuellerBenutzer.rolle,
                )}
                {" · "}@
                {
                  aktuellerBenutzer.benutzername
                }
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ...sichtbareHauptNavigation,
                ...sichtbareWeitereNavigation,
              ].map((eintrag) => (
                <Link
                  key={eintrag.href}
                  href={eintrag.href}
                  onClick={() =>
                    setMobilIstOffen(false)
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    linkIstAktiv(
                      pathname,
                      eintrag.href,
                    )
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-700"
                  }`}
                >
                  {eintrag.name}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                void benutzerAbmelden()
              }
              disabled={meldetAb}
              className="mt-3 w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {meldetAb
                ? "Abmeldung läuft ..."
                : "Abmelden"}
            </button>
          </div>
        )}

        {!laedt &&
          istAngemeldet &&
          !aktuellerBenutzer &&
          !fehler && (
          <div className="mt-3 rounded-xl bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-800">
            Kein verknüpfter aktiver Benutzer
          </div>
        )}
      </div>
    </nav>
  );
}