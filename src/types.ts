// ============================================================================
// types.ts — Contratos de datos del sistema
// ============================================================================

export type MediaCategory = "pelicula" | "serie" | "videojuego" | "cancion";

export type ApiSource = "tmdb" | "rawg" | "itunes";

/** Forma unificada a la que se normaliza CUALQUIER resultado de las 3 APIs externas. */
export interface MediaItem {
  id: string; // id compuesto: `${source}-${idOriginal}`
  source: ApiSource;
  externalId: string | number;
  category: MediaCategory;
  title: string;
  year: number | null;
  imageUrl: string | null;
  popularity: number; // métrica cruda de la API de origen (0-100 normalizado en el adaptador)
  metadata: Record<string, string | number | null>;
}

// ---------------------------------------------------------------------------
// Ratings de episodios por temporada (feature de series).
// Son datos AGREGADOS de TMDB (vote_average del público), de solo lectura:
// no forman parte del ranking Elo propio del usuario.
// ---------------------------------------------------------------------------

export interface EpisodeRating {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  voteAverage: number; // escala 0-10 de TMDB
  voteCount: number;
  airDate: string | null;
}

export interface SeasonRatings {
  seasonNumber: number;
  name: string;
  episodes: EpisodeRating[];
  /** Promedio de voteAverage de los episodios con votos; null si ninguno tiene. */
  average: number | null;
}

export interface SeriesRatings {
  seriesId: number; // TMDB tv id
  seasons: SeasonRatings[];
}

/** Entrada en el expediente (ranking personal) del usuario. */
export interface RankingEntry {
  itemId: string; // MediaItem.id
  item: MediaItem;
  eloScore: number; // puntaje calculado por el motor de ranking propio
  comparisons: number; // cuántos duelos ha disputado
  addedAt: string; // ISO timestamp
  updatedAt: string;
}

export interface User {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "register"
  | "logout"
  | "item_added"
  | "item_removed"
  | "duel_resolved"
  | "storage_migrated";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string | null;
  action: AuditAction;
  details: string;
}

/** Envoltorio que persiste CUALQUIER dato en localStorage, con control de versión de esquema. */
export interface VersionedRecord<T> {
  schemaVersion: number;
  data: T;
}
