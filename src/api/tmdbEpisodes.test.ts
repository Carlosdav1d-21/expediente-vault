import { describe, expect, it } from "vitest";
import { seasonAverage, seriesAverage } from "./tmdbEpisodes";
import type { EpisodeRating, SeriesRatings } from "../types";

function ep(overrides: Partial<EpisodeRating> = {}): EpisodeRating {
  return {
    seasonNumber: 1,
    episodeNumber: 1,
    name: "Episodio",
    voteAverage: 8,
    voteCount: 100,
    airDate: null,
    ...overrides,
  };
}

describe("seasonAverage", () => {
  it("promedia solo los episodios con votos", () => {
    const episodes = [
      ep({ voteAverage: 8, voteCount: 10 }),
      ep({ voteAverage: 6, voteCount: 10 }),
      ep({ voteAverage: 0, voteCount: 0 }), // sin votos: se excluye
    ];
    expect(seasonAverage(episodes)).toBe(7);
  });

  it("devuelve null si ningún episodio tiene votos", () => {
    expect(seasonAverage([ep({ voteCount: 0, voteAverage: 0 })])).toBeNull();
  });

  it("devuelve null con lista vacía", () => {
    expect(seasonAverage([])).toBeNull();
  });

  it("redondea el resultado a un decimal", () => {
    const episodes = [
      ep({ voteAverage: 8.11, voteCount: 5 }),
      ep({ voteAverage: 8.12, voteCount: 5 }),
      ep({ voteAverage: 8.13, voteCount: 5 }),
    ];
    expect(seasonAverage(episodes)).toBe(8.1);
  });
});

describe("seriesAverage", () => {
  it("promedia los episodios de TODAS las temporadas juntas", () => {
    const ratings: SeriesRatings = {
      seriesId: 1,
      seasons: [
        {
          seasonNumber: 1,
          name: "T1",
          episodes: [ep({ voteAverage: 9, voteCount: 10 }), ep({ voteAverage: 7, voteCount: 10 })],
          average: 8,
        },
        {
          seasonNumber: 2,
          name: "T2",
          episodes: [ep({ voteAverage: 5, voteCount: 10 })],
          average: 5,
        },
      ],
    };
    expect(seriesAverage(ratings)).toBe(7); // (9+7+5)/3
  });

  it("devuelve null si la serie no tiene ningún episodio calificado", () => {
    const ratings: SeriesRatings = {
      seriesId: 1,
      seasons: [{ seasonNumber: 1, name: "T1", episodes: [], average: null }],
    };
    expect(seriesAverage(ratings)).toBeNull();
  });
});
