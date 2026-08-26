// ============================================================================
// dossier.ts — "Expediente" del usuario: persistencia de su ranking personal.
// Conecta ranking.ts (cálculo) con storage.ts (persistencia) y audit.ts
// (trazabilidad), sin que la UI tenga que conocer ninguno de los tres.
// ============================================================================

import type { MediaItem, RankingEntry } from "./types";
import { getItem, setItem, STORAGE_KEYS } from "./storage";
import { createRankingEntry, resolveDuel } from "./ranking";
import { logAction } from "./audit";

export function getDossier(username: string): RankingEntry[] {
  return getItem<RankingEntry[]>(STORAGE_KEYS.RANKING(username), []);
}

function saveDossier(username: string, entries: RankingEntry[]): void {
  setItem(STORAGE_KEYS.RANKING(username), entries);
}

export function addToDossier(username: string, item: MediaItem): RankingEntry[] {
  const entries = getDossier(username);
  if (entries.some((e) => e.itemId === item.id)) return entries; // ya existe, no duplicar

  const updated = [...entries, createRankingEntry(item)];
  saveDossier(username, updated);
  logAction("item_added", username, `${item.title} (${item.category})`);
  return updated;
}

export function removeFromDossier(username: string, itemId: string): RankingEntry[] {
  const entries = getDossier(username);
  const target = entries.find((e) => e.itemId === itemId);
  const updated = entries.filter((e) => e.itemId !== itemId);
  saveDossier(username, updated);
  if (target) logAction("item_removed", username, target.item.title);
  return updated;
}

export function recordDuel(username: string, winnerId: string, loserId: string): RankingEntry[] {
  const entries = getDossier(username);
  const a = entries.find((e) => e.itemId === winnerId);
  const b = entries.find((e) => e.itemId === loserId);
  if (!a || !b) return entries;

  const [newA, newB] = resolveDuel(a, b, winnerId);

  // Proceso automatizado #2: tras cada duelo, el expediente completo se
  // recalcula y persiste de inmediato — el usuario nunca ve puntajes obsoletos.
  const updated = entries.map((e) => {
    if (e.itemId === newA.itemId) return newA;
    if (e.itemId === newB.itemId) return newB;
    return e;
  });
  saveDossier(username, updated);
  logAction("duel_resolved", username, `${a.item.title} vs ${b.item.title} → ganó ${a.itemId === winnerId ? a.item.title : b.item.title}`);
  return updated;
}
