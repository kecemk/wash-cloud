export function geldFormatieren(betrag: number) {
  return betrag.toFixed(2).replace(".", ",") + " €";
}