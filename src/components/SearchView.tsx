import { useState } from "react";
import type { MediaCategory, MediaItem } from "../types";
import { searchByCategory } from "../api/unifiedSearch";

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  pelicula: "🎬 Películas (TMDB)",
  serie: "📺 Series (TMDB)",
  videojuego: "🎮 Videojuegos (RAWG)",
  cancion: "🎵 Canciones (iTunes)",
};

export function SearchView({ onAdd }: { onAdd: (item: MediaItem) => void }) {
  const [category, setCategory] = useState<MediaCategory>("pelicula");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const items = await searchByCategory(query, category);
      setResults(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de búsqueda.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Buscar y clasificar</h2>
      <form onSubmit={handleSearch} className="search-row">
        <select value={category} onChange={(e) => setCategory(e.target.value as MediaCategory)}>
          {(Object.keys(CATEGORY_LABELS) as MediaCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          placeholder="Ej: Interstellar, Zelda, Radiohead..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="results-grid">
        {results.map((item) => (
          <div key={item.id} className="card">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} loading="lazy" />
            ) : (
              <div className="card-placeholder">Sin imagen</div>
            )}
            <div className="card-body">
              <p className="card-title">{item.title}</p>
              <p className="card-meta">{item.year ?? "s/f"}</p>
              <button onClick={() => onAdd(item)}>+ Añadir al expediente</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
