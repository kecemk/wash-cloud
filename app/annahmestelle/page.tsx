import Link from "next/link";
export default function AnnahmestellePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-300">Wash Cloud</p>
          <h1 className="text-2xl font-bold">Annahmestelle auswählen</h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-slate-600">
          Für welche Annahmestelle möchtest du einen Lieferschein erstellen?
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
  href="/kasse"
  className="rounded-2xl bg-white p-6 text-left shadow transition hover:shadow-lg"
>
  <h2 className="text-xl font-bold text-slate-900">AnnahmeL1</h2>
  <p className="mt-2 text-slate-600">Hauptstraße 15</p>
</Link>

          <button className="rounded-2xl bg-white p-6 text-left shadow transition hover:shadow-lg">
            <h2 className="text-xl font-bold text-slate-900">AnnahmeT2</h2>
            <p className="mt-2 text-slate-600">Bahnhofstraße 8</p>
          </button>

          <button className="rounded-2xl bg-white p-6 text-left shadow transition hover:shadow-lg">
            <h2 className="text-xl font-bold text-slate-900">AnnahmeS3</h2>
            <p className="mt-2 text-slate-600">Marktplatz 3</p>
          </button>
        </div>
      </section>
    </main>
  );
}