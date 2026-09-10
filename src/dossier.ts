// ============================================================================
// dossier.ts — "Expediente" del usuario (su ranking personal), persistido en
// la tabla `rankings` de Supabase. El RLS garantiza que cada usuario solo
// lee y escribe SUS filas, así que no hace falta pasar el username: se toma
// de la sesión y la base de datos hace cumplir la propiedad.
// ============================================================================

import type { MediaItem, RankingEntry } from "./types";
import { supabase } from "./lib/supabase";
import { createRankingEntry, resolveDuel } from "./ranking";
import { logAction } from "./audit";

interface RankingRow {
  item_id: string;
  item: MediaItem;
  elo_score: number;
  comparisons: number;
  added_at: string;
  updated_at: string;
}

function rowToEntry(r: RankingRow): RankingEntry {
  return {
    itemId: r.item_id,
    item: r.item,
    eloScore: r.elo_score,
    comparisons: r.comparisons,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
  };
}

function entryToRow(userId: string, e: RankingEntry) {
  return {
    user_id: userId,
    item_id: e.itemId,
    item: e.item,
    elo_score: e.eloScore,
    comparisons: e.comparisons,
    added_at: e.addedAt,
    updated_at: e.updatedAt,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function getDossier(): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from("rankings")
    .select("item_id, item, elo_score, comparisons, added_at, updated_at");
  if (error || !data) return [];
  return (data as RankingRow[]).map(rowToEntry);
}

export async function addToDossier(item: MediaItem): Promise<RankingEntry[]> {
  const userId = await currentUserId();
  if (!userId) return getDossier();

  const entry = createRankingEntry(item);
  const { error } = await supabase
    .from("rankings")
    .upsert(entryToRow(userId, entry), { onConflict: "user_id,item_id", ignoreDuplicates: true });

  if (!error) void logAction("item_added", `${item.title} (${item.category})`);
  return getDossier();
}

export async function removeFromDossier(itemId: string): Promise<RankingEntry[]> {
  const userId = await currentUserId();
  if (!userId) return getDossier();

  // Se busca el título para la bitácora antes de borrar la fila.
  const target = (await getDossier()).find((e) => e.itemId === itemId);

  const { error } = await supabase
    .from("rankings")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", itemId);

  if (!error && target) void logAction("item_removed", target.item.title);
  return getDossier();
}

export async function recordDuel(
  entries: RankingEntry[],
  winnerId: string,
  loserId: string
): Promise<RankingEntry[]> {
  const userId = await currentUserId();
  const a = entries.find((e) => e.itemId === winnerId);
  const b = entries.find((e) => e.itemId === loserId);
  if (!userId || !a || !b) return entries;

  const [newA, newB] = resolveDuel(a, b, winnerId);

  const { error } = await supabase
    .from("rankings")
    .upsert([entryToRow(userId, newA), entryToRow(userId, newB)], { onConflict: "user_id,item_id" });

  if (!error) {
    void logAction(
      "duel_resolved",
      `${a.item.title} vs ${b.item.title} → ganó ${
        a.itemId === winnerId ? a.item.title : b.item.title
      }`
    );
  }

  // Devolución optimista: la UI se actualiza sin esperar otro viaje a la BD.
  return entries.map((e) =>
    e.itemId === newA.itemId ? newA : e.itemId === newB.itemId ? newB : e
  );
}
