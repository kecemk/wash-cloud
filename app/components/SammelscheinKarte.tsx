import type {
  ArtikelPosition,
  Sammelschein,
} from "../types/lieferschein";

type SammelscheinKarteProps = {
  sammelschein: Sammelschein;
  onBearbeiten: (sammelschein: Sammelschein) => void;
  onLoeschen: (id: number) => void;
};

const artikelMehrzahl: Record<string, string> = {
  Hemd: "Hemden",
  Hose: "Hosen",
  Jacke: "Jacken",
  Anzug: "Anzüge",
  Mantel: "Mäntel",
  Kleid: "Kleider",
};

export default function SammelscheinKarte({
  sammelschein,
  onBearbeiten,
  onLoeschen,
}: SammelscheinKarteProps) {
  function artikelText(position: ArtikelPosition) {
    if (position.menge === 1) {
      return position.artikel;
    }

    return (
      artikelMehrzahl[position.artikel] ??
      position.artikel
    );
  }

  function geldFormatieren(betrag: number) {
    return betrag.toFixed(2).replace(".", ",") + " €";
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900">
            Nummer {sammelschein.nummer}
          </h3>

          <div className="mt-2 text-slate-600">
            {sammelschein.positionen.map((position) => (
              <p key={position.id}>
                {position.menge} {artikelText(position)}
              </p>
            ))}
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-green-700">
            {geldFormatieren(sammelschein.preis)}
          </p>

          <button
            type="button"
            onClick={() => onBearbeiten(sammelschein)}
            className="mt-3 block text-sm font-semibold text-blue-600"
          >
            Bearbeiten
          </button>

          <button
            type="button"
            onClick={() => onLoeschen(sammelschein.id)}
            className="mt-2 block text-sm font-semibold text-red-600"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}