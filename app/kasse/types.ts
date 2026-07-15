export type ArtikelPosition = {
  id: number;
  menge: number;
  artikel: string;
};

export type Sammelschein = {
  id: number;
  nummer: string;
  positionen: ArtikelPosition[];
  preis: number;
};

export type FertigerLieferschein = {
  id: number;
  nummer: string;
  status: "Fertig";
  fertiggestelltAm: string;
  annahmestelle: string;
  sammelscheine: Sammelschein[];
};