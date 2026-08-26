// ============================================================================
// api/tmdb.ts — Adaptador de la API de TMDB (The Movie Database).
// Responsabilidad ÚNICA: traducir la respuesta cruda de TMDB al contrato
// MediaItem del sistema. TMDB nunca se usa fuera de este archivo.
// ============================================================================

import type { MediaItem } from "../types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w342";

interface TmdbResult {
  id: number;
  title?: string; // películas
  name?: string; // series
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  popularity: number;
  media_type?: "movie" | "tv";
}

interface TmdbSearchResponse {
  results: TmdbResult[];
}

function apiKey(): string {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) throw new Error("Falta VITE_TMDB_API_KEY en el archivo .env");
  return key;
}

export async function searchTmdb(query: string, kind: "movie" | "tv"): Promise<MediaItem[]> {
  const url = `${TMDB_BASE}/search/${kind}?api_key=${apiKey()}&language=es-ES&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status}`);
  const json: TmdbSearchResponse = await res.json();

  return json.results.map((r) => {
    const date = r.release_date ?? r.first_air_date ?? "";
    return {
      id: `tmdb-${kind}-${r.id}`,
      source: "tmdb",
      externalId: r.id,
      category: kind === "movie" ? "pelicula" : "serie",
      title: r.title ?? r.name ?? "Sin título",
      year: date ? Number(date.slice(0, 4)) : null,
      imageUrl: r.poster_path ? `${IMG_BASE}${r.poster_path}` : null,
      popularity: Math.min(100, r.popularity), // TMDB no acota popularity a 100; se recorta
      metadata: { tmdbPopularity: r.popularity },
    } satisfies MediaItem;
  });
}
