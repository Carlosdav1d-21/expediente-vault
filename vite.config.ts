import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// ============================================================================
// Capa 7 — Cabeceras HTTP de seguridad.
//
// La CSP de PRODUCCIÓN es estricta: no permite scripts en línea.
// En modo DESARROLLO se relaja únicamente `script-src` porque Vite inyecta
// un pequeño script en línea para el "Fast Refresh" de React (recarga
// automática al guardar cambios) — sin esa concesión, la app no puede
// ni siquiera arrancar en `npm run dev`. Esto NUNCA se despliega a
// producción: `public/_headers` (lo que de verdad usa el hosting real)
// mantiene la versión estricta.
// ============================================================================
// Origen del backend Supabase (auth + REST + realtime). Se lista explícito en
// `connect-src` en lugar de un comodín para mantener la CSP estricta.
const SUPABASE_ORIGIN = 'https://bzyktxbpmqbbahousmun.supabase.co'

function buildCsp(isDev: boolean): string {
  const scriptSrc = isDev ? "script-src 'self' 'unsafe-inline';" : "script-src 'self';"
  // `media-src` habilita el clip de audio de 30s de las canciones, servido
  // por iTunes desde audio-ssl.itunes.apple.com.
  return `default-src 'self'; img-src 'self' https: data:; media-src 'self' https://audio-ssl.itunes.apple.com; connect-src 'self' https://api.themoviedb.org https://image.tmdb.org https://api.rawg.io https://itunes.apple.com ${SUPABASE_ORIGIN} ${SUPABASE_ORIGIN.replace('https://', 'wss://')}${isDev ? ' ws://localhost:*' : ''}; ${scriptSrc} style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';`
}

function securityHeaders(isDev: boolean): Record<string, string> {
  return {
    'Content-Security-Policy': buildCsp(isDev),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  }
}

function securityHeadersPlugin(): Plugin {
  let isDev = true
  return {
    name: 'security-headers',
    config(_config, { command }) {
      isDev = command === 'serve'
    },
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [key, value] of Object.entries(securityHeaders(isDev))) {
          res.setHeader(key, value)
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        // `vite preview` sirve el build de producción: usa la CSP estricta.
        for (const [key, value] of Object.entries(securityHeaders(false))) {
          res.setHeader(key, value)
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), securityHeadersPlugin()],
})