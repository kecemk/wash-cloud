type LieferscheinStatistikProps = {
  anzahlSammelscheine: number;
  gesamtTeile: number;
  gesamtBetrag: number;
};

export default function LieferscheinStatistik({
  anzahlSammelscheine,
  gesamtTeile,
  gesamtBetrag,
}: LieferscheinStatistikProps) {
  function geldFormatieren(betrag: number) {
    return betrag.toFixed(2).replace(".", ",") + " €";
  }

  return (
    <div className="grid gap-4 rounded-xl bg-slate-100 p-5 md:grid-cols-3">
      <div>
        <p className="text-sm text-slate-600">
          Sammelscheine
        </p>

        <p className="text-2xl font-bold text-slate-900">
          {anzahlSammelscheine}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-600">
          Gesamtteile
        </p>

        <p className="text-2xl font-bold text-slate-900">
          {gesamtTeile}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-600">
          Gesamtbetrag
        </p>

        <p className="text-2xl font-bold text-green-700">
          {geldFormatieren(gesamtBetrag)}
        </p>
      </div>
    </div>
  );
}