
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eordhhaqorwvxhfqnrtn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcmRoaGFxb3J3dnhoZnFucnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDcxMzcsImV4cCI6MjA4MjAyMzEzN30.LvpMiaDkgGWAYy_psDHTFkW9jCHF7EDFRnmrlfPcIpk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
