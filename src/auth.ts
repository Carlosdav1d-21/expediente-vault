// ============================================================================
// auth.ts — Autenticación mediante Supabase Auth.
//
// El producto es "usuario + contraseña", pero Supabase Auth trabaja con email.
// Se deriva un email sintético determinista a partir del usuario
// (`<usuario>@users.expediente-vault.local`); el usuario nunca lo ve ni lo
// escribe. La contraseña la hashea y verifica Supabase del lado servidor
// (ya no hay PBKDF2 en el navegador) y el rate limiting también es de Supabase.
// ============================================================================

import { supabase } from "./lib/supabase";
import { logAction } from "./audit";
import { normalizeUsername } from "./usernameRules";

export { normalizeUsername } from "./usernameRules";

const SYNTH_EMAIL_DOMAIN = "users.expediente-vault.local";

export type AuthResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

function emailForUsername(username: string): string {
  return `${username}@${SYNTH_EMAIL_DOMAIN}`;
}

function usernameFromEmail(email: string | undefined): string {
  return email ? email.split("@")[0] : "usuario";
}

function usernameOf(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const meta = user.user_metadata?.username;
  return typeof meta === "string" ? meta : usernameFromEmail(user.email);
}

function displayNameOf(user: { user_metadata?: Record<string, unknown> } | undefined): string | null {
  const meta = user?.user_metadata?.display_name;
  return typeof meta === "string" && meta.trim() ? meta.trim() : null;
}

export async function register(usernameRaw: string, password: string): Promise<AuthResult> {
  const username = normalizeUsername(usernameRaw);
  if (!username) {
    return {
      ok: false,
      error:
        "Usuario inválido: 3-30 caracteres, solo minúsculas, números, punto, guion o guion bajo.",
    };
  }
  if (password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: emailForUsername(username),
    password,
    options: { data: { username } },
  });

  if (error) {
    if (/already registered|already exists|user already/i.test(error.message)) {
      return { ok: false, error: "Ese usuario ya existe." };
    }
    return { ok: false, error: error.message };
  }
  // Con la confirmación de email desactivada, un alta duplicada devuelve un
  // usuario "ofuscado" sin identidades: se trata como usuario ya existente.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { ok: false, error: "Ese usuario ya existe." };
  }

  void logAction("register", "Nuevo expediente de usuario creado.");
  return { ok: true, username };
}

export async function login(usernameRaw: string, password: string): Promise<AuthResult> {
  const username = normalizeUsername(usernameRaw);
  if (!username) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: emailForUsername(username),
    password,
  });

  if (error) {
    // Mensaje genérico: no revelar si el usuario existe (anti-enumeración).
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  void logAction("login_success", "Sesión iniciada.");
  return { ok: true, username };
}

export async function logout(): Promise<void> {
  // Se registra ANTES de cerrar sesión, mientras la fila de auditoría todavía
  // pasa el RLS (auth.uid() = user_id).
  await logAction("logout", "Sesión cerrada.");
  await supabase.auth.signOut();
}

/** Usuario de la sesión actual (o null). Lee la sesión local, sin ir a la red. */
export async function getCurrentUsername(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? usernameOf(user) : null;
}

/** Suscribe a cambios de sesión. Devuelve la función para cancelar la suscripción. */
export function onAuthChange(cb: (username: string | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ? usernameOf(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

// ---------------------------------------------------------------------------
// Edición de perfil personal.
// El "usuario" de login (y el email sintético que lo respalda) NO se puede
// cambiar desde aquí a propósito: es la identidad de la cuenta. Lo editable
// es un "nombre para mostrar" independiente y la contraseña.
// ---------------------------------------------------------------------------

export type Role = "user" | "admin";

export interface Profile {
  username: string;
  displayName: string | null;
  role: Role;
}

/**
 * Perfil (usuario, nombre para mostrar y rol) de la sesión actual, o null si
 * no hay sesión. El rol se lee SIEMPRE de la tabla `profiles`, nunca de
 * user_metadata: ese lo puede escribir el propio usuario desde el cliente
 * (updateUser), así que no es de fiar para decidir permisos.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: row } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  return {
    username: usernameOf(user),
    displayName: displayNameOf(user),
    role: row?.role === "admin" ? "admin" : "user",
  };
}

export async function updateDisplayName(raw: string): Promise<AuthResult> {
  const displayName = raw.trim().slice(0, 60);
  if (displayName.length < 2) {
    return { ok: false, error: "El nombre para mostrar debe tener al menos 2 caracteres." };
  }

  const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
  if (error) return { ok: false, error: error.message };

  void logAction("profile_updated", `Nombre para mostrar actualizado a "${displayName}".`);
  return { ok: true, username: usernameOf(data.user) };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (newPassword.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };

  void logAction("profile_updated", "Contraseña actualizada.");
  return { ok: true, username: usernameOf(data.user) };
}
