// ============================================================================
// audit.ts — Capa 6: bitácora de acciones sensibles con timestamp.
// ============================================================================

import type { AuditAction, AuditLogEntry } from "./types";
import { getItem, setItem, STORAGE_KEYS } from "./storage";

const MAX_LOG_ENTRIES = 500;

export function logAction(action: AuditAction, username: string | null, details = ""): void {
  const log = getItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOG, []);
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    username,
    action,
    details,
  };
  const updated = [entry, ...log].slice(0, MAX_LOG_ENTRIES); // ring buffer defensivo
  setItem(STORAGE_KEYS.AUDIT_LOG, updated);
}

export function getAuditLog(): AuditLogEntry[] {
  return getItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOG, []);
}
