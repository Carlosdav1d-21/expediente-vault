# Expediente Vault

**Avance de proyecto — Ciberseguridad, Ingeniería en Desarrollo de Software**

Expediente Vault es una aplicación web para llevar un ranking personal de las películas, series, videojuegos y canciones que has visto, jugado o escuchado — todo en un solo lugar, en vez de tener esa información repartida en varias apps distintas.

> **Este es un avance de proyecto, no la versión final.** Algunas partes ya funcionan (registro, búsqueda, ranking) y otras están planeadas para las próximas semanas (ver sección de estado más abajo).

---

## ¿De qué se trata?

Hoy en día usamos apps distintas para cada tipo de contenido: una para películas, otra para videojuegos, otra para música, y cada una califica diferente (estrellas, números del 1 al 10, "me gusta"). Esto hace difícil tener una idea clara de qué tanto te gustó algo comparado con otra cosa.

Expediente Vault junta las 4 categorías en un solo lugar y, en vez de pedirte que le pongas una calificación de memoria, te muestra **dos cosas a la vez y te pregunta cuál prefieres**. A partir de esas comparaciones, la app calcula por sí sola un ranking ordenado — algo parecido a como se calculan los rankings de ajedrez.

---

## ¿Qué puede hacer ya la aplicación?

- **Crear una cuenta e iniciar sesión**, con la contraseña protegida (nunca se guarda en texto plano).
- **Buscar** películas y series, videojuegos, o canciones, conectándose a bases de datos reales (TMDB, RAWG e iTunes).
- **Agregar cosas a tu expediente personal.**
- **Comparar dos ítems a la vez** y dejar que la app calcule el ranking automáticamente.
- **Ver tu expediente ordenado**, con una insignia de rango (S, A, B, C, D) para cada ítem.
- **Ver un historial de actividad** (una especie de bitácora de todo lo que ha pasado en tu cuenta).

---

## ¿Cómo se ve por dentro?

La aplicación está pensada en capas, para que la seguridad no dependa de un solo punto:

1. Las contraseñas se guardan protegidas con un método de cifrado, nunca en texto plano.
2. Si alguien intenta adivinar una contraseña varias veces seguidas, la cuenta se bloquea temporalmente.
3. Todo lo que el usuario escribe se limpia antes de guardarse, para evitar que se cuele código malicioso.
4. La interfaz está construida de forma que no puede ejecutar código externo dentro de la página.
5. Los datos que se guardan en el navegador tienen un formato controlado, para poder detectar si algo se corrompe.
6. Existe un registro de auditoría que anota cuándo pasó cada acción importante.
7. El sitio envía ciertas reglas de seguridad al navegador para reducir el riesgo de ataques comunes.

---

## Tecnología usada (resumen)

- Está construida con **React** y **TypeScript**, herramientas comunes para aplicaciones web modernas.
- Se conecta a tres servicios externos para obtener información: **TMDB** (cine y series), **RAWG** (videojuegos) e **iTunes** (música).
- Por ahora, los datos del usuario se guardan localmente en su propio navegador — no hay todavía un servidor propio con base de datos (ver limitaciones).

---

## Cómo probarla

```bash
git clone https://github.com/Carlosdav1d-21/expediente-vault.git
cd expediente-vault
npm install
cp .env.example .env
```

Después de eso, hay que abrir el archivo `.env` y poner ahí las claves de acceso gratuitas de TMDB y RAWG (se consiguen registrándose en sus sitios web). La API de iTunes no necesita clave.

Para arrancar la aplicación en modo de prueba:

```bash
npm run dev
```

---

## Estado actual del avance

**Ya funciona:**
- Registro e inicio de sesión
- Búsqueda en las tres fuentes externas
- Sistema de comparación y ranking
- Registro de auditoría
- Medidas de seguridad básicas
- Un flujo automatizado en GitHub que revisa el código en busca de errores y riesgos de seguridad cada vez que se sube un cambio

**Pendiente para las próximas semanas:**
- Pruebas automatizadas más completas
- Publicar la aplicación en un sitio real (hosting)
- Evaluar si más adelante conviene tener un servidor propio en vez de guardar todo en el navegador

---

## Nota importante

<<<<<<< HEAD
Esta versión guarda la información directamente en el navegador del usuario, no en un servidor propio. Esto es suficiente para el alcance de este curso, pero **no sería la forma correcta de manejarlo en una aplicación real** que vaya a usar más gente — eso requeriría un servidor y una base de datos, algo que queda fuera del alcance de este avance.
=======
Esta versión guarda la información directamente en el navegador del usuario, no en un servidor propio. Esto es suficiente para el alcance de este curso, pero **no sería la forma correcta de manejarlo en una aplicación real** que vaya a usar más gente — eso requeriría un servidor y una base de datos, algo que queda fuera del alcance de este avance.
>>>>>>> 9ba4e68 (chore: actualizar dependencias de Vite y ajustes menores de README)
