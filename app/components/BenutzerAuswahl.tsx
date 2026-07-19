"use client";

import {
  rolleFormatieren,
} from "../lib/rechte";
import { useBenutzer } from "../context/BenutzerContext";

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

export default function BenutzerAuswahl() {
  const {
    aktuellerBenutzer,
    benutzer,
    laedt,
    fehler,
    benutzerAuswaehlen,
  } = useBenutzer();

  if (laedt) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
        Benutzer werden geladen ...
      </div>
    );
  }

  if (fehler) {
    return (
      <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800">
        Benutzer konnten nicht geladen werden.
      </div>
    );
  }

  if (
    benutzer.length === 0 ||
    !aktuellerBenutzer
  ) {
    return (
      <div className="rounded-xl bg-orange-100 px-4 py-3 text-sm text-orange-800">
        Kein aktiver Benutzer vorhanden.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-[260px] flex-1">
          <span className="text-sm font-medium text-slate-700">
            Aktueller Benutzer
          </span>

          <select
            value={aktuellerBenutzer.id}
            onChange={(event) =>
              benutzerAuswaehlen(
                Number(event.target.value),
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          >
            {benutzer.map(
              (benutzerEintrag) => (
                <option
                  key={benutzerEintrag.id}
                  value={benutzerEintrag.id}
                >
                  {benutzerNameErmitteln(
                    benutzerEintrag.vorname,
                    benutzerEintrag.nachname,
                    benutzerEintrag.benutzername,
                  )}{" "}
                  –{" "}
                  {rolleFormatieren(
                    benutzerEintrag.rolle,
                  )}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="min-w-[240px] rounded-xl bg-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">
            Aktive Rolle
          </p>

          <p className="mt-1 font-bold text-slate-900">
            {rolleFormatieren(
              aktuellerBenutzer.rolle,
            )}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            @{aktuellerBenutzer.benutzername}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {aktuellerBenutzer.annahmestelle}
          </p>
        </div>
      </div>
    </div>
  );
}