import { useEffect, useMemo, useState } from "react";
import type { MediaCategory, MediaItem } from "../types";
import { getCommunityRankings, type CommunityEntry } from "../community";
import { tierForPercentile } from "../ranking";
import { InfoCard } from "./InfoCard";

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  pelicula: "Películas",
  serie: "Series",
  videojuego: "Videojuegos",
  cancion: "Canciones",
};

const CATEGORY_ORDER: MediaCategory[] = ["pelicula", "serie", "videojuego", "cancion"];

const TIER_COLORS: Record<string, string> = {
  S: "#d4af37",
  A: "#4caf50",
  B: "#2196f3",
  C: "#9e9e9e",
  D: "#6b4a4a",
};

/**
 * Ranking de TODA la comunidad, no solo el propio: lo que cada usuario
 * registrado ha clasificado, agrupado por categoría. El rango (S-D) aquí es
 * "global" (percentil dentro de esa categoría entre TODOS los usuarios), no
 * el mismo que ves en tu Expediente/Perfil (que es relativo solo a lo tuyo).
 */
export function CommunityView() {
  const [entries, setEntries] = useState<CommunityEntry[] | null>(null);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCommunityRankings().then((e) => {
      if (!cancelled) setEntries(e);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<MediaCategory, CommunityEntry[]>();
    for (const entry of entries ?? []) {
      const arr = map.get(entry.item.category) ?? [];
      arr.push(entry);
      map.set(entry.item.category, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.eloScore - a.eloScore);
    return map;
  }, [entries]);

  const groups = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  return (
    <div className="panel">
      <h2>Rankings de la comunidad</h2>
      <p className="muted">Lo que ha clasificado toda la gente registrada, no solo tú.</p>

      {entries === null && <p className="muted">Cargando…</p>}
      {entries?.length === 0 && <p className="muted">Todavía nadie ha clasificado nada.</p>}

      {groups.map((c) => {
        const group = byCategory.get(c)!;
        return (
          <div key={c} className="profile-group">
            <h3>
              {CATEGORY_LABELS[c]} ({group.length})
            </h3>
            <ol className="dossier-list">
              {group.map((entry, i) => {
                // Cada fila puede ser de un usuario distinto y compartir
                // itemId con otra (dos personas rankearon la misma peli):
                // el rango se calcula por POSICIÓN en este grupo ya
                // ordenado, nunca por un mapa itemId->tier.
                const percentile = group.length <= 1 ? 0 : i / (group.length - 1);
                const tier = tierForPercentile(percentile);
                return (
                  <li key={`${entry.username}-${entry.itemId}`} className="dossier-row">
                    <span className="rank-num">#{i + 1}</span>
                    <span className="tier-badge" style={{ backgroundColor: TIER_COLORS[tier] }}>
                      {tier}
                    </span>
                    {entry.item.imageUrl ? (
                      <img src={entry.item.imageUrl} alt="" />
                    ) : (
                      <span className="dossier-img-placeholder" aria-hidden="true" />
                    )}
                    <button className="card-title-btn" onClick={() => setDetailItem(entry.item)}>
                      {entry.item.title}
                    </button>
                    <span className="card-meta">@{entry.username}</span>
                    <span className="card-meta">Elo {entry.eloScore}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}

      {detailItem && <InfoCard item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}
