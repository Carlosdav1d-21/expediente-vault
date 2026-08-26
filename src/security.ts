// ============================================================================
// security.ts — Capas de seguridad 1, 2 y 3
//   1) Hash SHA-256 + salt aleatorio (Web Crypto API)
//   2) Rate limiting con bloqueo tras intentos fallidos
//   3) Sanitización de entradas (strip de HTML / caracteres de control)
// ============================================================================

const PBKDF_ITERATIONS = 100_000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 3;

/** Genera un salt aleatorio criptográficamente seguro, codificado en hex. */
export function generateSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deriva un hash de la contraseña usando PBKDF2 sobre SHA-256 con el salt dado.
 * Se usa PBKDF2 (vía Web Crypto SubtleCrypto) en lugar de un SHA-256 de una sola
 * pasada para introducir costo computacional deliberado y resistir ataques de
 * fuerza bruta/diccionario — un requisito explícito de la capa 1.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return timingSafeEqual(computed, expectedHash);
}

/** Comparación en tiempo constante para evitar timing attacks al verificar el hash. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sanitiza texto de entrada de usuario: elimina etiquetas HTML, caracteres de
 * control y colapsa espacios. Se aplica a TODO input antes de guardarlo o de
 * usarlo en una búsqueda, como defensa en profundidad adicional a React
 * (capa 4, que ya escapa por defecto en el render).
 */
export function sanitizeInput(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "") // strip de tags HTML
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "") // caracteres de control
    .trim()
    .slice(0, 200); // límite defensivo de longitud
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: "locked";
  remainingAttempts?: number;
  lockedUntil?: string;
}

/**
 * Motor de rate limiting con bloqueo progresivo. Es lógica de negocio propia:
 * decide, en función del historial de intentos fallidos del usuario, si un
 * nuevo intento de login se permite o se bloquea, y por cuánto tiempo.
 */
export function evaluateLoginAttempt(user: {
  failedAttempts: number;
  lockedUntil: string | null;
}): RateLimitResult {
  if (user.lockedUntil) {
    const lockedUntilDate = new Date(user.lockedUntil);
    if (lockedUntilDate.getTime() > Date.now()) {
      return { allowed: false, reason: "locked", lockedUntil: user.lockedUntil };
    }
  }
  const remaining = MAX_FAILED_ATTEMPTS - user.failedAttempts;
  return { allowed: true, remainingAttempts: Math.max(remaining, 0) };
}

/** Calcula el nuevo estado de bloqueo tras un intento fallido. */
export function registerFailedAttempt(user: {
  failedAttempts: number;
}): { failedAttempts: number; lockedUntil: string | null } {
  const failedAttempts = user.failedAttempts + 1;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
    return { failedAttempts: 0, lockedUntil };
  }
  return { failedAttempts, lockedUntil: null };
}

export const SECURITY_CONSTANTS = { MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES };
