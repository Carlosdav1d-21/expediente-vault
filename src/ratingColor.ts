// ============================================================================
// ratingColor.ts — Rampa de color rojo → amarillo → verde para una nota 0-10.
// Compartida por la grilla de episodios y las cajas de puntuación.
// ============================================================================

export function ratingColor(score: number): string {
  if (score >= 8.5) return "#1a9850";
  if (score >= 8) return "#66bd63";
  if (score >= 7.5) return "#a6d96a";
  if (score >= 7) return "#d9ef8b";
  if (score >= 6) return "#fee08b";
  if (score >= 5) return "#fdae61";
  return "#f46d43";
}
