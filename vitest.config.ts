import { defineConfig } from "vitest/config";

// Config separada de vite.config.ts a propósito: los tests son de lógica
// pura (Node), no necesitan el plugin de React ni las cabeceras de seguridad
// que sí aplican al servidor de dev/build.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
