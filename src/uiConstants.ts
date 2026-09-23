// ============================================================================
// uiConstants.ts — Constantes de presentación compartidas por las vistas que
// agrupan ítems por categoría (Perfil, Comunidad, ficha de otro usuario).
// ============================================================================

import type { MediaCategory } from "./types";

export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  pelicula: "Películas",
  serie: "Series",
  videojuego: "Videojuegos",
  cancion: "Canciones",
};

export const CATEGORY_ORDER: MediaCategory[] = ["pelicula", "serie", "videojuego", "cancion"];

export const TIER_COLORS: Record<string, string> = {
  S: "#d4af37",
  A: "#4caf50",
  B: "#2196f3",
  C: "#6b7280",
  D: "#6b4a4a",
};
