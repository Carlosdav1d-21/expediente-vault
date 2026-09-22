import { useEffect, useState } from "react";
import "./App.css";
import { LoginView } from "./components/LoginView";
import { SearchView } from "./components/SearchView";
import { DuelView } from "./components/DuelView";
import { DossierView } from "./components/DossierView";
import { ProfileView } from "./components/ProfileView";
import { CommunityView } from "./components/CommunityView";
import { AuditView } from "./components/AuditView";
import { AdminView } from "./components/AdminView";
import { getCurrentProfile, getCurrentUsername, logout, onAuthChange } from "./auth";
import type { Role } from "./auth";
import { addToDossier, getDossier, recordDuel, removeFromDossier } from "./dossier";
import { getAuditLog } from "./audit";
import type { RankingEntry, AuditLogEntry } from "./types";

type Tab = "buscar" | "duelos" | "expediente" | "comunidad" | "perfil" | "auditoria" | "admin";

type Theme = "light" | "dark";

function readStoredTheme(): Theme | null {
  try {
    const t = localStorage.getItem("ev-theme");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState<Tab>("buscar");
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [log, setLog] = useState<AuditLogEntry[]>([]);
  const [role, setRole] = useState<Role>("user");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme | null>(() => readStoredTheme());

  const isDark = theme ? theme === "dark" : systemPrefersDark();

  useEffect(() => {
    const root = document.documentElement;
    if (theme) {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      if (theme) localStorage.setItem("ev-theme", theme);
      else localStorage.removeItem("ev-theme");
    } catch {
      /* almacenamiento no disponible: el tema sigue aplicándose en memoria */
    }
  }, [theme]);

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  useEffect(() => {
    let mounted = true;
    getCurrentUsername().then((u) => {
      if (mounted) {
        setUsername(u);
        setAuthReady(true);
      }
    });
    const unsubscribe = onAuthChange((u) => {
      if (mounted) setUsername(u);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!username) {
      setEntries([]);
      setLog([]);
      setRole("user");
      setAvatarUrl(null);
      return;
    }
    let mounted = true;
    getDossier().then((e) => {
      if (mounted) setEntries(e);
    });
    getAuditLog().then((l) => {
      if (mounted) setLog(l);
    });
    getCurrentProfile().then((p) => {
      if (mounted) {
        setRole(p?.role ?? "user");
        setAvatarUrl(p?.avatarUrl ?? null);
      }
    });
    return () => {
      mounted = false;
    };
  }, [username]);

  async function refreshLog() {
    setLog(await getAuditLog());
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="app-shell">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />
        <LoginView onAuthenticated={setUsername} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header isDark={isDark} onToggleTheme={toggleTheme} />
      <div className="topbar">
        <button className="profile-chip" onClick={() => setTab("perfil")}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-mini" />
          ) : (
            <span className="avatar-mini avatar-placeholder" aria-hidden="true">
              👤
            </span>
          )}
          <span>Perfil</span>
        </button>
        <button
          className="link-btn"
          onClick={async () => {
            await logout();
            setUsername(null);
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <nav className="tabs">
        {(
          [
            "buscar",
            "duelos",
            "expediente",
            "comunidad",
            // Perfil ya no va aquí: se accede con el chip de arriba (foto +
            // "Perfil"). Auditoría y Admin son exclusivas del rol admin: un
            // usuario normal ni siquiera ve la pestaña.
            ...(role === "admin" ? (["auditoria", "admin"] as const) : []),
          ] as Tab[]
        ).map((t) => (
          <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === "buscar" && (
        <SearchView
          onAdd={async (item) => {
            setEntries(await addToDossier(item));
            void refreshLog();
          }}
        />
      )}

      {tab === "duelos" && (
        <DuelView
          entries={entries}
          onResolve={async (winnerId, loserId) => {
            setEntries(await recordDuel(entries, winnerId, loserId));
            void refreshLog();
          }}
        />
      )}

      {tab === "expediente" && (
        <DossierView
          entries={entries}
          onRemove={async (id) => {
            setEntries(await removeFromDossier(id));
            void refreshLog();
          }}
        />
      )}

      {tab === "comunidad" && <CommunityView />}

      {tab === "perfil" && (
        <ProfileView username={username} entries={entries} onAvatarChange={setAvatarUrl} />
      )}

      {tab === "auditoria" && role === "admin" && <AuditView log={log} />}

      {tab === "admin" && role === "admin" && <AdminView />}
    </div>
  );
}

function Header({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <div className="app-title">
          <AppLogo />
          <h1>EXPEDIENTE VAULT</h1>
        </div>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title="Cambiar tema"
        >
          {isDark ? "☀" : "☾"}
        </button>
      </div>
      <p className="subtitle">Clasificación confidencial de películas, series, videojuegos y música</p>
    </header>
  );
}

/** Marca del proyecto: expediente (candado) sobre el color de acento. Sigue el tema claro/oscuro. */
function AppLogo() {
  return (
    <svg className="app-logo" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="9" style={{ fill: "var(--accent)" }} />
      <circle cx="16" cy="12.6" r="4.3" style={{ fill: "var(--on-accent)" }} />
      <path d="M13.2 15.4h5.6l1.9 8.4h-9.4z" style={{ fill: "var(--on-accent)" }} />
    </svg>
  );
}

export default App;
