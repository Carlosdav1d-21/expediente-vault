// ============================================================================
// dossier.ts — "Expediente" del usuario (su ranking personal), persistido en
// la tabla `rankings` de Supabase. El RLS solo restringe ESCRITURAS al dueño;
// la LECTURA está abierta a todos (Comunidad), así que toda consulta del
// expediente propio debe filtrar por user_id explícitamente.
// ============================================================================

import type { MediaItem, RankingEntry } from "./types";
import { supabase } from "./lib/supabase";
import { createRankingEntry, resolveDuel } from "./ranking";
import { logAction } from "./audit";
import { sanitizeReview } from "./security";

interface RankingRow {
  item_id: string;
  item: MediaItem;
  elo_score: number;
  comparisons: number;
  added_at: string;
  updated_at: string;
  review: string | null;
}

function rowToEntry(r: RankingRow): RankingEntry {
  return {
    itemId: r.item_id,
    item: r.item,
    eloScore: r.elo_score,
    comparisons: r.comparisons,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
    review: r.review,
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
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("rankings")
    .select("item_id, item, elo_score, comparisons, added_at, updated_at, review")
    .eq("user_id", userId);
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

/** Guarda (o borra, si queda vacía) la reseña de un ítem del expediente propio. */
export async function saveReview(
  entry: RankingEntry,
  raw: string
): Promise<{ ok: boolean; entries: RankingEntry[] }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, entries: await getDossier() };

  const review = sanitizeReview(raw) || null;
  const { error } = await supabase
    .from("rankings")
    .update({ review })
    .eq("user_id", userId)
    .eq("item_id", entry.itemId);

  if (!error) void logAction(review ? "review_saved" : "review_deleted", entry.item.title);
  return { ok: !error, entries: await getDossier() };
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
