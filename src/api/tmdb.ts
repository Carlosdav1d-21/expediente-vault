// ============================================================================
// api/tmdb.ts — Adaptador de la API de TMDB (The Movie Database).
// Responsabilidad ÚNICA: traducir la respuesta cruda de TMDB al contrato
// MediaItem del sistema. TMDB nunca se usa fuera de este archivo.
// ============================================================================

import type { CreditPerson, MediaDetail, MediaItem } from "../types";

export const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_HOST = "https://image.tmdb.org/t/p";

/** Construye la URL de una imagen de TMDB al tamaño pedido, o null si no hay path. */
export function tmdbImage(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" = "w342"
): string | null {
  return path ? `${IMG_HOST}/${size}${path}` : null;
}

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

export function tmdbApiKey(): string {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) throw new Error("Falta VITE_TMDB_API_KEY en el archivo .env");
  return key;
}

export async function searchTmdb(query: string, kind: "movie" | "tv"): Promise<MediaItem[]> {
  const url = `${TMDB_BASE}/search/${kind}?api_key=${tmdbApiKey()}&language=es-ES&query=${encodeURIComponent(query)}`;
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
      imageUrl: tmdbImage(r.poster_path),
      popularity: Math.min(100, r.popularity), // TMDB no acota popularity a 100; se recorta
      metadata: { tmdbPopularity: r.popularity },
    } satisfies MediaItem;
  });
}

// ---------------------------------------------------------------------------
// Detalle ampliado (info card) para película o serie.
// ---------------------------------------------------------------------------

interface TmdbGenre {
  name: string;
}

interface TmdbCredits {
  cast?: Array<{ name: string; character?: string; profile_path: string | null; order: number }>;
  crew?: Array<{ name: string; job: string }>;
}

interface TmdbTitleDetail {
  id: number;
  title?: string;
  name?: string;
  overview: string | null;
  poster_path: string | null;
  release_date?: string; // película
  first_air_date?: string; // serie
  last_air_date?: string | null; // serie
  runtime?: number | null; // película (min)
  episode_run_time?: number[]; // serie (min por episodio)
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  vote_average?: number;
  genres?: TmdbGenre[];
  credits?: TmdbCredits;
  created_by?: Array<{ name: string }>;
}

/** Traduce el `status` en inglés de TMDB a una etiqueta en español lista para mostrar. */
function localizeStatus(status: string | undefined): string | null {
  switch (status) {
    case "Released":
      return "Estrenada";
    case "Ended":
      return "Finalizada";
    case "Returning Series":
      return "En emisión";
    case "Canceled":
      return "Cancelada";
    case "In Production":
      return "En producción";
    case "Post Production":
      return "En posproducción";
    case "Planned":
      return "Anunciada";
    default:
      return status ?? null;
  }
}

export async function fetchTitleDetail(
  externalId: number,
  kind: "movie" | "tv"
): Promise<MediaDetail> {
  const url = `${TMDB_BASE}/${kind}/${externalId}?api_key=${tmdbApiKey()}&language=es-ES&append_to_response=credits`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status}`);
  const d: TmdbTitleDetail = await res.json();

  const isSeries = kind === "tv";
  const status = localizeStatus(d.status);
  const ended = d.status === "Ended" || d.status === "Canceled";

  const people: CreditPerson[] = (d.credits?.cast ?? [])
    .slice(0, 12)
    .map((c) => ({
      name: c.name,
      role: c.character?.trim() || null,
      imageUrl: tmdbImage(c.profile_path, "w185"),
    }));

  const facts: Array<{ label: string; value: string }> = [];
  if (isSeries) {
    if (d.number_of_seasons != null) facts.push({ label: "Temporadas", value: String(d.number_of_seasons) });
    if (d.number_of_episodes != null) facts.push({ label: "Episodios", value: String(d.number_of_episodes) });
    const creators = (d.created_by ?? []).map((c) => c.name).filter(Boolean);
    if (creators.length) facts.push({ label: "Creación", value: creators.join(", ") });
  } else {
    const directors = (d.credits?.crew ?? [])
      .filter((c) => c.job === "Director")
      .map((c) => c.name);
    if (directors.length) facts.push({ label: "Dirección", value: directors.join(", ") });
  }

  const runtimeMinutes = isSeries
    ? d.episode_run_time?.[0] ?? null
    : d.runtime ?? null;

  return {
    id: `tmdb-${kind}-${d.id}`,
    category: isSeries ? "serie" : "pelicula",
    title: d.title ?? d.name ?? "Sin título",
    imageUrl: tmdbImage(d.poster_path, "w500"),
    synopsis: d.overview?.trim() || null,
    releaseDate: d.release_date || d.first_air_date || null,
    endDate: isSeries && ended ? d.last_air_date || null : null,
    status,
    genres: (d.genres ?? []).map((g) => g.name),
    runtimeMinutes,
    rating: typeof d.vote_average === "number" && d.vote_average > 0 ? Math.round(d.vote_average * 10) / 10 : null,
    ratingLabel: "TMDB",
    people,
    peopleLabel: "Reparto",
    facts,
    previewAudioUrl: null,
  };
}
