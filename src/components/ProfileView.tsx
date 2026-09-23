import { useEffect, useMemo, useState } from "react";
import type { MediaCategory, MediaItem, RankingEntry } from "../types";
import { assignTiers } from "../ranking";
import { getCurrentProfile } from "../auth";
import { CATEGORY_LABELS, CATEGORY_ORDER, TIER_COLORS, categoryGroup } from "../uiConstants";
import { InfoCard } from "./InfoCard";
import { ProfileEditor } from "./ProfileEditor";

/**
 * Perfil del agente: resumen de actividad + todo lo que ha clasificado,
 * agrupado por categoría y ordenado por puntaje Elo. Cada ítem abre su ficha.
 */
export function ProfileView({
  username,
  entries,
  onAvatarChange,
}: {
  username: string;
  entries: RankingEntry[];
  onAvatarChange?: (url: string | null) => void;
}) {
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setDisplayName(p?.displayName ?? null);
      const url = p?.avatarUrl ?? null;
      setAvatarUrl(url);
      onAvatarChange?.(url);
    });
  }, [username]);

  function handleAvatarChange(url: string | null) {
    setAvatarUrl(url);
    onAvatarChange?.(url);
  }

  const tiers = useMemo(() => assignTiers(entries), [entries]);

  const byCategory = useMemo(() => {
    const map = new Map<MediaCategory, RankingEntry[]>();
    for (const entry of entries) {
      const key = categoryGroup(entry.item.category);
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.eloScore - a.eloScore);
    return map;
  }, [entries]);

  const totalDuels = useMemo(
    () => Math.round(entries.reduce((sum, e) => sum + e.comparisons, 0) / 2),
    [entries]
  );

  const topEntry = useMemo(
    () =>
      entries.reduce<RankingEntry | null>(
        (best, e) => (!best || e.eloScore > best.eloScore ? e : best),
        null
      ),
    [entries]
  );

  const groups = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  return (
    <div className="panel">
      <div className="profile-header-row">
        <div className="profile-identity">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-mini" />
          ) : (
            <div className="avatar-mini avatar-placeholder" aria-hidden="true">
              👤
            </div>
          )}
          <h2>Perfil · {displayName ?? username}</h2>
        </div>
        <button
          className="icon-btn"
          onClick={() => setEditorOpen((open) => !open)}
          aria-expanded={editorOpen}
          aria-label={editorOpen ? "Cerrar edición de perfil" : "Editar perfil"}
          title="Editar perfil"
        >
          ⚙
        </button>
      </div>

      {editorOpen && (
        <ProfileEditor onDisplayNameChange={setDisplayName} onAvatarChange={handleAvatarChange} />
      )}

      {entries.length === 0 ? (
        <p className="muted">Aún no has clasificado nada. Ve a la pestaña Buscar para empezar.</p>
      ) : (
        <>
          <div className="profile-stats">
            <Stat label="Ítems" value={entries.length} />
            <Stat label="Duelos" value={totalDuels} />
            {groups.map((c) => (
              <Stat key={c} label={CATEGORY_LABELS[c]} value={byCategory.get(c)!.length} />
            ))}
          </div>

          {topEntry && (
            <p className="muted">
              Mejor valorado: <strong>{topEntry.item.title}</strong> (Elo {topEntry.eloScore})
            </p>
          )}

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
                    <button className="card-title-btn" onClick={() => setDetailItem(entry.item)}>
                      {entry.item.title}
                    </button>
                    <span className="card-meta">Elo {entry.eloScore}</span>
                    <span className="card-meta">{entry.comparisons} duelos</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </>
      )}

      {detailItem && <InfoCard item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="profile-stat">
      <span className="profile-stat-value">{value}</span>
      <span className="profile-stat-label">{label}</span>
    </div>
  );
}
