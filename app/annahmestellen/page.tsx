import Link from "next/link";
import ZugriffsSchutz from "../components/ZugriffsSchutz";
import { supabase } from "../lib/supabase";

type Annahmestelle = {
  id: number;
  name: string;
  adresse: string | null;
  telefon: string | null;
  aktiv: boolean;
};

export default async function AnnahmestellePage() {
  const { data, error } = await supabase
    .from("annahmestellen")
    .select(
      "id, name, adresse, telefon, aktiv",
    )
    .eq("aktiv", true)
    .order("name", {
      ascending: true,
    });

  const annahmestellen =
    (data as Annahmestelle[] | null) ??
    [];

  return (
    <ZugriffsSchutz
      berechtigung="kasse_anzeigen"
      titel="Kasse gesperrt"
      beschreibung="Der aktuell ausgewählte Benutzer darf keine Kasse öffnen und keine Lieferscheine erstellen."
      zurueckLink="/lieferscheine"
      zurueckText="Zu den Lieferscheinen"
    >
      <main className="min-h-screen bg-slate-50">
        <header className="bg-slate-950 px-6 py-5 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm text-slate-300">
              Wash Cloud
            </p>

            <h1 className="text-2xl font-bold">
              Annahmestelle auswählen
            </h1>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-slate-600">
            Für welche Annahmestelle möchtest
            du einen Lieferschein erstellen?
          </p>

          {error && (
            <div className="mt-8 rounded-xl bg-red-100 p-5 text-red-800">
              <p className="font-bold">
                Annahmestellen konnten nicht
                geladen werden.
              </p>

              <p className="mt-2 text-sm">
                {error.message}
              </p>
            </div>
          )}

          {!error &&
            annahmestellen.length === 0 && (
              <div className="mt-8 rounded-xl bg-white p-6 shadow">
                <p className="font-bold text-slate-900">
                  Keine aktiven Annahmestellen
                  gefunden
                </p>

                <p className="mt-2 text-slate-600">
                  Bitte prüfe die Tabelle
                  „annahmestellen“ in Supabase.
                </p>
              </div>
            )}

          {!error &&
            annahmestellen.length > 0 && (
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {annahmestellen.map(
                  (annahmestelle) => (
                    <Link
                      key={annahmestelle.id}
                      href={`/kasse?annahmestelle=${annahmestelle.id}&name=${encodeURIComponent(
                        annahmestelle.name,
                      )}`}
                      className="rounded-2xl bg-white p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-900">
                          {
                            annahmestelle.name
                          }
                        </h2>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Aktiv
                        </span>
                      </div>

                      {annahmestelle.adresse && (
                        <p className="mt-3 text-slate-600">
                          {
                            annahmestelle.adresse
                          }
                        </p>
                      )}

                      {annahmestelle.telefon && (
                        <p className="mt-1 text-sm text-slate-500">
                          Telefon:{" "}
                          {
                            annahmestelle.telefon
                          }
                        </p>
                      )}

                      <p className="mt-6 font-bold text-blue-600">
                        Kasse öffnen →
                      </p>
                    </Link>
                  ),
                )}
              </div>
            )}

          <div className="mt-10">
            <Link
              href="/"
              className="inline-block rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
            >
              Zurück zur Startseite
            </Link>
          </div>
        </section>
      </main>
    </ZugriffsSchutz>
  );
}