import { useEffect, useState } from "react";
import { getCurrentProfile, updateDisplayName, updatePassword } from "../auth";

type Status = { type: "ok" | "error"; msg: string } | null;

/**
 * Edición de perfil personal: nombre para mostrar y contraseña. El usuario
 * de login (identidad de la cuenta) no es editable aquí a propósito.
 */
export function ProfileEditor({ onDisplayNameChange }: { onDisplayNameChange?: (name: string | null) => void }) {
  const [nameInput, setNameInput] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [nameSaving, setNameSaving] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    getCurrentProfile().then((p) => setNameInput(p?.displayName ?? ""));
  }, []);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameStatus(null);
    setNameSaving(true);
    const result = await updateDisplayName(nameInput);
    setNameSaving(false);
    if (result.ok) {
      const trimmed = nameInput.trim();
      setNameInput(trimmed);
      setNameStatus({ type: "ok", msg: "Nombre actualizado." });
      onDisplayNameChange?.(trimmed);
    } else {
      setNameStatus({ type: "error", msg: result.error });
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);
    if (password !== passwordConfirm) {
      setPasswordStatus({ type: "error", msg: "Las contraseñas no coinciden." });
      return;
    }
    setPasswordSaving(true);
    const result = await updatePassword(password);
    setPasswordSaving(false);
    if (result.ok) {
      setPassword("");
      setPasswordConfirm("");
      setPasswordStatus({ type: "ok", msg: "Contraseña actualizada." });
    } else {
      setPasswordStatus({ type: "error", msg: result.error });
    }
  }

  return (
    <div className="profile-editor">
      <h3>Editar perfil</h3>

      <form className="stack" onSubmit={handleNameSubmit}>
        <label>
          Nombre para mostrar
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Ej: Carlos D."
            maxLength={60}
          />
        </label>
        {nameStatus && (
          <p className={nameStatus.type === "error" ? "error-text" : "muted"}>{nameStatus.msg}</p>
        )}
        <button type="submit" disabled={nameSaving}>
          {nameSaving ? "Guardando…" : "Guardar nombre"}
        </button>
      </form>

      <form className="stack" onSubmit={handlePasswordSubmit}>
        <label>
          Nueva contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        <label>
          Confirmar contraseña
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        {passwordStatus && (
          <p className={passwordStatus.type === "error" ? "error-text" : "muted"}>{passwordStatus.msg}</p>
        )}
        <button type="submit" disabled={passwordSaving || !password}>
          {passwordSaving ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
