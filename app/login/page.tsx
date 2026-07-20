"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../lib/supabase";
import { useBenutzer } from "../context/BenutzerContext";

function sichereZielseiteErmitteln(
  ziel: string | null,
) {
  if (
    !ziel ||
    !ziel.startsWith("/") ||
    ziel.startsWith("//") ||
    ziel.startsWith("/login")
  ) {
    return "/";
  }

  return ziel;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    aktuellerBenutzer,
    istAngemeldet,
    laedt,
  } = useBenutzer();

  const [email, setEmail] =
    useState("");

  const [passwort, setPasswort] =
    useState("");

  const [meldetAn, setMeldetAn] =
    useState(false);

  const [fehler, setFehler] =
    useState("");

  const zielseite = useMemo(
    () =>
      sichereZielseiteErmitteln(
        searchParams.get("next"),
      ),
    [searchParams],
  );

  const hinweis = useMemo(() => {
    const grund =
      searchParams.get("grund");

    if (grund === "abgelaufen") {
      return "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";
    }

    if (grund === "abgemeldet") {
      return "Du wurdest erfolgreich abgemeldet.";
    }

    if (searchParams.get("next")) {
      return "Bitte melde dich an, um die gewünschte Seite zu öffnen.";
    }

    return "";
  }, [searchParams]);

  useEffect(() => {
    if (
      !laedt &&
      istAngemeldet &&
      aktuellerBenutzer
    ) {
      router.replace(zielseite);
    }
  }, [
    aktuellerBenutzer,
    istAngemeldet,
    laedt,
    router,
    zielseite,
  ]);

  async function anmelden(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (meldetAn) {
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

    if (!passwort) {
      setFehler(
        "Bitte gib dein Passwort ein.",
      );
      return;
    }

    setMeldetAn(true);
    setFehler("");

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: bereinigteEmail,
          password: passwort,
        });

      if (error) {
        throw new Error(
          "E-Mail-Adresse oder Passwort ist nicht korrekt.",
        );
      }

      router.replace(zielseite);
      router.refresh();
    } catch (unbekannterFehler) {
      console.error(
        "Die Anmeldung ist fehlgeschlagen:",
        unbekannterFehler,
      );

      setFehler(
        unbekannterFehler instanceof Error
          ? unbekannterFehler.message
          : "Die Anmeldung ist fehlgeschlagen.",
      );
    } finally {
      setMeldetAn(false);
    }
  }

  if (laedt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-950">
            Anmeldung wird geprüft
          </h1>

          <p className="mt-2 text-slate-600">
            Bitte einen Moment warten ...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            Washly
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Anmeldung
          </h1>

          <p className="mt-2 text-slate-600">
            Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.
          </p>
        </div>

        {hinweis && (
          <div className="mt-6 rounded-xl bg-blue-100 p-4 text-sm text-blue-900">
            <p className="font-bold">
              Hinweis
            </p>

            <p className="mt-1">
              {hinweis}
            </p>
          </div>
        )}

        {fehler && (
          <div className="mt-6 rounded-xl bg-red-100 p-4 text-sm text-red-800">
            <p className="font-bold">
              Anmeldung fehlgeschlagen
            </p>

            <p className="mt-1">
              {fehler}
            </p>
          </div>
        )}

        <form
          onSubmit={anmelden}
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
              }}
              autoComplete="email"
              autoFocus
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="name@firma.de"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">
                Passwort
              </span>

              <Link
                href="/passwort-zuruecksetzen"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Passwort vergessen?
              </Link>
            </span>

            <input
              type="password"
              value={passwort}
              onChange={(event) => {
                setPasswort(event.target.value);
                setFehler("");
              }}
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Passwort"
            />
          </label>

          <button
            type="submit"
            disabled={meldetAn}
            className="w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {meldetAn
              ? "Anmeldung läuft ..."
              : "Anmelden"}
          </button>
        </form>
      </section>
    </main>
  );
}