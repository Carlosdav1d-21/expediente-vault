import { describe, expect, it } from "vitest";
import { dedupeByTitle, filterAdultTitles, filterByRelevance } from "./unifiedSearch";
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

describe("filterByRelevance", () => {
  it("descarta el resto de la franquicia cuando se busca una entrega específica", () => {
    const items = [
      item({ id: "f3", title: "Fallout 3" }),
      item({ id: "f4", title: "Fallout 4" }),
      item({ id: "f76", title: "Fallout 76" }),
      item({ id: "fnv", title: "Fallout: New Vegas" }),
    ];
    const result = filterByRelevance(items, "Fallout 3");
    expect(result.map((r) => r.id)).toEqual(["f3"]);
  });

  it("conserva variantes/ediciones que sí contienen la búsqueda", () => {
    const items = [
      item({ id: "goty", title: "Fallout 3: Game of the Year Edition" }),
      item({ id: "f4", title: "Fallout 4" }),
    ];
    const result = filterByRelevance(items, "Fallout 3");
    expect(result.map((r) => r.id)).toEqual(["goty"]);
  });

  it("ignora acentos, mayúsculas y espacios extra al comparar", () => {
    const items = [item({ id: "a", title: "Pokémon" })];
    expect(filterByRelevance(items, "  POKEMON  ")).toHaveLength(1);
  });

  it("sigue encontrando títulos que anteponen un artículo", () => {
    const items = [item({ id: "a", title: "The Batman" })];
    expect(filterByRelevance(items, "Batman")).toHaveLength(1);
  });

  it("con búsqueda vacía no filtra nada", () => {
    const items = [item({ id: "a", title: "Cualquiera" })];
    expect(filterByRelevance(items, "")).toEqual(items);
  });
});

describe("filterAdultTitles", () => {
  it("descarta películas, series y juegos con palabras explícitas en el título", () => {
    const items = [
      item({ id: "a", title: "Porno S.A.", category: "pelicula" }),
      item({ id: "b", title: "Hentai Senpai: Pirates!", category: "videojuego" }),
      item({ id: "c", title: "Pornográfico", category: "serie" }),
      item({ id: "d", title: "NSFW Club", category: "videojuego" }),
    ];
    expect(filterAdultTitles(items)).toHaveLength(0);
  });

  it("no toca títulos legítimos que solo se parecen", () => {
    const items = [
      item({ id: "a", title: "Sex Education", category: "serie" }),
      item({ id: "b", title: "xXx", category: "pelicula" }),
      item({ id: "c", title: "Pornography Wars", category: "pelicula" }),
    ];
    expect(filterAdultTitles(items).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("no filtra canciones por título", () => {
    const song = item({ id: "a", title: "HENTAI — ROSALÍA", category: "cancion" });
    expect(filterAdultTitles([song])).toEqual([song]);
  });
});
