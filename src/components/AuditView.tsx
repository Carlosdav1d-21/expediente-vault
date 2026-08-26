import type { AuditLogEntry } from "../types";

export function AuditView({ log }: { log: AuditLogEntry[] }) {
  return (
    <div className="panel">
      <h2>Bitácora de auditoría</h2>
      <div className="audit-log">
        {log.length === 0 && <p className="muted">Sin actividad registrada aún.</p>}
        {log.map((entry) => (
          <div key={entry.id} className="audit-row">
            <span className="audit-time">{new Date(entry.timestamp).toLocaleString()}</span>
            <span className="audit-action">{entry.action}</span>
            <span className="audit-user">{entry.username ?? "—"}</span>
            <span className="audit-details">{entry.details}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
