// ============================================================================
// usernameRules.ts — Regla de validación del nombre de usuario, aislada en su
// propio módulo (sin dependencias de red) para poder testearla sin arrastrar
// el cliente de Supabase que usa auth.ts.
// ============================================================================

import { sanitizeInput } from "./security";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

/**
 * Normaliza y valida el usuario para que sea seguro como parte local de un
 * email (se usa para derivar el email sintético de Supabase Auth).
 * Devuelve null si no cumple el formato.
 */
export function normalizeUsername(raw: string): string | null {
  const u = sanitizeInput(raw).toLowerCase();
  return USERNAME_RE.test(u) ? u : null;
}
