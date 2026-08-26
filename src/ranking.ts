// ============================================================================
// ranking.ts — MOTOR DE RANKING PROPIO. Esta es la lógica de negocio central
// del sistema: no es consumo de API, es la razón de ser del producto.
//
// El usuario no califica ítems con estrellas (eso es subjetivo y no
// comparable entre categorías): en su lugar, el sistema le presenta
// "duelos" (A vs B) y, a partir de sus elecciones, calcula un puntaje Elo
// por ítem — el mismo principio usado en ajedrez para rankear jugadores
// a partir únicamente de resultados de enfrentamientos directos.
// ============================================================================

import type { MediaItem, RankingEntry } from "./types";

const DEFAULT_ELO = 1000;

/**
 * DECISIÓN AUTOMÁTICA #1 — K-factor dinámico.
 * El sistema decide cuánto debe moverse el puntaje de un ítem tras un duelo
 * según su experiencia (comparisons): ítems nuevos se mueven rápido para
 * ubicarse cerca de su nivel real; ítems consolidados se mueven poco para
 * no desestabilizar el expediente con un solo duelo.
 */
function kFactor(comparisons: number): number {
  if (comparisons < 5) return 40;
  if (comparisons < 15) return 20;
  return 10;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function createRankingEntry(item: MediaItem): RankingEntry {
  const now = new Date().toISOString();
  return {
    itemId: item.id,
    item,
    eloScore: DEFAULT_ELO,
    comparisons: 0,
    addedAt: now,
    updatedAt: now,
  };
}

/**
 * Resuelve un duelo entre dos entradas del expediente y devuelve las
 * versiones actualizadas. `winnerId` debe ser itemId de a o b.
 */
export function resolveDuel(a: RankingEntry, b: RankingEntry, winnerId: string): [RankingEntry, RankingEntry] {
  const scoreA = winnerId === a.itemId ? 1 : 0;
  const scoreB = 1 - scoreA;

  const expectedA = expectedScore(a.eloScore, b.eloScore);
  const expectedB = 1 - expectedA;

  const kA = kFactor(a.comparisons);
  const kB = kFactor(b.comparisons);

  const now = new Date().toISOString();
  const newA: RankingEntry = {
    ...a,
    eloScore: Math.round(a.eloScore + kA * (scoreA - expectedA)),
    comparisons: a.comparisons + 1,
    updatedAt: now,
  };
  const newB: RankingEntry = {
    ...b,
    eloScore: Math.round(b.eloScore + kB * (scoreB - expectedB)),
    comparisons: b.comparisons + 1,
    updatedAt: now,
  };
  return [newA, newB];
}

/**
 * DECISIÓN AUTOMÁTICA #2 — Selección del próximo duelo.
 * En vez de elegir dos ítems al azar (lo que desperdicia duelos comparando
 * cosas ya muy separadas en puntaje), el sistema prioriza:
 *   1. Ítems con pocos `comparisons` (para darles cobertura inicial).
 *   2. Entre esos, el par cuyo puntaje Elo esté más cerca (duelo más
 *      informativo: un empate probable enseña más que un resultado obvio).
 * Devuelve null si el expediente de esa categoría tiene menos de 2 ítems.
 */
export function pickNextDuel(entries: RankingEntry[]): [RankingEntry, RankingEntry] | null {
  if (entries.length < 2) return null;

  const sortedByExperience = [...entries].sort((x, y) => x.comparisons - y.comparisons);
  const pool = sortedByExperience.slice(0, Math.max(4, Math.ceil(entries.length / 2)));

  let best: [RankingEntry, RankingEntry] | null = null;
  let bestGap = Infinity;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const gap = Math.abs(pool[i].eloScore - pool[j].eloScore);
      if (gap < bestGap) {
        bestGap = gap;
        best = [pool[i], pool[j]];
      }
    }
  }
  return best;
}

export type Tier = "S" | "A" | "B" | "C" | "D";

/**
 * DECISIÓN AUTOMÁTICA #3 — Clasificación por percentil, no por umbral fijo.
 * Un Elo de 1100 puede ser "top" en un expediente de 5 canciones y
 * mediocre en uno de 200 películas. Por eso el rango se calcula según la
 * posición relativa del ítem DENTRO de su propia categoría para ese
 * usuario, no contra un número mágico universal.
 */
export function assignTiers(entries: RankingEntry[]): Map<string, Tier> {
  const sorted = [...entries].sort((a, b) => b.eloScore - a.eloScore);
  const tiers = new Map<string, Tier>();
  sorted.forEach((entry, index) => {
    const percentile = sorted.length <= 1 ? 0 : index / (sorted.length - 1);
    let tier: Tier;
    if (percentile <= 0.1) tier = "S";
    else if (percentile <= 0.3) tier = "A";
    else if (percentile <= 0.6) tier = "B";
    else if (percentile <= 0.85) tier = "C";
    else tier = "D";
    tiers.set(entry.itemId, tier);
  });
  return tiers;
}
