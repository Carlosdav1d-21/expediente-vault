import { describe, expect, it } from "vitest";
import {
  SECURITY_CONSTANTS,
  evaluateLoginAttempt,
  generateSalt,
  hashPassword,
  registerFailedAttempt,
  sanitizeInput,
  verifyPassword,
} from "./security";

describe("sanitizeInput", () => {
  it("quita etiquetas HTML", () => {
    expect(sanitizeInput("<script>alert(1)</script>hola")).toBe("alert(1)hola");
  });

  it("quita caracteres de control", () => {
    expect(sanitizeInput("hola\x00\x01mundo")).toBe("holamundo");
  });

  it("recorta espacios en los extremos", () => {
    expect(sanitizeInput("   hola   ")).toBe("hola");
  });

  it("trunca a 200 caracteres como límite defensivo", () => {
    expect(sanitizeInput("a".repeat(300)).length).toBe(200);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("la misma contraseña y salt producen siempre el mismo hash (determinista)", async () => {
    const salt = generateSalt();
    const h1 = await hashPassword("clave-segura-123", salt);
    const h2 = await hashPassword("clave-segura-123", salt);
    expect(h1).toBe(h2);
  });

  it("el hash nunca contiene la contraseña en claro", async () => {
    const hash = await hashPassword("clave-segura-123", generateSalt());
    expect(hash).not.toContain("clave-segura-123");
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("verifyPassword acepta la contraseña correcta", async () => {
    const salt = generateSalt();
    const hash = await hashPassword("clave-segura-123", salt);
    await expect(verifyPassword("clave-segura-123", salt, hash)).resolves.toBe(true);
  });

  it("verifyPassword rechaza una contraseña incorrecta", async () => {
    const salt = generateSalt();
    const hash = await hashPassword("clave-segura-123", salt);
    await expect(verifyPassword("otra-clave-cualquiera", salt, hash)).resolves.toBe(false);
  });

  it("la misma contraseña con salts distintos produce hashes distintos", async () => {
    const h1 = await hashPassword("clave-segura-123", generateSalt());
    const h2 = await hashPassword("clave-segura-123", generateSalt());
    expect(h1).not.toBe(h2);
  });
});

describe("evaluateLoginAttempt / registerFailedAttempt (rate limiting)", () => {
  it("permite el intento si no hay bloqueo activo", () => {
    expect(evaluateLoginAttempt({ failedAttempts: 0, lockedUntil: null }).allowed).toBe(true);
  });

  it("bloquea justo al alcanzar el máximo de intentos fallidos", () => {
    let state: { failedAttempts: number; lockedUntil: string | null } = {
      failedAttempts: 0,
      lockedUntil: null,
    };
    for (let i = 0; i < SECURITY_CONSTANTS.MAX_FAILED_ATTEMPTS; i++) {
      state = registerFailedAttempt(state);
    }
    expect(state.lockedUntil).not.toBeNull();
    const gate = evaluateLoginAttempt(state);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("locked");
  });

  it("no bloquea antes de llegar al máximo", () => {
    const state = registerFailedAttempt({ failedAttempts: 0 });
    expect(state.lockedUntil).toBeNull();
    expect(evaluateLoginAttempt(state).allowed).toBe(true);
  });
});
