// ============================================================================
// audit.ts — Capa 6: bitácora de acciones sensibles, persistida en la tabla
// `audit_log` de Supabase. Solo se registran acciones con sesión activa
// (el RLS de la tabla exige auth.uid() = user_id).
// ============================================================================

import type { AuditAction, AuditLogEntry } from "./types";
import { supabase } from "./lib/supabase";

const MAX_LOG_ENTRIES = 500;

interface AuditRow {
  id: string;
  created_at: string;
  username: string | null;
  action: AuditAction;
  details: string;
}

export async function logAction(action: AuditAction, details = ""): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return; // sin sesión no se puede atribuir la acción

  const meta = user.user_metadata?.username;
  const username = typeof meta === "string" ? meta : (user.email?.split("@")[0] ?? null);

  const { error } = await supabase.from("audit_log").insert({
    user_id: user.id,
    username,
    action,
    details,
  });
  if (error) console.warn("audit_log: no se pudo registrar la acción:", error.message);
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, created_at, username, action, details")
    .order("created_at", { ascending: false })
    .limit(MAX_LOG_ENTRIES);

  if (error || !data) return [];
  return (data as AuditRow[]).map((r) => ({
    id: r.id,
    timestamp: r.created_at,
    username: r.username,
    action: r.action,
    details: r.details,
  }));
}
