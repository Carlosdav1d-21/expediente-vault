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
    persistSession: true,
    autoRefreshToken: true,
  },
});
