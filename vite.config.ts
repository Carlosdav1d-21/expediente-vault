import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// ============================================================================
// Capa 7 — Cabeceras HTTP de seguridad.
// En `vite dev`/`vite preview` estas cabeceras se inyectan vía middleware,
// porque ambos son servidores propios de Vite. En producción (hosting
// estático tipo Netlify/Vercel/GitHub Pages) Vite ya no sirve el sitio, así
// que las mismas cabeceras se replican en `public/_headers`, que esas
// plataformas leen automáticamente al desplegar.
// ============================================================================
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' https: data:; connect-src 'self' https://api.themoviedb.org https://image.tmdb.org https://api.rawg.io https://itunes.apple.com; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
}

function securityHeadersPlugin(): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(key, value)
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
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
