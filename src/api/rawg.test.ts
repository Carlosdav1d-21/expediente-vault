import { describe, expect, it } from "vitest";
import { isAdultGame } from "./rawg";

const tags = (...slugs: string[]) => slugs.map((slug) => ({ slug }));

describe("isAdultGame", () => {
  it("descarta juegos con etiquetas explícitas o ESRB Adults Only", () => {
    expect(isAdultGame({ tags: tags("hentai", "nudity") })).toBe(true);
    expect(isAdultGame({ tags: tags("nsfw") })).toBe(true);
    expect(isAdultGame({ tags: [], esrb_rating: { slug: "adults-only" } })).toBe(true);
  });

  it("descarta juegos de nicho sin ESRB con desnudos y contenido sexual", () => {
    expect(isAdultGame({ tags: tags("nudity", "sexual-content"), esrb_rating: null, added: 391 })).toBe(true);
  });

  it("conserva juegos conocidos aunque tengan desnudos o contenido sexual", () => {
    // The Witcher 3, Cyberpunk 2077 y Dead or Alive 6, con sus datos reales en RAWG.
    expect(isAdultGame({ tags: tags("nudity", "mature"), esrb_rating: { slug: "mature" }, added: 22363 })).toBe(false);
    expect(
      isAdultGame({ tags: tags("nudity", "sexual-content"), esrb_rating: { slug: "mature" }, added: 14075 })
    ).toBe(false);
    expect(isAdultGame({ tags: tags("nudity", "sexual-content"), esrb_rating: null, added: 1192 })).toBe(false);
  });

  it("conserva juegos sin etiquetas", () => {
    expect(isAdultGame({})).toBe(false);
  });
});
