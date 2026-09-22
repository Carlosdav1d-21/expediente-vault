import { useEffect, useRef, useState } from "react";
import { getCurrentProfile, updateDisplayName, updatePassword, uploadAvatar } from "../auth";

type Status = { type: "ok" | "error"; msg: string } | null;

/**
 * Edición de perfil personal: foto, nombre para mostrar y contraseña. El
 * usuario de login (identidad de la cuenta) no es editable aquí a propósito.
 */
export function ProfileEditor({
  onDisplayNameChange,
  onAvatarChange,
}: {
  onDisplayNameChange?: (name: string | null) => void;
  onAvatarChange?: (url: string | null) => void;
}) {
  const [nameInput, setNameInput] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [nameSaving, setNameSaving] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<Status>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setNameInput(p?.displayName ?? "");
      setAvatarUrl(p?.avatarUrl ?? null);
    });
  }, []);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // deja volver a elegir el mismo archivo despues
    if (!file) return;

    setAvatarStatus(null);
    setAvatarUploading(true);
    const result = await uploadAvatar(file);
    setAvatarUploading(false);

    if (result.ok) {
      const fresh = await getCurrentProfile();
      setAvatarUrl(fresh?.avatarUrl ?? null);
      setAvatarStatus({ type: "ok", msg: "Foto actualizada." });
      onAvatarChange?.(fresh?.avatarUrl ?? null);
    } else {
      setAvatarStatus({ type: "error", msg: result.error });
    }
  }

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

      <div className="avatar-editor">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="avatar-preview" />
        ) : (
          <div className="avatar-preview avatar-placeholder" aria-hidden="true">
            👤
          </div>
        )}
        <div className="stack">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleAvatarSelect}
            hidden
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
            {avatarUploading ? "Subiendo…" : "Subir foto"}
          </button>
          {avatarStatus && (
            <p className={avatarStatus.type === "error" ? "error-text" : "muted"}>{avatarStatus.msg}</p>
          )}
          <span className="muted">JPG, PNG, WEBP o GIF. Máx. 2 MB.</span>
        </div>
      </div>

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
