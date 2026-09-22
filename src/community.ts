// ============================================================================
// community.ts — Rankings de TODOS los usuarios (no solo el propio).
// Requiere la política "rankings: select comunidad" (migration_004): sin
// ella, esto silenciosamente solo devolvería las filas del usuario actual.
// ============================================================================

import type { MediaItem, RankingEntry } from "./types";
import { supabase } from "./lib/supabase";

export interface CommunityEntry extends RankingEntry {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
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
  display_name: string | null;
  avatar_url: string | null;
}

function rowToEntry(r: Omit<RankingRow, "user_id">): RankingEntry {
  return {
    itemId: r.item_id,
    item: r.item,
    eloScore: r.elo_score,
    comparisons: r.comparisons,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
  };
}

export async function getCommunityRankings(): Promise<CommunityEntry[]> {
  const [rankingsRes, profilesRes] = await Promise.all([
    supabase
      .from("rankings")
      .select("user_id, item_id, item, elo_score, comparisons, added_at, updated_at"),
    supabase.from("profiles").select("id, username, display_name, avatar_url"),
  ]);

  if (rankingsRes.error || !rankingsRes.data) return [];

  const profileById = new Map<string, ProfileRow>(
    ((profilesRes.data as ProfileRow[] | null) ?? []).map((p) => [p.id, p])
  );

  return (rankingsRes.data as RankingRow[]).map((r) => {
    const profile = profileById.get(r.user_id);
    return {
      ...rowToEntry(r),
      userId: r.user_id,
      username: profile?.username ?? "desconocido",
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}

/** El expediente de UN usuario en particular (para ver su perfil público). */
export async function getUserRankings(userId: string): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from("rankings")
    .select("item_id, item, elo_score, comparisons, added_at, updated_at")
    .eq("user_id", userId);

  if (error || !data) return [];
  return (data as Array<Omit<RankingRow, "user_id">>).map(rowToEntry);
}
