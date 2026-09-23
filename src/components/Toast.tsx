import { useEffect, useState } from "react";

const TOAST_MS = 3000;

export interface Toast {
  ok: boolean;
  text: string;
}

/** Aviso temporal: se oculta solo a los TOAST_MS de mostrarse. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return [toast, setToast] as const;
}

export function ToastRegion({ toast }: { toast: Toast | null }) {
  return (
    // La región existe siempre para que los lectores de pantalla anuncien el aviso al aparecer.
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className={toast.ok ? "toast" : "toast toast-error"}>
          <span className="toast-icon" aria-hidden="true">
            {toast.ok ? "✓" : "!"}
          </span>
          {toast.text}
        </div>
      )}
    </div>
  );
}
