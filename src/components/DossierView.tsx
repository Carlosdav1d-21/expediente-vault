import { useMemo } from "react";
import type { RankingEntry } from "../types";
import { assignTiers } from "../ranking";

const TIER_COLORS: Record<string, string> = {
  S: "#d4af37",
  A: "#4caf50",
  B: "#2196f3",
  C: "#9e9e9e",
  D: "#6b4a4a",
};

export function DossierView({ entries, onRemove }: { entries: RankingEntry[]; onRemove: (id: string) => void }) {
  const tiers = useMemo(() => assignTiers(entries), [entries]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.eloScore - a.eloScore), [entries]);

  if (entries.length === 0) {
    return (
      <div className="panel">
        <h2>Tu expediente</h2>
        <p className="muted">Aún no has clasificado nada. Busca algo arriba para empezar.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Tu expediente ({entries.length})</h2>
      <ol className="dossier-list">
        {sorted.map((entry, i) => (
          <li key={entry.itemId} className="dossier-row">
            <span className="rank-num">#{i + 1}</span>
            <span className="tier-badge" style={{ backgroundColor: TIER_COLORS[tiers.get(entry.itemId) ?? "D"] }}>
              {tiers.get(entry.itemId)}
            </span>
            {entry.item.imageUrl ? (
              <img src={entry.item.imageUrl} alt="" />
            ) : (
              <span className="dossier-img-placeholder" aria-hidden="true" />
            )}
            <span className="dossier-title">{entry.item.title}</span>
            <span className="card-meta">Elo {entry.eloScore}</span>
            <button className="danger-btn" onClick={() => onRemove(entry.itemId)}>
              Quitar
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
