import { supabase } from "../lib/supabase";

export default async function SupabaseTestPage() {
  const { data, error } = await supabase
    .from("liefern")
    .select("*");

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold">
        Supabase-Test
      </h1>

      {error ? (
        <div className="mt-6 rounded-xl bg-red-100 p-4 text-red-700">
          <p className="font-bold">
            Verbindung fehlgeschlagen
          </p>

          <p className="mt-2">
            {error.message}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-green-100 p-4 text-green-700">
          <p className="font-bold">
            Verbindung erfolgreich!
          </p>

          <p className="mt-2">
            Gefundene Datensätze: {data.length}
          </p>
        </div>
      )}
    </main>
  );
}