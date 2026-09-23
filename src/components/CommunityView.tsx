import { useEffect, useMemo, useState } from "react";
import type { MediaCategory, MediaItem } from "../types";
import { getCommunityRankings, type CommunityEntry } from "../community";
import { tierForPercentile } from "../ranking";
import { CATEGORY_LABELS, CATEGORY_ORDER, TIER_COLORS, categoryGroup } from "../uiConstants";
import { InfoCard } from "./InfoCard";
import { PublicProfileModal } from "./PublicProfileModal";

interface ViewingUser {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Ranking de TODA la comunidad, no solo el propio: lo que cada usuario
 * registrado ha clasificado, agrupado por categoría. El rango (S-D) aquí es
 * "global" (percentil dentro de esa categoría entre TODOS los usuarios), no
 * el mismo que ves en tu Expediente/Perfil (que es relativo solo a lo tuyo).
 */
export function CommunityView() {
  const [entries, setEntries] = useState<CommunityEntry[] | null>(null);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [viewingUser, setViewingUser] = useState<ViewingUser | null>(null);

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
      const key = categoryGroup(entry.item.category);
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.eloScore - a.eloScore);
    return map;
  }, [entries]);

  const groups = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  return (
    <div className="panel">
      <h2>Rankings de la comunidad</h2>
      <p className="muted">
        Lo que ha clasificado toda la gente registrada, no solo tú. Toca un usuario para ver su
        expediente completo.
      </p>

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
                    <button
                      className="community-user-btn"
                      onClick={() =>
                        setViewingUser({
                          userId: entry.userId,
                          username: entry.username,
                          displayName: entry.displayName,
                          avatarUrl: entry.avatarUrl,
                        })
                      }
                      title={`Ver el expediente de ${entry.username}`}
                    >
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt="" className="avatar-tiny" />
                      ) : (
                        <span className="avatar-tiny avatar-placeholder" aria-hidden="true">
                          👤
                        </span>
                      )}
                      <span>@{entry.username}</span>
                    </button>
                    <span className="card-meta">Elo {entry.eloScore}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}

      {detailItem && <InfoCard item={detailItem} onClose={() => setDetailItem(null)} />}

      {viewingUser && (
        <PublicProfileModal
          userId={viewingUser.userId}
          username={viewingUser.username}
          displayName={viewingUser.displayName}
          avatarUrl={viewingUser.avatarUrl}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}
