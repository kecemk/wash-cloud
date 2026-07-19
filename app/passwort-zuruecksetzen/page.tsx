"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Ansicht =
  | "laedt"
  | "anfordern"
  | "neues-passwort"
  | "erfolg";

const RESET_ADRESSE =
  "http://localhost:3000/passwort-zuruecksetzen";

export default function PasswortZuruecksetzenPage() {
  const [ansicht, setAnsicht] =
    useState<Ansicht>("laedt");

  const [email, setEmail] =
    useState("");

  const [passwort, setPasswort] =
    useState("");

  const [passwortWiederholung, setPasswortWiederholung] =
    useState("");

  const [verarbeitet, setVerarbeitet] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const [meldung, setMeldung] =
    useState("");

  useEffect(() => {
    let istAktiv = true;

    async function sitzungPruefen() {
      const { data } =
        await supabase.auth.getSession();

      if (!istAktiv) {
        return;
      }

      setAnsicht(
        data.session
          ? "neues-passwort"
          : "anfordern",
      );
    }

    void sitzungPruefen();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (ereignis, sitzung) => {
        if (!istAktiv) {
          return;
        }

        if (
          ereignis === "PASSWORD_RECOVERY" ||
          sitzung
        ) {
          setAnsicht("neues-passwort");
          setFehler("");
        }
      },
    );

    return () => {
      istAktiv = false;
      subscription.unsubscribe();
    };
  }, []);

  async function resetAnfordern(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (verarbeitet) {
      return;
    }

    const bereinigteEmail =
      email.trim().toLowerCase();

    if (!bereinigteEmail) {
      setFehler(
        "Bitte gib deine E-Mail-Adresse ein.",
      );
      return;
    }

    setVerarbeitet(true);
    setFehler("");
    setMeldung("");

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          bereinigteEmail,
          {
            redirectTo: RESET_ADRESSE,
          },
        );

      if (error) {
        throw error;
      }

      setMeldung(
        "Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine Nachricht zum Zurücksetzen des Passworts versendet.",
      );
    } catch (unbekannterFehler) {
      console.error(
        "Passwort-Reset konnte nicht angefordert werden:",
        unbekannterFehler,
      );

      setFehler(
        "Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es später erneut.",
      );
    } finally {
      setVerarbeitet(false);
    }
  }

  async function passwortSpeichern(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (verarbeitet) {
      return;
    }

    if (passwort.length < 8) {
      setFehler(
        "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
      );
      return;
    }

    if (passwort !== passwortWiederholung) {
      setFehler(
        "Die beiden Passwörter stimmen nicht überein.",
      );
      return;
    }

    setVerarbeitet(true);
    setFehler("");
    setMeldung("");

    try {
      const { error } =
        await supabase.auth.updateUser({
          password: passwort,
        });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      setPasswort("");
      setPasswortWiederholung("");
      setAnsicht("erfolg");
    } catch (unbekannterFehler) {
      console.error(
        "Das Passwort konnte nicht gespeichert werden:",
        unbekannterFehler,
      );

      setFehler(
        "Der Link ist möglicherweise abgelaufen oder ungültig. Fordere bitte einen neuen Link an.",
      );
    } finally {
      setVerarbeitet(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          Wash Cloud
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Passwort zurücksetzen
        </h1>

        {ansicht === "laedt" && (
          <p className="mt-4 text-slate-600">
            Reset-Link wird geprüft ...
          </p>
        )}

        {ansicht === "anfordern" && (
          <>
            <p className="mt-2 text-slate-600">
              Gib deine E-Mail-Adresse ein. Du erhältst anschließend einen Link zum Festlegen eines neuen Passworts.
            </p>

            <form
              onSubmit={resetAnfordern}
              className="mt-8 space-y-5"
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  E-Mail-Adresse
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFehler("");
                    setMeldung("");
                  }}
                  autoComplete="email"
                  autoFocus
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="name@firma.de"
                />
              </label>

              <button
                type="submit"
                disabled={verarbeitet}
                className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verarbeitet
                  ? "Anfrage läuft ..."
                  : "Reset-Link senden"}
              </button>
            </form>
          </>
        )}

        {ansicht === "neues-passwort" && (
          <>
            <p className="mt-2 text-slate-600">
              Lege jetzt ein neues Passwort für dein Konto fest.
            </p>

            <form
              onSubmit={passwortSpeichern}
              className="mt-8 space-y-5"
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Neues Passwort
                </span>

                <input
                  type="password"
                  value={passwort}
                  onChange={(event) => {
                    setPasswort(event.target.value);
                    setFehler("");
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  autoFocus
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="Mindestens 8 Zeichen"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Passwort wiederholen
                </span>

                <input
                  type="password"
                  value={passwortWiederholung}
                  onChange={(event) => {
                    setPasswortWiederholung(
                      event.target.value,
                    );
                    setFehler("");
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="Passwort wiederholen"
                />
              </label>

              <button
                type="submit"
                disabled={verarbeitet}
                className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verarbeitet
                  ? "Passwort wird gespeichert ..."
                  : "Neues Passwort speichern"}
              </button>
            </form>
          </>
        )}

        {ansicht === "erfolg" && (
          <div className="mt-6 rounded-xl bg-green-100 p-4 text-sm text-green-900">
            <p className="font-bold">
              Passwort geändert
            </p>

            <p className="mt-1">
              Du kannst dich jetzt mit deinem neuen Passwort anmelden.
            </p>
          </div>
        )}

        {meldung && (
          <div className="mt-6 rounded-xl bg-green-100 p-4 text-sm text-green-900">
            <p className="font-bold">
              Anfrage versendet
            </p>

            <p className="mt-1">
              {meldung}
            </p>
          </div>
        )}

        {fehler && (
          <div className="mt-6 rounded-xl bg-red-100 p-4 text-sm text-red-800">
            <p className="font-bold">
              Vorgang fehlgeschlagen
            </p>

            <p className="mt-1">
              {fehler}
            </p>
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:underline"
          >
            Zurück zur Anmeldung
          </Link>
        </div>
      </section>
    </main>
  );
}