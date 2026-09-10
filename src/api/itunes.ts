// ============================================================================
// api/itunes.ts — Adaptador de la API pública de iTunes Search (canciones).
// No requiere API key.
// ============================================================================

import type { MediaDetail, MediaItem } from "../types";

const ITUNES_BASE = "https://itunes.apple.com/search";
const ITUNES_LOOKUP = "https://itunes.apple.com/lookup";

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  primaryGenreName?: string;
  releaseDate: string;
  artworkUrl100: string | null;
  trackTimeMillis?: number;
  trackNumber?: number;
  trackCount?: number;
  previewUrl?: string | null;
}

interface ItunesSearchResponse {
  results: ItunesResult[];
}

/** Sube la resolución de la carátula de iTunes de 100x100 a 600x600. */
function upscaleArtwork(url: string | null | undefined): string | null {
  return url ? url.replace("100x100", "600x600") : null;
}

/** Formatea una duración en milisegundos como "m:ss". */
function formatDuration(ms: number | undefined): string | null {
  if (!ms || ms <= 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
    imageUrl: upscaleArtwork(r.artworkUrl100),
    // iTunes no expone una métrica de popularidad pública; se usa un valor
    // neutro fijo y el ranking real del ítem lo define el motor Elo propio,
    // no el dato crudo de la API.
    popularity: 50,
    metadata: { artist: r.artistName, durationMs: r.trackTimeMillis ?? null },
  } satisfies MediaItem));
}

// ---------------------------------------------------------------------------
// Detalle ampliado (info card) de una canción.
// Las canciones no tienen sinopsis ni reparto; se muestra artista, álbum,
// género, duración y un clip de audio de 30s.
// ---------------------------------------------------------------------------

interface ItunesLookupResponse {
  resultCount: number;
  results: ItunesResult[];
}

export async function fetchSongDetail(trackId: number): Promise<MediaDetail> {
  const res = await fetch(`${ITUNES_LOOKUP}?id=${trackId}&entity=song`);
  if (!res.ok) throw new Error(`iTunes respondió ${res.status}`);
  const json: ItunesLookupResponse = await res.json();
  const r = json.results[0];
  if (!r) throw new Error("iTunes no devolvió datos para esa canción.");

  const facts: Array<{ label: string; value: string }> = [];
  if (r.collectionName) facts.push({ label: "Álbum", value: r.collectionName });
  const duration = formatDuration(r.trackTimeMillis);
  if (duration) facts.push({ label: "Duración", value: duration });
  if (r.trackNumber && r.trackCount) {
    facts.push({ label: "Pista", value: `${r.trackNumber} de ${r.trackCount}` });
  }

  return {
    id: `itunes-${r.trackId}`,
    category: "cancion",
    title: `${r.trackName} — ${r.artistName}`,
    imageUrl: upscaleArtwork(r.artworkUrl100),
    synopsis: null,
    releaseDate: r.releaseDate ? r.releaseDate.slice(0, 10) : null,
    endDate: null,
    status: null,
    genres: r.primaryGenreName ? [r.primaryGenreName] : [],
    runtimeMinutes: null,
    rating: null,
    ratingLabel: null,
    people: [{ name: r.artistName, role: "Artista", imageUrl: null }],
    peopleLabel: "Artista",
    facts,
    previewAudioUrl: r.previewUrl || null,
  };
}
