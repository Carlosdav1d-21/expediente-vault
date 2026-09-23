import { useMemo, useState } from "react";
import type { RankingEntry } from "../types";
import { assignTiers } from "../ranking";
import { TIER_COLORS } from "../uiConstants";
import { ToastRegion, useToast } from "./Toast";

export function DossierView({
  entries,
  onRemove,
}: {
  entries: RankingEntry[];
  onRemove: (id: string) => Promise<boolean>;
}) {
  const tiers = useMemo(() => assignTiers(entries), [entries]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.eloScore - a.eloScore), [entries]);
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useToast();

  async function handleRemove(entry: RankingEntry) {
    setRemoving((s) => new Set(s).add(entry.itemId));
    let ok: boolean;
    try {
      ok = await onRemove(entry.itemId);
    } catch {
      ok = false;
    }
    setRemoving((s) => {
      const next = new Set(s);
      next.delete(entry.itemId);
      return next;
    });
    setToast(
      ok
        ? { ok: true, text: `“${entry.item.title}” se quitó de tu expediente` }
        : { ok: false, text: `No se pudo quitar “${entry.item.title}”. Intenta de nuevo.` }
    );
  }

  if (entries.length === 0) {
    return (
      <div className="panel">
        <h2>Tu expediente</h2>
        <p className="muted">Aún no has clasificado nada. Busca algo arriba para empezar.</p>
        <ToastRegion toast={toast} />
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
            <button
              className="danger-btn"
              onClick={() => handleRemove(entry)}
              disabled={removing.has(entry.itemId)}
            >
              {removing.has(entry.itemId) ? "Quitando…" : "Quitar"}
            </button>
          </li>
        ))}
      </ol>
      <ToastRegion toast={toast} />
    </div>
  );
}
