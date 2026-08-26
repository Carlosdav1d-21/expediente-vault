// ============================================================================
// api/rawg.ts — Adaptador de la API de RAWG (videojuegos).
// ============================================================================

import type { MediaItem } from "../types";

const RAWG_BASE = "https://api.rawg.io/api";

interface RawgResult {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  rating: number; // 0-5
  ratings_count: number;
}

interface RawgSearchResponse {
  results: RawgResult[];
}

function apiKey(): string {
  const key = import.meta.env.VITE_RAWG_API_KEY;
  if (!key) throw new Error("Falta VITE_RAWG_API_KEY en el archivo .env");
  return key;
}

export async function searchRawg(query: string): Promise<MediaItem[]> {
  const url = `${RAWG_BASE}/games?key=${apiKey()}&search=${encodeURIComponent(query)}&page_size=15`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG respondió ${res.status}`);
  const json: RawgSearchResponse = await res.json();

  return json.results.map((r) => ({
    id: `rawg-${r.id}`,
    source: "rawg",
    externalId: r.id,
    category: "videojuego",
    title: r.name,
    year: r.released ? Number(r.released.slice(0, 4)) : null,
    imageUrl: r.background_image,
    // RAWG expresa "rating" en escala 0-5: se normaliza a 0-100 para que
    // sea comparable con la popularidad de TMDB/iTunes en ranking.ts.
    popularity: Math.round((r.rating / 5) * 100),
    metadata: { rawgRating: r.rating, ratingsCount: r.ratings_count },
  } satisfies MediaItem));
}
