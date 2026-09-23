// ============================================================================
// api/itunes.ts — Adaptador de la API pública de iTunes Search (canciones y
// álbumes). No requiere API key.
// ============================================================================

import type { AlbumTrack, MediaDetail, MediaItem } from "../types";

const ITUNES_BASE = "https://itunes.apple.com/search";
const ITUNES_LOOKUP = "https://itunes.apple.com/lookup";

export interface ItunesResult {
  wrapperType?: "track" | "collection" | "artist";
  trackId?: number;
  trackName?: string;
  artistName: string;
  collectionId?: number;
  collectionName?: string;
  collectionArtistName?: string; // artista del álbum en recopilatorios ("Various Artists")
  primaryGenreName?: string;
  releaseDate: string;
  artworkUrl100: string | null;
  trackTimeMillis?: number;
  trackNumber?: number;
  trackCount?: number;
  discNumber?: number;
  previewUrl?: string | null;
}

interface ItunesResponse {
  results: ItunesResult[];
}

async function fetchItunes(url: string): Promise<ItunesResult[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes respondió ${res.status}`);
  const json: ItunesResponse = await res.json();
  return json.results;
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
  const results = await fetchItunes(`${ITUNES_BASE}?term=${encodeURIComponent(query)}&entity=song&limit=15`);

  return results.map((r) => ({
    id: `itunes-${r.trackId}`,
    source: "itunes",
    externalId: r.trackId ?? 0,
    category: "cancion",
    title: `${r.trackName} — ${r.artistName}`,
    year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null,
    imageUrl: upscaleArtwork(r.artworkUrl100),
    // iTunes no expone una métrica de popularidad pública; se usa un valor
    // neutro fijo y el ranking real del ítem lo define el motor Elo propio,
    // no el dato crudo de la API.
    popularity: 50,
    metadata: { artist: r.artistName, album: r.collectionName ?? null, durationMs: r.trackTimeMillis ?? null },
  } satisfies MediaItem));
}

// ---------------------------------------------------------------------------
// Álbumes.
// ---------------------------------------------------------------------------

function isSingle(r: ItunesResult): boolean {
  return /\s-\sSingle$/i.test(r.collectionName ?? "") || (r.trackCount ?? 0) <= 1;
}

/**
 * Convierte resultados de iTunes (canciones o álbumes) en álbumes únicos, sin
 * sencillos, respetando el orden en que llegaron.
 */
export function albumsFromResults(results: ItunesResult[]): MediaItem[] {
  const byId = new Map<number, MediaItem>();
  for (const r of results) {
    if (!r.collectionId || !r.collectionName || byId.has(r.collectionId) || isSingle(r)) continue;
    const artist = r.collectionArtistName ?? r.artistName;
    byId.set(r.collectionId, {
      id: `itunes-album-${r.collectionId}`,
      source: "itunes",
      externalId: r.collectionId,
      category: "album",
      title: `${r.collectionName} — ${artist}`,
      year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null,
      imageUrl: upscaleArtwork(r.artworkUrl100),
      popularity: 50,
      metadata: { artist, trackCount: r.trackCount ?? null },
    });
  }
  return [...byId.values()];
}

/**
 * La búsqueda de álbumes de iTunes sola falla mucho ("motomami" no trae el
 * disco de Rosalía), así que primero van los álbumes de las canciones
 * encontradas, que sí son los relevantes, y después los de la búsqueda de álbumes.
 */
export async function searchItunesAlbums(query: string): Promise<MediaItem[]> {
  const term = encodeURIComponent(query);
  const [songs, albums] = await Promise.all([
    fetchItunes(`${ITUNES_BASE}?term=${term}&entity=song&limit=50`),
    fetchItunes(`${ITUNES_BASE}?term=${term}&entity=album&limit=50`),
  ]);
  return albumsFromResults([...songs, ...albums]);
}

// ---------------------------------------------------------------------------
// Detalle ampliado (info card).
// Las canciones no tienen sinopsis ni reparto; se muestra artista, álbum,
// género, duración y un clip de audio de 30s. Los álbumes muestran su lista
// de canciones.
// ---------------------------------------------------------------------------

export async function fetchSongDetail(trackId: number): Promise<MediaDetail> {
  const [r] = await fetchItunes(`${ITUNES_LOOKUP}?id=${trackId}&entity=song`);
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
    tracks: [],
  };
}

export async function fetchAlbumDetail(collectionId: number): Promise<MediaDetail> {
  const results = await fetchItunes(`${ITUNES_LOOKUP}?id=${collectionId}&entity=song`);
  const album = results.find((r) => r.wrapperType === "collection");
  if (!album) throw new Error("iTunes no devolvió datos para ese álbum.");

  const songs = results
    .filter((r) => r.wrapperType === "track")
    .sort((a, b) => (a.discNumber ?? 1) - (b.discNumber ?? 1) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
  const tracks: AlbumTrack[] = songs.map((t) => ({
    name: t.trackName ?? "Sin título",
    duration: formatDuration(t.trackTimeMillis),
  }));
  const totalMs = songs.reduce((sum, t) => sum + (t.trackTimeMillis ?? 0), 0);

  return {
    id: `itunes-album-${collectionId}`,
    category: "album",
    title: `${album.collectionName} — ${album.artistName}`,
    imageUrl: upscaleArtwork(album.artworkUrl100),
    synopsis: null,
    releaseDate: album.releaseDate ? album.releaseDate.slice(0, 10) : null,
    endDate: null,
    status: null,
    genres: album.primaryGenreName ? [album.primaryGenreName] : [],
    runtimeMinutes: totalMs > 0 ? Math.round(totalMs / 60000) : null,
    rating: null,
    ratingLabel: null,
    people: [{ name: album.artistName, role: "Artista", imageUrl: null }],
    peopleLabel: "Artista",
    facts: [],
    previewAudioUrl: null,
    tracks,
  };
}
