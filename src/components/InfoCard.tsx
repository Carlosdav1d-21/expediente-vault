import { useEffect, useRef, useState } from "react";
import type { DlcItem, MediaDetail, MediaItem, SeriesRatings } from "../types";
import { fetchMediaDetail } from "../api/unifiedDetail";
import { fetchSeriesRatings } from "../api/tmdbEpisodes";
import { fetchGameDlcs } from "../api/rawg";
import { EpisodeGrid } from "./EpisodeGrid";
import { ScoreBox } from "./ScoreBox";
import { DlcList } from "./DlcList";
import { ItemReviews } from "./ItemReviews";

/**
 * Modal de ficha ampliada (info card). Recibe el MediaItem sobre el que se
 * hizo click y pide su detalle a la API que corresponda. Se cierra con la X,
 * con click fuera o con Escape.
 */
export function InfoCard({ item: initialItem, onClose }: { item: MediaItem; onClose: () => void }) {
  // Fichas abiertas en orden (canción → su álbum → otra canción…); "Volver" regresa a la anterior.
  const [history, setHistory] = useState<MediaItem[]>([initialItem]);
  const item = history[history.length - 1];
  const overlayRef = useRef<HTMLDivElement>(null);

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Solo para series: puntuaciones por episodio/temporada (datos de TMDB).
  const [seriesRatings, setSeriesRatings] = useState<SeriesRatings | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Solo para videojuegos: DLCs y expansiones (RAWG), si tiene.
  const [dlcs, setDlcs] = useState<DlcItem[] | null>(null);
  const [dlcsLoading, setDlcsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetchMediaDetail(item)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar la ficha.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (item.category !== "serie") {
      setSeriesRatings(null);
      return;
    }
    let cancelled = false;
    setSeriesRatings(null);
    setRatingsLoading(true);
    fetchSeriesRatings(Number(item.externalId))
      .then((r) => {
        if (!cancelled) setSeriesRatings(r);
      })
      .catch(() => {
        // La ficha sigue siendo útil sin la grilla; no se muestra error aparte.
      })
      .finally(() => {
        if (!cancelled) setRatingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (item.category !== "videojuego") {
      setDlcs(null);
      return;
    }
    let cancelled = false;
    setDlcs(null);
    setDlcsLoading(true);
    fetchGameDlcs(Number(item.externalId))
      .then((d) => {
        if (!cancelled) setDlcs(d);
      })
      .catch(() => {
        // La ficha sigue siendo útil sin la lista de DLCs.
      })
      .finally(() => {
        if (!cancelled) setDlcsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    overlayRef.current?.scrollTo(0, 0);
  }, [item]);

  function openItem(next: MediaItem) {
    setHistory((h) => [...h, next]);
  }

  function goBack() {
    setHistory((h) => h.slice(0, -1));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        {history.length > 1 && (
          <button className="link-btn infocard-back" onClick={goBack}>
            ← Volver
          </button>
        )}

        {loading && <p className="muted">Cargando ficha…</p>}
        {error && <p className="error-text">{error}</p>}

        {detail && (
          <div className="infocard">
            <div className="infocard-head">
              {detail.imageUrl ? (
                <img className="infocard-poster" src={detail.imageUrl} alt={detail.title} />
              ) : (
                <div className="infocard-poster card-placeholder">Sin imagen</div>
              )}
              <div className="infocard-headmeta">
                <h3>{detail.title}</h3>
                <p className="infocard-dates">{formatDateRange(detail)}</p>
                {detail.status && <span className="infocard-badge">{detail.status}</span>}
                {metaLine(detail) && <p className="infocard-metaline">{metaLine(detail)}</p>}
              </div>
              {(detail.category === "pelicula" || detail.category === "serie") &&
                detail.rating != null && (
                  <ScoreBox value={detail.rating} label={detail.ratingLabel ?? "Nota"} />
                )}
            </div>

            {detail.synopsis && <p className="infocard-synopsis">{detail.synopsis}</p>}

            {detail.previewAudioUrl && (
              <audio className="infocard-audio" src={detail.previewAudioUrl} controls preload="none" />
            )}

            {detail.facts.length > 0 && (
              <dl className="infocard-facts">
                {detail.facts.map(({ label, value, link }) => (
                  <div key={label} className="infocard-fact">
                    <dt>{label}</dt>
                    <dd>
                      {link ? (
                        <button className="link-btn" onClick={() => openItem(link)}>
                          {value}
                        </button>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {item.category === "serie" && ratingsLoading && !seriesRatings && (
              <p className="muted">Cargando puntuaciones de episodios…</p>
            )}
            {seriesRatings && <EpisodeGrid ratings={seriesRatings} />}

            {item.category === "videojuego" && dlcsLoading && !dlcs && (
              <p className="muted">Buscando DLCs…</p>
            )}
            {dlcs && <DlcList dlcs={dlcs} />}

            {detail.tracks.length > 0 && (
              <div className="infocard-tracks">
                <p className="infocard-people-label">Canciones ({detail.tracks.length})</p>
                <ol>
                  {detail.tracks.map((t, i) => (
                    <li key={i}>
                      <span className="track-num">{i + 1}</span>
                      <button className="track-name track-btn" onClick={() => openItem(t.item)}>
                        {t.name}
                      </button>
                      {t.duration && <span className="track-duration">{t.duration}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {detail.people.length > 0 && (
              <div className="infocard-people">
                <p className="infocard-people-label">{detail.peopleLabel}</p>
                <ul>
                  {detail.people.map((p, i) => (
                    <li key={`${p.name}-${i}`}>
                      {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
                      <span className="infocard-person-text">
                        <span className="infocard-person-name">{p.name}</span>
                        {p.role && <span className="infocard-person-role">{p.role}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ItemReviews itemId={item.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateRange(d: MediaDetail): string {
  const start = d.releaseDate ? formatYmd(d.releaseDate) : null;
  const end = d.endDate ? formatYmd(d.endDate) : null;
  if (start && end) return `${start} — ${end}`;
  if (start) return start;
  return "Fecha desconocida";
}

export function formatYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

function metaLine(d: MediaDetail): string {
  // Para película/serie la nota va en la ScoreBox; para el resto (juegos:
  // Metacritic) se muestra aquí porque no tienen caja.
  const hasScoreBox = d.category === "pelicula" || d.category === "serie";
  return [
    d.genres.slice(0, 3).join(" · ") || null,
    d.runtimeMinutes ? `${d.runtimeMinutes} min` : null,
    !hasScoreBox && d.rating != null ? `${d.rating}${d.ratingLabel ? ` ${d.ratingLabel}` : ""}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
}
