import { useEffect, useState } from "react";
import "./App.css";
import { LoginView } from "./components/LoginView";
import { SearchView } from "./components/SearchView";
import { DuelView } from "./components/DuelView";
import { DossierView } from "./components/DossierView";
import { ProfileView } from "./components/ProfileView";
import { AuditView } from "./components/AuditView";
import { getCurrentUsername, logout, onAuthChange } from "./auth";
import { addToDossier, getDossier, recordDuel, removeFromDossier } from "./dossier";
import { getAuditLog } from "./audit";
import type { RankingEntry, AuditLogEntry } from "./types";

type Tab = "buscar" | "duelos" | "expediente" | "perfil" | "auditoria";

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
      return;
    }
    let mounted = true;
    getDossier().then((e) => {
      if (mounted) setEntries(e);
    });
    getAuditLog().then((l) => {
      if (mounted) setLog(l);
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
        <span>
          Agente:{" "}
          <button className="link-btn" onClick={() => setTab("perfil")}>
            <strong>{username}</strong>
          </button>
        </span>
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
        {(["buscar", "duelos", "expediente", "perfil", "auditoria"] as Tab[]).map((t) => (
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

      {tab === "perfil" && <ProfileView username={username} entries={entries} />}

      {tab === "auditoria" && <AuditView log={log} />}
    </div>
  );
}

function Header({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <h1>EXPEDIENTE VAULT</h1>
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

export default App;
