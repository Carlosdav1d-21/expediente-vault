import { ratingColor } from "../ratingColor";

/**
 * Caja de puntuación destacada (nota 0-10) coloreada según su valor.
 * Se usa para la nota de una película y para la media global de una serie.
 */
export function ScoreBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="scorebox" style={{ background: ratingColor(value), color: "#1a1e1a" }}>
      <span className="scorebox-value">{value.toFixed(1)}</span>
      <span className="scorebox-label">{label}</span>
    </div>
  );
}
