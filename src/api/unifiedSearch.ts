// ============================================================================
// api/unifiedSearch.ts — Orquesta las 3 APIs externas según la categoría
// pedida y aplica deduplicación. Este es el ÚNICO punto de la app que sabe
// que existen 3 proveedores distintos; el resto del sistema solo conoce
// MediaItem.
// ============================================================================

import type { MediaCategory, MediaItem } from "../types";
import { searchTmdb } from "./tmdb";
import { searchRawg } from "./rawg";
import { searchItunes } from "./itunes";
import { sanitizeInput } from "../security";

export async function searchByCategory(rawQuery: string, category: MediaCategory): Promise<MediaItem[]> {
  const query = sanitizeInput(rawQuery);
  if (!query) return [];

  switch (category) {
    case "pelicula":
      return searchTmdb(query, "movie");
    case "serie":
      return searchTmdb(query, "tv");
    case "videojuego":
      return searchRawg(query);
    case "cancion":
      return searchItunes(query);
  }
}

/** Búsqueda combinada en las 4 categorías a la vez (usada en la barra de búsqueda global). */
export async function searchAllCategories(rawQuery: string): Promise<MediaItem[]> {
  const categories: MediaCategory[] = ["pelicula", "serie", "videojuego", "cancion"];
  const settled = await Promise.allSettled(categories.map((c) => searchByCategory(rawQuery, c)));
  const combined = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return dedupeByTitle(combined);
}

/**
 * Proceso automatizado #1: deduplicación de resultados combinados.
 * Dos ítems se consideran duplicados si, dentro de la MISMA categoría,
 * su título normalizado (minúsculas, sin espacios extra, sin acentos) y año
 * coinciden — esto puede ocurrir porque una búsqueda amplia golpea la misma
 * franquicia en fuentes distintas. Se conserva el de mayor popularidad.
 */
function dedupeByTitle(items: MediaItem[]): MediaItem[] {
  const byKey = new Map<string, MediaItem>();
  for (const item of items) {
    const key = `${item.category}:${normalizeTitle(item.title)}:${item.year ?? "s/f"}`;
    const existing = byKey.get(key);
    if (!existing || item.popularity > existing.popularity) {
      byKey.set(key, item);
    }
  }
  return Array.from(byKey.values());
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
