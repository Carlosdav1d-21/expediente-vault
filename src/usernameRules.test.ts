import { describe, expect, it } from "vitest";
import { normalizeUsername } from "./usernameRules";

describe("normalizeUsername", () => {
  it("acepta usuarios válidos (minúsculas, números, punto, guion, guion bajo)", () => {
    expect(normalizeUsername("agente_007")).toBe("agente_007");
    expect(normalizeUsername("ana.perez")).toBe("ana.perez");
    expect(normalizeUsername("carlos-21")).toBe("carlos-21");
  });

  it("convierte mayúsculas a minúsculas", () => {
    expect(normalizeUsername("AgenteX")).toBe("agentex");
  });

  it("rechaza usuarios de menos de 3 caracteres", () => {
    expect(normalizeUsername("ab")).toBeNull();
  });

  it("rechaza usuarios con espacios", () => {
    expect(normalizeUsername("agente x")).toBeNull();
  });

  it("rechaza caracteres no seguros para el email sintético (@, <, etc.)", () => {
    expect(normalizeUsername("agente@evil.com")).toBeNull();
    expect(normalizeUsername("<script>")).toBeNull();
  });

  it("rechaza usuarios de más de 30 caracteres", () => {
    expect(normalizeUsername("a".repeat(31))).toBeNull();
  });
});
