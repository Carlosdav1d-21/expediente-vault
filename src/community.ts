// ============================================================================
// community.ts — Rankings de TODOS los usuarios (no solo el propio).
// Requiere la política "rankings: select comunidad" (migration_004): sin
// ella, esto silenciosamente solo devolvería las filas del usuario actual.
// ============================================================================

import type { MediaItem, RankingEntry } from "./types";
import { supabase } from "./lib/supabase";

export interface CommunityEntry extends RankingEntry {
  username: string;
}

interface RankingRow {
  user_id: string;
  item_id: string;
  item: MediaItem;
  elo_score: number;
  comparisons: number;
  added_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
}

export async function getCommunityRankings(): Promise<CommunityEntry[]> {
  const [rankingsRes, profilesRes] = await Promise.all([
    supabase
      .from("rankings")
      .select("user_id, item_id, item, elo_score, comparisons, added_at, updated_at"),
    supabase.from("profiles").select("id, username"),
  ]);

  if (rankingsRes.error || !rankingsRes.data) return [];

  const usernameById = new Map<string, string>(
    ((profilesRes.data as ProfileRow[] | null) ?? []).map((p) => [p.id, p.username])
  );

  return (rankingsRes.data as RankingRow[]).map((r) => ({
    itemId: r.item_id,
    item: r.item,
    eloScore: r.elo_score,
    comparisons: r.comparisons,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
    username: usernameById.get(r.user_id) ?? "desconocido",
  }));
}
