import { useEffect, useMemo, useState } from "react";
import type { MediaCategory, RankingEntry } from "../types";
import { assignTiers } from "../ranking";
import { getUserRankings } from "../community";
import { CATEGORY_LABELS, CATEGORY_ORDER, TIER_COLORS, categoryGroup } from "../uiConstants";
import { Stat } from "./ProfileView";

/**
 * Ficha pública (solo lectura) del expediente de OTRO usuario: se abre al
 * hacer click en su nombre desde la Comunidad. Sin editor, sin botón de
 * quitar — es una vista, no el panel de administración de esa cuenta.
 */
export function PublicProfileModal({
  userId,
  username,
  displayName,
  avatarUrl,
  onClose,
}: {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<RankingEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserRankings(userId).then((e) => {
      if (!cancelled) setEntries(e);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const tiers = useMemo(() => assignTiers(entries ?? []), [entries]);

  const byCategory = useMemo(() => {
    const map = new Map<MediaCategory, RankingEntry[]>();
    for (const entry of entries ?? []) {
      const key = categoryGroup(entry.item.category);
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.eloScore - a.eloScore);
    return map;
  }, [entries]);

  const totalDuels = useMemo(
    () => Math.round((entries ?? []).reduce((sum, e) => sum + e.comparisons, 0) / 2),
    [entries]
  );

  const groups = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className="profile-identity" style={{ marginBottom: 16 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-mini" />
          ) : (
            <span className="avatar-mini avatar-placeholder" aria-hidden="true">
              👤
            </span>
          )}
          <h3 style={{ margin: 0 }}>{displayName ?? username}</h3>
        </div>

        {entries === null && <p className="muted">Cargando…</p>}
        {entries?.length === 0 && <p className="muted">Este usuario todavía no ha clasificado nada.</p>}

        {entries && entries.length > 0 && (
          <>
            <div className="profile-stats">
              <Stat label="Ítems" value={entries.length} />
              <Stat label="Duelos" value={totalDuels} />
            </div>

            {groups.map((c) => (
              <div key={c} className="profile-group">
                <h3>
                  {CATEGORY_LABELS[c]} ({byCategory.get(c)!.length})
                </h3>
                <ol className="dossier-list">
                  {byCategory.get(c)!.map((entry, i) => (
                    <li key={entry.itemId} className="dossier-row">
                      <span className="rank-num">#{i + 1}</span>
                      <span
                        className="tier-badge"
                        style={{ backgroundColor: TIER_COLORS[tiers.get(entry.itemId) ?? "D"] }}
                      >
                        {tiers.get(entry.itemId)}
                      </span>
                      {entry.item.imageUrl ? (
                        <img src={entry.item.imageUrl} alt="" />
                      ) : (
                        <span className="dossier-img-placeholder" aria-hidden="true" />
                      )}
                      <span className="dossier-title">{entry.item.title}</span>
                      <span className="card-meta">Elo {entry.eloScore}</span>
                      <span className="card-meta">{entry.comparisons} duelos</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
