import { describe, expect, it } from "vitest";
import { albumsFromResults, type ItunesResult } from "./itunes";

function result(overrides: Partial<ItunesResult>): ItunesResult {
  return {
    artistName: "ROSALÍA",
    collectionId: 1,
    collectionName: "MOTOMAMI",
    releaseDate: "2022-03-18T12:00:00Z",
    artworkUrl100: "https://example.com/100x100bb.jpg",
    trackCount: 16,
    ...overrides,
  };
}

describe("albumsFromResults", () => {
  it("junta varias canciones del mismo álbum en un solo ítem", () => {
    const albums = albumsFromResults([
      result({ trackName: "SAOKO" }),
      result({ trackName: "CANDY" }),
      result({ collectionId: 2, collectionName: "EL MAL QUERER", trackCount: 11 }),
    ]);
    expect(albums.map((a) => a.title)).toEqual(["MOTOMAMI — ROSALÍA", "EL MAL QUERER — ROSALÍA"]);
    expect(albums[0]).toMatchObject({ id: "itunes-album-1", category: "album", year: 2022 });
  });

  it("descarta sencillos", () => {
    const albums = albumsFromResults([
      result({ collectionId: 3, collectionName: "Motomami - Single", trackCount: 3 }),
      result({ collectionId: 4, collectionName: "Otra canción", trackCount: 1 }),
    ]);
    expect(albums).toHaveLength(0);
  });

  it("usa el artista del álbum en recopilatorios, no el de la canción", () => {
    const [album] = albumsFromResults([
      result({ artistName: "Bad Bunny", collectionArtistName: "Various Artists", collectionName: "Éxitos 2022" }),
    ]);
    expect(album.title).toBe("Éxitos 2022 — Various Artists");
  });

  it("sube la carátula a 600x600", () => {
    const [album] = albumsFromResults([result({})]);
    expect(album.imageUrl).toBe("https://example.com/600x600bb.jpg");
  });
});
