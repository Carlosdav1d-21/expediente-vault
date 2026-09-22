// ============================================================================
// lib/supabase.ts — Cliente único de Supabase (auth + base de datos).
//
// La "anon key" se expone en el frontend a propósito: no es un secreto. La
// seguridad real la imponen las políticas RLS de la base de datos, que
// restringen cada fila a su dueño (auth.uid()).
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en el archivo .env"
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Por requisito del curso: la sesión NO sobrevive a un refresh de página.
    // Al recargar, siempre se vuelve a la pantalla de login. persistSession en
    // false evita que el token se guarde en localStorage; sigue viva en
    // memoria mientras la pestaña está abierta (autoRefreshToken), pero se
    // pierde al recargar o cerrar la pestaña.
    persistSession: false,
    autoRefreshToken: true,
  },
});
