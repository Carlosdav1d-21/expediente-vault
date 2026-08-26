import { useEffect, useState } from "react";
import "./App.css";
import { LoginView } from "./components/LoginView";
import { SearchView } from "./components/SearchView";
import { DuelView } from "./components/DuelView";
import { DossierView } from "./components/DossierView";
import { AuditView } from "./components/AuditView";
import { getSession, logout } from "./auth";
import { addToDossier, getDossier, recordDuel, removeFromDossier } from "./dossier";
import { getAuditLog } from "./audit";
import type { RankingEntry, AuditLogEntry } from "./types";

type Tab = "buscar" | "duelos" | "expediente" | "auditoria";

function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("buscar");
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [log, setLog] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    const session = getSession();
    if (session) setUsername(session.username);
  }, []);

  useEffect(() => {
    if (username) {
      setEntries(getDossier(username));
      setLog(getAuditLog());
    }
  }, [username]);

  function refreshLog() {
    setLog(getAuditLog());
  }

  if (!username) {
    return (
      <div className="app-shell">
        <Header />
        <LoginView onAuthenticated={setUsername} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header />
      <div className="topbar">
        <span>
          Agente: <strong>{username}</strong>
        </span>
        <button
          className="link-btn"
          onClick={() => {
            logout(username);
            setUsername(null);
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <nav className="tabs">
        {(["buscar", "duelos", "expediente", "auditoria"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === "buscar" && (
        <SearchView
          onAdd={(item) => {
            setEntries(addToDossier(username, item));
            refreshLog();
          }}
        />
      )}

      {tab === "duelos" && (
        <DuelView
          entries={entries}
          onResolve={(winnerId, loserId) => {
            setEntries(recordDuel(username, winnerId, loserId));
            refreshLog();
          }}
        />
      )}

      {tab === "expediente" && (
        <DossierView
          entries={entries}
          onRemove={(id) => {
            setEntries(removeFromDossier(username, id));
            refreshLog();
          }}
        />
      )}

      {tab === "auditoria" && <AuditView log={log} />}
    </div>
  );
}

function Header() {
  return (
    <header className="app-header">
      <h1>EXPEDIENTE VAULT</h1>
      <p className="subtitle">Clasificación confidencial de películas, series, videojuegos y música</p>
    </header>
  );
}

export default App;
