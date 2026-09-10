// ============================================================================
// api/tmdbEpisodes.ts — Ratings de episodios por temporada (TMDB).
//
// Responsabilidad ÚNICA: traer el vote_average agregado de cada episodio de
// una serie y agruparlo por temporada. Son datos de solo lectura del público
// de TMDB; NO alimentan el motor de ranking Elo propio.
// ============================================================================

import type { EpisodeRating, SeasonRatings, SeriesRatings } from "../types";
import { TMDB_BASE, tmdbApiKey } from "./tmdb";

interface TmdbTvDetail {
  seasons: Array<{
    season_number: number;
    name: string;
    episode_count: number;
  }>;
}

interface TmdbSeasonDetail {
  name: string;
  episodes: Array<{
    episode_number: number;
    name: string;
    vote_average: number;
    vote_count: number;
    air_date: string | null;
  }>;
}

/**
 * Trae los ratings de TODAS las temporadas reales de una serie (excluye la
 * "temporada 0" de especiales). Las temporadas se piden en paralelo.
 */
export async function fetchSeriesRatings(seriesId: number): Promise<SeriesRatings> {
  const res = await fetch(
    `${TMDB_BASE}/tv/${seriesId}?api_key=${tmdbApiKey()}&language=es-ES`
  );
  if (!res.ok) throw new Error(`TMDB respondió ${res.status}`);
  const detail: TmdbTvDetail = await res.json();

  const realSeasons = detail.seasons
    .filter((s) => s.season_number >= 1 && s.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number);

  const seasons = await Promise.all(
    realSeasons.map((s) => fetchSeason(seriesId, s.season_number))
  );

  return { seriesId, seasons };
}

async function fetchSeason(seriesId: number, seasonNumber: number): Promise<SeasonRatings> {
  const res = await fetch(
    `${TMDB_BASE}/tv/${seriesId}/season/${seasonNumber}?api_key=${tmdbApiKey()}&language=es-ES`
  );
  if (!res.ok) throw new Error(`TMDB respondió ${res.status}`);
  const data: TmdbSeasonDetail = await res.json();

  const episodes: EpisodeRating[] = data.episodes.map((e) => ({
    seasonNumber,
    episodeNumber: e.episode_number,
    name: e.name,
    voteAverage: e.vote_average,
    voteCount: e.vote_count,
    airDate: e.air_date || null,
  }));

  return {
    seasonNumber,
    name: data.name,
    episodes,
    average: seasonAverage(episodes),
  };
}

/** Promedio de los episodios con al menos un voto; null si ninguno califica. */
export function seasonAverage(episodes: EpisodeRating[]): number | null {
  const rated = episodes.filter((e) => e.voteCount > 0 && e.voteAverage > 0);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, e) => acc + e.voteAverage, 0);
  return Math.round((sum / rated.length) * 10) / 10;
}
