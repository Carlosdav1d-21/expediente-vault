// ============================================================================
// auth.ts — Registro/login local. No hay backend en este avance: el
// "expediente" de credenciales vive en localStorage, pero nunca la contraseña
// en claro, solo hash + salt. Esto es intencional para el alcance del curso;
// la sección de justificación técnica documenta la ruta a un backend real.
// ============================================================================

import type { User } from "./types";
import { getItem, setItem, STORAGE_KEYS } from "./storage";
import { generateSalt, hashPassword, verifyPassword, evaluateLoginAttempt, registerFailedAttempt, sanitizeInput } from "./security";
import { logAction } from "./audit";

function getUsers(): Record<string, User> {
  return getItem<Record<string, User>>(STORAGE_KEYS.USERS, {});
}

function saveUsers(users: Record<string, User>): void {
  setItem(STORAGE_KEYS.USERS, users);
}

export type AuthResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

export async function register(usernameRaw: string, password: string): Promise<AuthResult> {
  const username = sanitizeInput(usernameRaw);
  if (username.length < 3) return { ok: false, error: "El usuario debe tener al menos 3 caracteres." };
  if (password.length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };

  const users = getUsers();
  if (users[username]) return { ok: false, error: "Ese usuario ya existe." };

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  users[username] = {
    username,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  };
  saveUsers(users);
  logAction("register", username, "Nuevo expediente de usuario creado.");
  return { ok: true, username };
}

export async function login(usernameRaw: string, password: string): Promise<AuthResult> {
  const username = sanitizeInput(usernameRaw);
  const users = getUsers();
  const user = users[username];

  if (!user) {
    // Mismo mensaje genérico que credencial inválida: no revelar si el
    // usuario existe (mitigación de enumeración de cuentas).
    logAction("login_failed", username, "Usuario no encontrado.");
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  const gate = evaluateLoginAttempt(user);
  if (!gate.allowed) {
    logAction("login_locked", username, `Bloqueado hasta ${gate.lockedUntil}.`);
    const mins = Math.ceil((new Date(gate.lockedUntil!).getTime() - Date.now()) / 60000);
    return { ok: false, error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${mins} min.` };
  }

  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) {
    const { failedAttempts, lockedUntil } = registerFailedAttempt(user);
    users[username] = { ...user, failedAttempts, lockedUntil };
    saveUsers(users);
    logAction("login_failed", username, `Intento fallido #${failedAttempts || 5}.`);
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  users[username] = { ...user, failedAttempts: 0, lockedUntil: null };
  saveUsers(users);
  setItem(STORAGE_KEYS.SESSION, { username, loggedInAt: new Date().toISOString() });
  logAction("login_success", username, "Sesión iniciada.");
  return { ok: true, username };
}

export function logout(username: string): void {
  setItem(STORAGE_KEYS.SESSION, null);
  logAction("logout", username, "Sesión cerrada.");
}

export function getSession(): { username: string } | null {
  return getItem<{ username: string } | null>(STORAGE_KEYS.SESSION, null);
}
