// ============================================================================
// api/rawg.ts — Adaptador de la API de RAWG (videojuegos).
// ============================================================================

import type { CreditPerson, MediaDetail, MediaItem } from "../types";

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

// ---------------------------------------------------------------------------
// Detalle ampliado (info card) de un videojuego.
// RAWG no expone "actores/personajes"; en su lugar se muestran estudio,
// distribuidora y plataformas.
// ---------------------------------------------------------------------------

interface RawgNamed {
  name: string;
}

interface RawgGameDetail {
  id: number;
  name: string;
  description_raw: string | null;
  released: string | null;
  tba: boolean;
  background_image: string | null;
  metacritic: number | null;
  playtime: number | null; // horas medias de juego
  esrb_rating: RawgNamed | null;
  genres?: RawgNamed[];
  developers?: RawgNamed[];
  publishers?: RawgNamed[];
  platforms?: Array<{ platform: RawgNamed }>;
}

export async function fetchGameDetail(externalId: number): Promise<MediaDetail> {
  const res = await fetch(`${RAWG_BASE}/games/${externalId}?key=${apiKey()}`);
  if (!res.ok) throw new Error(`RAWG respondió ${res.status}`);
  const d: RawgGameDetail = await res.json();

  const people: CreditPerson[] = [
    ...(d.developers ?? []).map((x) => ({ name: x.name, role: "Desarrolladora", imageUrl: null })),
    ...(d.publishers ?? []).map((x) => ({ name: x.name, role: "Distribuidora", imageUrl: null })),
  ];

  const facts: Array<{ label: string; value: string }> = [];
  const platforms = (d.platforms ?? []).map((p) => p.platform.name).filter(Boolean);
  if (platforms.length) facts.push({ label: "Plataformas", value: platforms.join(", ") });
  if (d.playtime && d.playtime > 0) facts.push({ label: "Duración media", value: `${d.playtime} h` });
  if (d.esrb_rating?.name) facts.push({ label: "Clasificación", value: d.esrb_rating.name });

  return {
    id: `rawg-${d.id}`,
    category: "videojuego",
    title: d.name,
    imageUrl: d.background_image,
    synopsis: d.description_raw?.trim() || null,
    releaseDate: d.released || null,
    endDate: null,
    status: d.tba ? "Sin fecha de lanzamiento" : null,
    genres: (d.genres ?? []).map((g) => g.name),
    runtimeMinutes: null,
    rating: d.metacritic ?? null,
    ratingLabel: "Metacritic",
    people,
    peopleLabel: "Equipo",
    facts,
    previewAudioUrl: null,
  };
}
