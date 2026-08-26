import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import globals from "globals";

// Configuración de ESLint como herramienta SAST (Static Application Security
// Testing) del pipeline DevSecOps. `eslint-plugin-security` detecta patrones
// de riesgo (uso de eval, regex vulnerables a ReDoS, child_process, etc.)
// directamente en el código fuente, antes de que llegue a producción.
export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, security.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      "security/detect-object-injection": "warn",
    },
  }
);
