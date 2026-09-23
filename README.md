# Expediente Vault

**Proyecto final — Ciberseguridad, Ingeniería en Desarrollo de Software**

Expediente Vault es una aplicación web para llevar un ranking personal de las películas, series, videojuegos, canciones y álbumes que has visto, jugado o escuchado — todo en un solo lugar, en vez de tener esa información repartida en varias apps distintas.

**🔗 Demo en vivo:** https://expediente-vault.vercel.app

---

## ¿De qué se trata?

Hoy en día usamos apps distintas para cada tipo de contenido: una para películas, otra para videojuegos, otra para música, y cada una califica diferente (estrellas, números del 1 al 10, "me gusta"). Esto hace difícil tener una idea clara de qué tanto te gustó algo comparado con otra cosa.

Expediente Vault junta las 4 categorías en un solo lugar y, en vez de pedirte que le pongas una calificación de memoria, te muestra **dos cosas a la vez y te pregunta cuál prefieres**. A partir de esas comparaciones, la app calcula por sí sola un ranking ordenado — el mismo principio (Elo) que se usa para rankear jugadores de ajedrez.

---

## ¿Qué puede hacer la aplicación?

- **Crear una cuenta e iniciar sesión** (usuario + contraseña; la autenticación real la maneja Supabase Auth). La sesión **no persiste** al recargar la página — por diseño, vuelve siempre al login.
- **Buscar** películas y series, videojuegos, o música (álbumes y canciones en la misma búsqueda), conectándose a bases de datos reales (TMDB, RAWG e iTunes), con miniatura de cada resultado y filtrado por relevancia exacta (buscar "Fallout 3" no trae el resto de la franquicia). Las canciones también se encuentran por el nombre de su álbum.
- **Filtro de contenido para adultos** en las búsquedas: usa las marcas de cada API (TMDB, etiquetas y clasificación ESRB de RAWG) más una revisión de títulos.
- **Ver la ficha ampliada de cualquier ítem**: sinopsis, fecha de estreno/lanzamiento, estado ("Finalizada", "En emisión"...), géneros, reparto o equipo, nota agregada, un preview de audio de 30s para canciones y la lista de canciones de cada álbum.
- Para series, **ver la puntuación de cada episodio por temporada** (datos de TMDB) en una grilla tipo mapa de calor, más la media global del show.
- Para videojuegos, **ver sus DLCs y expansiones** (RAWG), si tiene.
- **Agregar ítems a tu expediente personal** y **compararlos de dos en dos** para que la app calcule el ranking automáticamente.
- **Ver tu expediente ordenado**, con una insignia de rango (S, A, B, C, D) para cada ítem.
- **Escribir una reseña (opcional)** de cualquier ítem de tu expediente, de hasta 1000 caracteres. Las reseñas de todos los usuarios aparecen en la ficha de cada ítem.
- **Editar tu perfil**: nombre para mostrar, foto de perfil (subida a Supabase Storage) y contraseña.
- **Comunidad**: ver el ranking de TODOS los usuarios registrados, agrupado por categoría — y tocar el nombre de cualquiera para abrir su expediente completo.
- **Panel de administrador** (solo para cuentas con rol `admin`): estadísticas del sistema y la bitácora de auditoría de todos los usuarios. Un usuario normal ni siquiera ve esas pestañas.
- **Tema claro/oscuro** con toggle.

---

## ¿Cómo se ve por dentro? (capas de seguridad)

1. **Autenticación**: la maneja Supabase Auth (hash y verificación de contraseña del lado servidor). El producto sigue siendo "usuario + contraseña": internamente se deriva un email sintético determinista a partir del usuario, que el usuario nunca ve. La sesión vive solo en memoria (no se persiste en `localStorage`), así que un refresh de página siempre exige volver a entrar.
2. **Autorización por fila (RLS)**: cada tabla de la base de datos (`rankings`, `audit_log`, `profiles`) tiene Row Level Security activado. Por defecto cada usuario solo lee/escribe SUS propias filas; `rankings` y `profiles` además tienen una política de lectura abierta a cualquier autenticado (para la Comunidad y los perfiles públicos) — deliberada, y las escrituras siguen restringidas al dueño.
3. **Control de acceso por rol (RBAC)**: columna `profiles.role` (`user`/`admin`). La columna está protegida con un `REVOKE` a nivel de Postgres — un usuario no puede autoasignarse `admin` llamando la API directo, ni siquiera si encuentra la forma de saltarse la UI.
4. **Sanitización de entradas**: todo lo que el usuario escribe se limpia (quita HTML y caracteres de control) antes de guardarse o usarse en una búsqueda, como defensa en profundidad adicional al escape automático de React.
5. **Content Security Policy estricta**: en producción no se permite ejecutar scripts en línea ni cargar recursos fuera de una lista explícita de orígenes (TMDB, RAWG, iTunes, Supabase). Configurada vía `vercel.json` en producción y como middleware de Vite en desarrollo.
6. **Cabeceras HTTP adicionales**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
7. **Auditoría**: registro server-side (tabla `audit_log`, también con RLS) de cada acción sensible — login, registro, logout, ítems agregados/quitados, duelos resueltos, cambios de perfil — con timestamp y usuario. Solo el admin ve la bitácora completa; un usuario normal no tiene acceso a esa pestaña.
8. **Pipeline de CI/CD** (GitHub Actions) que en cada push corre: build + type-check, la suite de tests, `npm audit` sobre dependencias de producción, ESLint con `eslint-plugin-security`, y CodeQL.

> **Nota de diseño:** en una versión anterior (el avance del curso) las capas 1 y 2 (hash PBKDF2 y rate limiting de login) estaban implementadas a mano en el navegador. Se migraron a Supabase Auth porque hacer eso del lado del cliente es, en sí mismo, una mala práctica de seguridad — el código sigue en `src/security.ts` (y probado en `src/security.test.ts`) como referencia y por si se necesita en el futuro.

---

## Tecnología usada

- **Frontend**: React 19 + TypeScript + Vite.
- **Backend**: Supabase (Postgres administrado + Auth + Row Level Security + Storage para fotos de perfil). Sin servidor propio que mantener.
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
- Tu propio proyecto de **Supabase**: crea uno gratis en [supabase.com](https://supabase.com), corre en orden todos los archivos `supabase/schema.sql` y `supabase/migration_*.sql` en su SQL Editor (crean las tablas, el bucket de fotos y las políticas RLS), y copia el *Project URL* y la *anon key* desde Project Settings → API.

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
- Registro y login vía Supabase Auth (sesión no persistente por diseño)
- Búsqueda unificada en TMDB / RAWG / iTunes (música incluye álbumes y canciones), con filtro de relevancia, deduplicación y filtro de contenido para adultos
- Ficha de detalle (info card) por ítem: sinopsis, reparto, grilla de episodios en series, DLCs en videojuegos, preview de audio en canciones, lista de canciones en álbumes
- Motor de ranking Elo propio (duelos, K-factor dinámico, tiers por percentil)
- Expediente y perfil persistidos en Postgres (Supabase), con RLS
- Edición de perfil: nombre para mostrar, foto (Supabase Storage), contraseña
- Comunidad: rankings de todos los usuarios + ver el expediente público de cualquiera
- Reseñas escritas opcionales, visibles para todos en la ficha de cada ítem (límite de 1000 caracteres también en la base de datos; la fecha la pone el servidor)
- Panel de administrador con control de acceso por rol (RBAC) y bitácora de auditoría completa
- Rediseño visual con tema claro/oscuro, logo y favicon propios
- Suite de tests (Vitest) sobre la lógica de negocio propia
- CI/CD con SAST (ESLint security, CodeQL, npm audit) + deploy automático a Vercel

**Fuera de alcance para esta entrega (roadmap):**
- Recomendaciones basadas en lo que el usuario ha rankeado
- Comparación de afinidad de gustos entre usuarios (ya se pueden ver los rankings de todos; falta el cálculo de "qué tan parecidos son tus gustos a los de otro usuario")
