import { describe, expect, it } from "vitest";
import { assignTiers, createRankingEntry, pickNextDuel, resolveDuel } from "./ranking";
import type { MediaItem, RankingEntry } from "./types";

function makeItem(id: string): MediaItem {
  return {
    id,
    source: "tmdb",
    externalId: id,
    category: "pelicula",
    title: id,
    year: 2020,
    imageUrl: null,
    popularity: 50,
    metadata: {},
  };
}

function makeEntry(id: string, eloScore: number, comparisons = 0): RankingEntry {
  return {
    itemId: id,
    item: makeItem(id),
    eloScore,
    comparisons,
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("createRankingEntry", () => {
  it("arranca en 1000 de Elo y 0 comparaciones", () => {
    const entry = createRankingEntry(makeItem("a"));
    expect(entry.eloScore).toBe(1000);
    expect(entry.comparisons).toBe(0);
    expect(entry.itemId).toBe("a");
  });
});

describe("resolveDuel", () => {
  it("con Elo empatado, sube y baja la misma cantidad (suma cero)", () => {
    const [newA, newB] = resolveDuel(makeEntry("a", 1000), makeEntry("b", 1000), "a");
    expect(newA.eloScore).toBeGreaterThan(1000);
    expect(newB.eloScore).toBeLessThan(1000);
    expect(newA.eloScore - 1000).toBe(1000 - newB.eloScore);
  });

  it("incrementa comparisons en ambos ítems", () => {
    const [newA, newB] = resolveDuel(makeEntry("a", 1000, 3), makeEntry("b", 1000, 7), "a");
    expect(newA.comparisons).toBe(4);
    expect(newB.comparisons).toBe(8);
  });

  it("con Elo empatado, un ítem nuevo (K=40) se mueve más que uno consolidado (K=10)", () => {
    const [newRookie] = resolveDuel(makeEntry("rookie", 1000, 0), makeEntry("rivalR", 1000, 0), "rookie");
    const [newVeteran] = resolveDuel(makeEntry("veteran", 1000, 20), makeEntry("rivalV", 1000, 20), "veteran");
    expect(newRookie.eloScore - 1000).toBe(20); // K=40 * (1 - 0.5)
    expect(newVeteran.eloScore - 1000).toBe(5); // K=10 * (1 - 0.5)
  });

  it("un resultado esperado (el favorito gana) apenas mueve el marcador", () => {
    const [newFav] = resolveDuel(makeEntry("fav", 1400, 20), makeEntry("under", 800, 20), "fav");
    expect(newFav.eloScore).toBe(1400); // el cambio redondea a 0
  });

  it("un resultado sorpresa (el más débil gana) mueve el marcador casi el K completo", () => {
    const [, newUnderdog] = resolveDuel(makeEntry("fav", 1400, 20), makeEntry("under", 800, 20), "under");
    expect(newUnderdog.eloScore).toBe(810); // 800 + ~K
  });
});

describe("pickNextDuel", () => {
  it("devuelve null con menos de 2 ítems", () => {
    expect(pickNextDuel([])).toBeNull();
    expect(pickNextDuel([makeEntry("a", 1000)])).toBeNull();
  });

  it("entre ítems igual de nuevos, elige el par con menor diferencia de Elo", () => {
    const entries = [makeEntry("a", 1000, 0), makeEntry("b", 1010, 0), makeEntry("c", 1500, 0)];
    const ids = pickNextDuel(entries)!.map((e) => e.itemId).sort();
    expect(ids).toEqual(["a", "b"]);
  });

  it("prioriza ítems con pocas comparaciones aunque exista un par con Elo más cercano fuera de ese grupo", () => {
    const entries = [
      makeEntry("e0", 1000, 0),
      makeEntry("e1", 1300, 1),
      makeEntry("e2", 1305, 2),
      makeEntry("e3", 700, 3),
      // e4/e5 tienen Elo casi idéntico a e1/e2 (brecha mínima posible), pero ya
      // tienen más duelos que los primeros 4 -> deben quedar fuera del grupo
      // prioritario y NO ser elegidos.
      makeEntry("e4", 1301, 4),
      makeEntry("e5", 1302, 5),
    ];
    const ids = pickNextDuel(entries)!.map((e) => e.itemId).sort();
    expect(ids).toEqual(["e1", "e2"]);
  });
});

describe("assignTiers", () => {
  it("asigna S al de mayor Elo y D al de menor, en un expediente grande", () => {
    const entries = Array.from({ length: 20 }, (_, i) => makeEntry(`i${i}`, 2000 - i * 10));
    const tiers = assignTiers(entries);
    expect(tiers.get("i0")).toBe("S");
    expect(tiers.get("i19")).toBe("D");
  });

  it("con un solo ítem, el percentil es 0 y el rango es S", () => {
    expect(assignTiers([makeEntry("solo", 1000)]).get("solo")).toBe("S");
  });

  it("con expediente vacío no revienta", () => {
    expect(assignTiers([]).size).toBe(0);
  });
});
