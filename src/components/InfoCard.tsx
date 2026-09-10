import { useEffect, useState } from "react";
import type { MediaDetail, MediaItem } from "../types";
import { fetchMediaDetail } from "../api/unifiedDetail";

/**
 * Modal de ficha ampliada (info card). Recibe el MediaItem sobre el que se
 * hizo click y pide su detalle a la API que corresponda. Se cierra con la X,
 * con click fuera o con Escape.
 */
export function InfoCard({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

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
            </div>

            {detail.synopsis && <p className="infocard-synopsis">{detail.synopsis}</p>}

            {detail.previewAudioUrl && (
              <audio className="infocard-audio" src={detail.previewAudioUrl} controls preload="none" />
            )}

            {detail.facts.length > 0 && (
              <dl className="infocard-facts">
                {detail.facts.map((f) => (
                  <div key={f.label} className="infocard-fact">
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
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

function formatYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

function metaLine(d: MediaDetail): string {
  return [
    d.genres.slice(0, 3).join(" · ") || null,
    d.runtimeMinutes ? `${d.runtimeMinutes} min` : null,
    d.rating != null ? `${d.rating}${d.ratingLabel ? ` ${d.ratingLabel}` : ""}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
}
