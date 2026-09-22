import type { DlcItem } from "../types";
import { ratingColor } from "../ratingColor";
import { formatYmd } from "./InfoCard";

/**
 * Lista de DLCs/expansiones de un videojuego (RAWG). Solo se renderiza si el
 * juego tiene al menos uno; si no, no aparece nada en la ficha.
 */
export function DlcList({ dlcs }: { dlcs: DlcItem[] }) {
  if (dlcs.length === 0) return null;

  return (
    <div className="dlc-wrap">
      <p className="infocard-people-label">DLCs y expansiones ({dlcs.length})</p>
      <ul className="dlc-list">
        {dlcs.map((d) => (
          <li key={d.id} className="dlc-item">
            {d.imageUrl ? (
              <img src={d.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="dlc-img-placeholder" aria-hidden="true" />
            )}
            <span className="dlc-text">
              <span className="dlc-name">{d.name}</span>
              <span className="dlc-meta">{d.releaseDate ? formatYmd(d.releaseDate) : "Sin fecha"}</span>
            </span>
            {d.rating != null && (
              <span
                className="dlc-rating"
                style={{ background: ratingColor(d.rating * 2), color: "#1a1e1a" }}
              >
                {d.rating.toFixed(1)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
