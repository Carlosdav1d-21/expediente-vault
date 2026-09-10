import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Aplica el tema elegido antes del primer render para evitar el parpadeo
// de color. Si no hay elección guardada, el CSS usa la preferencia del SO.
try {
  const stored = localStorage.getItem('ev-theme')
  if (stored === 'dark' || stored === 'light') {
    document.documentElement.setAttribute('data-theme', stored)
  }
} catch {
  /* almacenamiento no disponible */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
