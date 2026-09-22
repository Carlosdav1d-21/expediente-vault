import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { AuditLogEntry } from "../types";
import { Stat } from "./ProfileView";

const LOG_LIMIT = 200;

interface AuditRow {
  id: string;
  created_at: string;
  username: string | null;
  action: string;
  details: string;
}

interface Stats {
  users: number;
  items: number;
}

/**
 * Panel exclusivo para cuentas con role="admin" en la tabla `profiles`.
 * No es solo una pantalla distinta: la fila de un usuario normal en
 * `audit_log`/`rankings` está oculta a nivel de base de datos (RLS); esta
 * vista solo puede ver más porque el backend se lo permite, no porque el
 * frontend lo decida.
 */
export function AdminView() {
  const [log, setLog] = useState<AuditLogEntry[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      supabase
        .from("audit_log")
        .select("id, created_at, username, action, details")
        .order("created_at", { ascending: false })
        .limit(LOG_LIMIT),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("rankings").select("item_id", { count: "exact", head: true }),
    ]).then(([logRes, usersRes, itemsRes]) => {
      if (cancelled) return;
      if (logRes.error) {
        setError(logRes.error.message);
        return;
      }
      setLog(
        ((logRes.data as AuditRow[] | null) ?? []).map((r) => ({
          id: r.id,
          timestamp: r.created_at,
          username: r.username,
          action: r.action as AuditLogEntry["action"],
          details: r.details,
        }))
      );
      setStats({ users: usersRes.count ?? 0, items: itemsRes.count ?? 0 });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="panel">
      <h2>Panel de administrador</h2>
      <p className="muted">
        Vista exclusiva para el equipo de desarrollo — un usuario normal no la ve ni puede acceder a
        estos datos (impuesto por políticas RLS en la base de datos, no solo oculto en la interfaz).
      </p>

      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="profile-stats">
          <Stat label="Usuarios registrados" value={stats.users} />
          <Stat label="Ítems rankeados (todos)" value={stats.items} />
        </div>
      )}

      <div className="profile-group">
        <h3>Bitácora completa (todos los usuarios, últimas {LOG_LIMIT})</h3>
        <div className="audit-log">
          {log === null && !error && <p className="muted">Cargando…</p>}
          {log?.length === 0 && <p className="muted">Sin actividad registrada.</p>}
          {log?.map((entry) => (
            <div key={entry.id} className="audit-row">
              <span className="audit-time">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className="audit-action">{entry.action}</span>
              <span className="audit-user">{entry.username ?? "—"}</span>
              <span className="audit-details">{entry.details}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
