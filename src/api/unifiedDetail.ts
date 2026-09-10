// ============================================================================
// api/unifiedDetail.ts — Punto único que, dado un MediaItem de cualquier
// fuente, obtiene su ficha de detalle (info card) llamando al adaptador que
// corresponde. El resto de la app solo conoce MediaDetail.
// ============================================================================

import type { MediaDetail, MediaItem } from "../types";
import { fetchTitleDetail } from "./tmdb";
import { fetchGameDetail } from "./rawg";
import { fetchSongDetail } from "./itunes";

export async function fetchMediaDetail(item: MediaItem): Promise<MediaDetail> {
  const externalId = Number(item.externalId);
  if (!Number.isFinite(externalId)) {
    throw new Error(`ID externo inválido para "${item.title}".`);
  }

  switch (item.category) {
    case "pelicula":
      return fetchTitleDetail(externalId, "movie");
    case "serie":
      return fetchTitleDetail(externalId, "tv");
    case "videojuego":
      return fetchGameDetail(externalId);
    case "cancion":
      return fetchSongDetail(externalId);
  }
}
