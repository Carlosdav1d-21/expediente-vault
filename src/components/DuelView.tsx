import { useMemo } from "react";
import type { RankingEntry } from "../types";
import { pickNextDuel } from "../ranking";

export function DuelView({
  entries,
  onResolve,
}: {
  entries: RankingEntry[];
  onResolve: (winnerId: string, loserId: string) => void;
}) {
  const duel = useMemo(() => pickNextDuel(entries), [entries]);

  if (!duel) {
    return (
      <div className="panel">
        <h2>Duelos</h2>
        <p className="muted">Añade al menos 2 ítems de la misma búsqueda para empezar a rankear.</p>
      </div>
    );
  }

  const [a, b] = duel;

  return (
    <div className="panel">
      <h2>¿Cuál prefieres?</h2>
      <p className="muted">El motor Elo propio ajusta el puntaje de ambos según el resultado.</p>
      <div className="duel-row">
        {[a, b].map((entry) => (
          <button key={entry.itemId} className="duel-card" onClick={() => onResolve(entry.itemId, entry.itemId === a.itemId ? b.itemId : a.itemId)}>
            {entry.item.imageUrl && <img src={entry.item.imageUrl} alt={entry.item.title} />}
            <p className="card-title">{entry.item.title}</p>
            <p className="card-meta">Elo: {entry.eloScore} · {entry.comparisons} duelos</p>
          </button>
        ))}
      </div>
    </div>
  );
}
