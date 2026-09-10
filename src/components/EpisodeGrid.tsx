import type { SeriesRatings } from "../types";
import { ratingColor } from "../ratingColor";
import { seriesAverage } from "../api/tmdbEpisodes";
import { ScoreBox } from "./ScoreBox";

/**
 * Grilla de puntuaciones por episodio y temporada (datos agregados de TMDB).
 * Columnas = temporadas, filas = número de episodio, celda coloreada según la
 * nota. Última fila = promedio de cada temporada. Al lado, una caja con la
 * media global de toda la serie.
 */
export function EpisodeGrid({ ratings }: { ratings: SeriesRatings }) {
  const seasons = ratings.seasons.filter((s) => s.episodes.length > 0);
  if (seasons.length === 0) return null;

  const maxEpisodes = Math.max(...seasons.map((s) => s.episodes.length));
  const rows = Array.from({ length: maxEpisodes }, (_, i) => i + 1);
  const overall = seriesAverage(ratings);

  return (
    <div className="episgrid-wrap">
      <p className="infocard-people-label">Puntuación por episodio (TMDB)</p>
      <div className="episgrid-layout">
        <div className="episgrid-scroll">
          <table className="episgrid">
            <thead>
              <tr>
                <th aria-hidden="true" />
                {seasons.map((s) => (
                  <th key={s.seasonNumber}>T{s.seasonNumber}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((epNum) => (
                <tr key={epNum}>
                  <th scope="row">E{epNum}</th>
                  {seasons.map((s) => {
                    const ep = s.episodes.find((e) => e.episodeNumber === epNum);
                    const score =
                      ep && ep.voteCount > 0 && ep.voteAverage > 0 ? round1(ep.voteAverage) : null;
                    return (
                      <td
                        key={s.seasonNumber}
                        style={score != null ? { background: ratingColor(score), color: "#1a1e1a" } : undefined}
                        title={
                          ep
                            ? `T${s.seasonNumber}E${epNum} · ${ep.name}${score != null ? ` · ${score.toFixed(1)}` : " · sin nota"}`
                            : undefined
                        }
                      >
                        {score != null ? score.toFixed(1) : ep ? "–" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="episgrid-avg">
                <th scope="row">Prom.</th>
                {seasons.map((s) => (
                  <td
                    key={s.seasonNumber}
                    style={s.average != null ? { background: ratingColor(s.average), color: "#1a1e1a" } : undefined}
                  >
                    {s.average != null ? s.average.toFixed(1) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {overall != null && <ScoreBox value={overall} label="Media serie" />}
      </div>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
