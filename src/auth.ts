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
  avatarUrl: string | null;
  role: Role;
}

/**
 * Perfil (usuario, nombre para mostrar, foto y rol) de la sesión actual, o
 * null si no hay sesión. Nombre/foto/rol se leen SIEMPRE de la tabla
 * `profiles` (no de user_metadata): así son visibles para otros usuarios
 * en la Comunidad, y el rol queda protegido por sus propios permisos de
 * columna (ver migration_002).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    username: usernameOf(user),
    displayName: row?.display_name ?? null,
    avatarUrl: row?.avatar_url ?? null,
    role: row?.role === "admin" ? "admin" : "user",
  };
}

export async function updateDisplayName(raw: string): Promise<AuthResult> {
  const displayName = raw.trim().slice(0, 60);
  if (displayName.length < 2) {
    return { ok: false, error: "El nombre para mostrar debe tener al menos 2 caracteres." };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: "Sesión no válida." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  void logAction("profile_updated", `Nombre para mostrar actualizado a "${displayName}".`);
  return { ok: true, username: usernameOf(user) };
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

// ---------------------------------------------------------------------------
// Foto de perfil. Se sube a Supabase Storage (bucket "avatars", público en
// lectura) bajo "<user_id>/avatar.<ext>"; las políticas del bucket impiden
// que alguien suba o borre la foto de OTRO usuario (ver migration_003).
// ---------------------------------------------------------------------------

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const AVATAR_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadAvatar(file: File): Promise<AuthResult> {
  const ext = AVATAR_EXT_BY_TYPE[file.type];
  if (!ext) {
    return { ok: false, error: "Formato no soportado. Usa JPG, PNG, WEBP o GIF." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "La imagen no puede pesar más de 2 MB." };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: "Sesión no válida." };

  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };

  // Cache-bust: la ruta es siempre la misma, así que sin esto el navegador
  // (o el CDN) podría seguir mostrando la foto vieja tras reemplazarla.
  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  void logAction("profile_updated", "Foto de perfil actualizada.");
  return { ok: true, username: usernameOf(user) };
}
