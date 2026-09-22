# Expediente Vault

**Proyecto final — Ciberseguridad, Ingeniería en Desarrollo de Software**

Expediente Vault es una aplicación web para llevar un ranking personal de las películas, series, videojuegos y canciones que has visto, jugado o escuchado — todo en un solo lugar, en vez de tener esa información repartida en varias apps distintas.

**🔗 Demo en vivo:** https://expediente-vault.vercel.app

---

## ¿De qué se trata?

Hoy en día usamos apps distintas para cada tipo de contenido: una para películas, otra para videojuegos, otra para música, y cada una califica diferente (estrellas, números del 1 al 10, "me gusta"). Esto hace difícil tener una idea clara de qué tanto te gustó algo comparado con otra cosa.

Expediente Vault junta las 4 categorías en un solo lugar y, en vez de pedirte que le pongas una calificación de memoria, te muestra **dos cosas a la vez y te pregunta cuál prefieres**. A partir de esas comparaciones, la app calcula por sí sola un ranking ordenado — el mismo principio (Elo) que se usa para rankear jugadores de ajedrez.

---

## ¿Qué puede hacer la aplicación?

- **Crear una cuenta e iniciar sesión** (usuario + contraseña; la autenticación real la maneja Supabase Auth).
- **Buscar** películas y series, videojuegos, o canciones, conectándose a bases de datos reales (TMDB, RAWG e iTunes), con miniatura de cada resultado.
- **Ver la ficha ampliada de cualquier ítem**: sinopsis, fecha de estreno/lanzamiento, estado ("Finalizada", "En emisión"...), géneros, reparto o equipo, nota agregada, y un preview de audio de 30s para canciones.
- Para series, **ver la puntuación de cada episodio por temporada** (datos de TMDB) en una grilla tipo mapa de calor, más la media global del show.
- **Agregar ítems a tu expediente personal** y **compararlos de dos en dos** para que la app calcule el ranking automáticamente.
- **Ver tu expediente ordenado**, con una insignia de rango (S, A, B, C, D) para cada ítem.
- **Ver tu perfil**: estadísticas de actividad y todo lo rankeado, agrupado por categoría.
- **Ver un historial de auditoría** de las acciones importantes de tu cuenta.
- **Tema claro/oscuro** con toggle persistente.

---

## ¿Cómo se ve por dentro? (capas de seguridad)

1. **Autenticación**: la maneja Supabase Auth (hash y verificación de contraseña del lado servidor). El producto sigue siendo "usuario + contraseña": internamente se deriva un email sintético determinista a partir del usuario, que el usuario nunca ve.
2. **Autorización por fila (RLS)**: cada tabla de la base de datos (`rankings`, `audit_log`, `profiles`) tiene Row Level Security activado — un usuario solo puede leer y escribir SUS propias filas, sin importar qué haga el cliente. Esto se hace cumplir en la base de datos, no en el frontend.
3. **Sanitización de entradas**: todo lo que el usuario escribe se limpia (quita HTML y caracteres de control) antes de guardarse o usarse en una búsqueda, como defensa en profundidad adicional al escape automático de React.
4. **Content Security Policy estricta**: en producción no se permite ejecutar scripts en línea ni cargar recursos fuera de una lista explícita de orígenes (TMDB, RAWG, iTunes, Supabase). Configurada vía `vercel.json` en producción y como middleware de Vite en desarrollo.
5. **Cabeceras HTTP adicionales**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
6. **Auditoría**: registro server-side (tabla `audit_log`, también con RLS) de cada acción sensible — login, registro, logout, ítems agregados/quitados, duelos resueltos — con timestamp y usuario.
7. **Pipeline de CI/CD** (GitHub Actions) que en cada push corre: build + type-check, la suite de tests, `npm audit` sobre dependencias de producción, ESLint con `eslint-plugin-security`, y CodeQL.

> **Nota de diseño:** en una versión anterior (el avance del curso) las capas 1 y 2 (hash PBKDF2 y rate limiting de login) estaban implementadas a mano en el navegador. Se migraron a Supabase Auth porque hacer eso del lado del cliente es, en sí mismo, una mala práctica de seguridad — el código sigue en `src/security.ts` (y probado en `src/security.test.ts`) como referencia y por si se necesita en el futuro.

---

## Tecnología usada

- **Frontend**: React 19 + TypeScript + Vite.
- **Backend**: Supabase (Postgres administrado + Auth + Row Level Security). Sin servidor propio que mantener.
- **APIs externas**: TMDB (cine y series, incluye ratings por episodio), RAWG (videojuegos), iTunes Search (música, sin API key).
- **Testing**: Vitest.
- **Hosting**: Vercel (deploy automático en cada push a `main`).
- **CI/SAST**: GitHub Actions, ESLint (`eslint-plugin-security`), CodeQL, `npm audit`.

---

## Cómo correrlo en local

```bash
git clone https://github.com/Carlosdav1d-21/expediente-vault.git
cd expediente-vault
npm install
cp .env.example .env
```

Completa `.env` con:
- Tus claves gratuitas de **TMDB** y **RAWG** (se consiguen registrándose en sus sitios). iTunes no necesita clave.
- Tu propio proyecto de **Supabase**: crea uno gratis en [supabase.com](https://supabase.com), corre el contenido de [`supabase/schema.sql`](supabase/schema.sql) en su SQL Editor (crea las tablas y las políticas RLS), y copia el *Project URL* y la *anon key* desde Project Settings → API.

Arrancar en modo desarrollo:

```bash
npm run dev
```

Correr la suite de tests:

```bash
npm run test
```

---

## Estado del proyecto

**Terminado:**
- Registro, login y sesión persistente vía Supabase Auth
- Búsqueda unificada en TMDB / RAWG / iTunes con deduplicación
- Ficha de detalle (info card) por ítem, incluida la grilla de puntuación por episodio en series
- Motor de ranking Elo propio (duelos, K-factor dinámico, tiers por percentil)
- Expediente y perfil persistidos en Postgres (Supabase), con RLS
- Bitácora de auditoría server-side
- Rediseño visual con tema claro/oscuro
- Suite de tests (Vitest) sobre la lógica de negocio propia
- CI/CD con SAST (ESLint security, CodeQL, npm audit) + deploy automático a Vercel

**Fuera de alcance para esta entrega (roadmap):**
- Recomendaciones basadas en lo que el usuario ha rankeado
- Reseñas escritas por otros usuarios registrados
- Comparación de gustos entre usuarios (requiere una base de usuarios activa y perfiles públicos)
