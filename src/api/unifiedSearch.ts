// ============================================================================
// api/unifiedSearch.ts — Orquesta las 3 APIs externas según la categoría
// pedida y aplica deduplicación. Este es el ÚNICO punto de la app que sabe
// que existen 3 proveedores distintos; el resto del sistema solo conoce
// MediaItem.
// ============================================================================

import type { MediaCategory, MediaItem } from "../types";
import { searchTmdb } from "./tmdb";
import { searchRawg } from "./rawg";
import { searchItunes, searchItunesAlbums } from "./itunes";
import { sanitizeInput } from "../security";

export async function searchByCategory(rawQuery: string, category: MediaCategory): Promise<MediaItem[]> {
  const query = sanitizeInput(rawQuery);
  if (!query) return [];

  const results = await fetchByCategory(query, category);
  const relevant = filterByRelevance(filterAdultTitles(results), query);
  // Se deduplica también aquí (no solo en searchAllCategories): una sola
  // búsqueda dentro de una categoría puede traer dos IDs distintos para lo
  // que visualmente es el mismo título (dos entradas de RAWG, una versión
  // single vs álbum en iTunes...), y sin esto aparecían dos botones
  // "+ Añadir" para lo que parecía lo mismo.
  return dedupeByTitle(relevant);
}

function fetchByCategory(query: string, category: MediaCategory): Promise<MediaItem[]> {
  switch (category) {
    case "pelicula":
      return searchTmdb(query, "movie");
    case "serie":
      return searchTmdb(query, "tv");
    case "videojuego":
      return searchRawg(query);
    case "cancion":
      return searchItunes(query);
    case "album":
      return searchItunesAlbums(query);
  }
}

/**
 * Proceso automatizado #2: filtro de relevancia.
 * Algunas fuentes (sobre todo RAWG) hacen coincidencia muy laxa: buscar
 * "Fallout 3" puede devolver TODA la franquicia (Fallout 4, Fallout 76,
 * New Vegas...). Se descarta cualquier resultado cuyo título normalizado no
 * CONTENGA la consulta normalizada como subcadena — así "Fallout 3" no trae
 * "Fallout 4", pero "Batman" sigue encontrando "The Batman".
 */
export function filterByRelevance(items: MediaItem[], rawQuery: string): MediaItem[] {
  const query = normalizeTitle(rawQuery);
  if (!query) return items;
  // En canciones también cuenta el álbum: buscar "Motomami" debe traer sus canciones.
  return items.filter((item) =>
    [item.title, item.metadata.album].some((t) => typeof t === "string" && normalizeTitle(t).includes(query))
  );
}

const ADULT_TITLE = /\b(hentai|porn\w*|nsfw)\b/;

const MUSIC: ReadonlySet<MediaCategory> = new Set(["cancion", "album"]);

/**
 * Proceso automatizado #3: segunda red contra contenido para adultos, por si
 * el proveedor no lo marcó. La música queda fuera: ahí esas palabras no
 * indican contenido explícito (p. ej. "HENTAI" de Rosalía).
 */
export function filterAdultTitles(items: MediaItem[]): MediaItem[] {
  return items.filter((item) => MUSIC.has(item.category) || !ADULT_TITLE.test(normalizeTitle(item.title)));
}

/** Búsqueda combinada en las 4 categorías a la vez (usada en la barra de búsqueda global). */
export async function searchAllCategories(rawQuery: string): Promise<MediaItem[]> {
  const categories: MediaCategory[] = ["pelicula", "serie", "videojuego", "cancion", "album"];
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
export function dedupeByTitle(items: MediaItem[]): MediaItem[] {
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

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
