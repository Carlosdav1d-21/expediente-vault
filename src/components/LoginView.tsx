import { useState } from "react";
import { login, register } from "../auth";

export function LoginView({ onAuthenticated }: { onAuthenticated: (username: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === "login" ? await login(username, password) : await register(username, password);
    setLoading(false);
    if (result.ok) {
      onAuthenticated(result.username);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="panel auth-panel">
      <h2>{mode === "login" ? "Acceso al expediente" : "Nuevo agente"}</h2>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : undefined}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Verificando..." : mode === "login" ? "Ingresar" : "Crear expediente"}
        </button>
      </form>
      <button className="link-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </div>
  );
}
