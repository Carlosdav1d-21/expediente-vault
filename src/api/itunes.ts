// ============================================================================
// api/itunes.ts — Adaptador de la API pública de iTunes Search (canciones).
// No requiere API key.
// ============================================================================

import type { MediaItem } from "../types";

const ITUNES_BASE = "https://itunes.apple.com/search";

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  releaseDate: string;
  artworkUrl100: string | null;
  trackTimeMillis?: number;
}

interface ItunesSearchResponse {
  results: ItunesResult[];
}

export async function searchItunes(query: string): Promise<MediaItem[]> {
  const url = `${ITUNES_BASE}?term=${encodeURIComponent(query)}&entity=song&limit=15`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes respondió ${res.status}`);
  const json: ItunesSearchResponse = await res.json();

  return json.results.map((r) => ({
    id: `itunes-${r.trackId}`,
    source: "itunes",
    externalId: r.trackId,
    category: "cancion",
    title: `${r.trackName} — ${r.artistName}`,
    year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null,
    imageUrl: r.artworkUrl100,
    // iTunes no expone una métrica de popularidad pública; se usa un valor
    // neutro fijo y el ranking real del ítem lo define el motor Elo propio,
    // no el dato crudo de la API.
    popularity: 50,
    metadata: { artist: r.artistName, durationMs: r.trackTimeMillis ?? null },
  } satisfies MediaItem));
}
