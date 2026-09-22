import { describe, expect, it } from "vitest";
import { dedupeByTitle } from "./unifiedSearch";
import type { MediaItem } from "../types";

function item(overrides: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    source: "tmdb",
    externalId: 1,
    category: "pelicula",
    title: "Título",
    year: 2020,
    imageUrl: null,
    popularity: 50,
    metadata: {},
    ...overrides,
  };
}

describe("dedupeByTitle", () => {
  it("colapsa duplicados con mismo título normalizado, año y categoría, y se queda con el más popular", () => {
    const result = dedupeByTitle([
      item({ id: "a", title: "Matrix", year: 1999, popularity: 40 }),
      item({ id: "b", title: "MATRIX", year: 1999, popularity: 90 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("ignora acentos y espacios extra al comparar títulos", () => {
    const result = dedupeByTitle([
      item({ id: "a", title: "Pokémon", year: 2019 }),
      item({ id: "b", title: "  pokemon  ", year: 2019 }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("NO colapsa el mismo título en categorías distintas", () => {
    const result = dedupeByTitle([
      item({ id: "a", title: "Dune", category: "pelicula" }),
      item({ id: "b", title: "Dune", category: "videojuego" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("NO colapsa el mismo título en años distintos", () => {
    const result = dedupeByTitle([
      item({ id: "a", title: "Dune", year: 2021 }),
      item({ id: "b", title: "Dune", year: 1984 }),
    ]);
    expect(result).toHaveLength(2);
  });
});
