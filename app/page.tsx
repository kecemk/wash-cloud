export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">☁ Wash Cloud</h1>
            <p className="text-sm text-slate-300">Mitarbeiteransicht</p>
          </div>

          <div className="rounded-lg bg-slate-800 px-4 py-2">
            System online
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-bold text-slate-900">
          Willkommen bei Wash Cloud
        </h2>

        <p className="mt-2 text-slate-600">
          Erfasse Sammelscheine und erstelle neue Lieferscheine.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <button className="rounded-2xl bg-blue-600 p-8 text-left text-white shadow-lg transition hover:bg-blue-700">
            <span className="text-4xl">＋</span>
            <h3 className="mt-4 text-xl font-bold">Neuer Lieferschein</h3>
            <p className="mt-2 text-blue-100">
              Annahmestelle auswählen und Kasse öffnen
            </p>
          </button>

          <button className="rounded-2xl bg-white p-8 text-left shadow transition hover:shadow-lg">
            <span className="text-4xl">⌕</span>
            <h3 className="mt-4 text-xl font-bold text-slate-900">
              Auftrag suchen
            </h3>
            <p className="mt-2 text-slate-600">
              Mit einer Sammelschein-Nummer suchen
            </p>
          </button>

          <button className="rounded-2xl bg-white p-8 text-left shadow transition hover:shadow-lg">
            <span className="text-4xl">▤</span>
            <h3 className="mt-4 text-xl font-bold text-slate-900">
              Lieferscheine
            </h3>
            <p className="mt-2 text-slate-600">
              Fertige Lieferscheine öffnen und drucken
            </p>
          </button>
        </div>
      </section>
    </main>
  );
}