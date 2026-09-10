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
import { sanitizeInput } from "./security";
import { logAction } from "./audit";

const SYNTH_EMAIL_DOMAIN = "users.expediente-vault.local";
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

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

/** Normaliza y valida el usuario para que sea seguro como parte local de un email. */
function normalizeUsername(raw: string): string | null {
  const u = sanitizeInput(raw).toLowerCase();
  return USERNAME_RE.test(u) ? u : null;
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
