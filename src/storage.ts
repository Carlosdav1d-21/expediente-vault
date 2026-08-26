// ============================================================================
// storage.ts — Capa 5: wrapper tipado sobre localStorage con validación de
// versión de esquema. Si en el futuro cambia la forma de los datos guardados,
// las migraciones se resuelven aquí en un solo punto en vez de esparcidas
// por toda la UI.
// ============================================================================

import type { VersionedRecord } from "./types";

const CURRENT_SCHEMA_VERSION = 1;
const PREFIX = "expediente-vault:";

export class StorageError extends Error {}

/** Guarda un valor con su versión de esquema actual. */
export function setItem<T>(key: string, data: T): void {
  const record: VersionedRecord<T> = { schemaVersion: CURRENT_SCHEMA_VERSION, data };
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(record));
  } catch (err) {
    throw new StorageError(`No se pudo escribir "${key}" en localStorage: ${err}`);
  }
}

/**
 * Lee un valor y valida su versión de esquema. Si la versión guardada es
 * anterior a la actual, aplica la función de migración provista; si no hay
 * migración disponible y las versiones no coinciden, descarta el dato en vez
 * de arriesgarse a que la app opere sobre una forma inesperada.
 */
export function getItem<T>(
  key: string,
  fallback: T,
  migrate?: (oldVersion: number, oldData: unknown) => T
): T {
  const raw = window.localStorage.getItem(PREFIX + key);
  if (!raw) return fallback;

  let parsed: VersionedRecord<unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback; // dato corrupto: no confiar en él
  }

  if (typeof parsed !== "object" || parsed === null || !("schemaVersion" in parsed)) {
    return fallback;
  }

  if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return parsed.data as T;
  }

  if (migrate) {
    return migrate(parsed.schemaVersion, parsed.data);
  }

  return fallback;
}

export function removeItem(key: string): void {
  window.localStorage.removeItem(PREFIX + key);
}

export const STORAGE_KEYS = {
  USERS: "users",
  SESSION: "session",
  RANKING: (username: string) => `ranking:${username}`,
  AUDIT_LOG: "audit-log",
} as const;
