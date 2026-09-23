import { useState } from "react";
import { REVIEW_MAX_LENGTH } from "../security";

export function ReviewEditor({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: string;
  saving: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const unchanged = text.trim() === initial.trim();

  return (
    <form
      className="review-editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text);
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={REVIEW_MAX_LENGTH}
        rows={4}
        placeholder="¿Qué te pareció? Escribe tu reseña (opcional)."
        aria-label="Tu reseña"
        autoFocus
      />
      <div className="review-editor-foot">
        <span className="review-editor-hint">
          {text.length}/{REVIEW_MAX_LENGTH} · Otros usuarios podrán leerla
        </span>
        <div className="review-editor-actions">
          {initial && (
            <button type="button" className="danger-btn" onClick={() => onSave("")} disabled={saving}>
              Borrar
            </button>
          )}
          <button type="button" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || unchanged}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
