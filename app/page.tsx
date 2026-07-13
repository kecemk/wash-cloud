import Link from "next/link";
import { supabase } from "./lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
  adresse: string | null;
  telefon: string | null;
  aktiv: boolean;
};

export default async function Home() {
  const { data, error } = await supabase
    .from("annahmestellen")
    .select("id, name, adresse, telefon, aktiv")
    .eq("aktiv", true)
    .order("name", { ascending: true });

  const annahmestellen =
    (data as Annahmestelle[] | null) ?? [];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              ☁ Wash Cloud
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Mitarbeiteransicht
            </p>
          </div>

          <div className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold">
            System online
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-bold text-slate-900">
          Annahmestelle auswählen
        </h2>

        <p className="mt-2 text-slate-600">
          Wähle die Annahmestelle aus, für die ein neuer
          Lieferschein erstellt werden soll.
        </p>

        {error && (
          <div className="mt-8 rounded-2xl bg-red-100 p-5 text-red-800">
            <p className="font-bold">
              Annahmestellen konnten nicht geladen werden.
            </p>

            <p className="mt-2 text-sm">
              {error.message}
            </p>
          </div>
        )}

        {!error && annahmestellen.length === 0 && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow">
            <p className="font-bold text-slate-900">
              Keine aktiven Annahmestellen gefunden
            </p>

            <p className="mt-2 text-slate-600">
              Bitte prüfe die Tabelle „annahmestellen“ in
              Supabase.
            </p>
          </div>
        )}

        {!error && annahmestellen.length > 0 && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {annahmestellen.map((annahmestelle) => (
              <Link
                key={annahmestelle.id}
                href={`/kasse?annahmestelle=${annahmestelle.id}&name=${encodeURIComponent(
                  annahmestelle.name,
                )}`}
                className="rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {annahmestelle.name}
                    </h3>

                    {annahmestelle.adresse && (
                      <p className="mt-3 text-sm text-slate-600">
                        {annahmestelle.adresse}
                      </p>
                    )}

                    {annahmestelle.telefon && (
                      <p className="mt-1 text-sm text-slate-500">
                        Telefon: {annahmestelle.telefon}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Aktiv
                  </span>
                </div>

                <div className="mt-6 font-bold text-blue-600">
                  Kasse öffnen →
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/lieferscheine"
            className="inline-block rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
          >
            Fertige Lieferscheine öffnen
          </Link>
        </div>
      </section>
    </main>
  );
}