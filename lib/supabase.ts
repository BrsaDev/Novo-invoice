
import { createClient } from '@supabase/supabase-js';

// Carrega as variáveis do ambiente (prefixadas com VITE_ para o Vite)
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '');
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos. Configure-os em .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
