-- Migration: Add das_payments and expenses tables with RLS and policies

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- das_payments: registro mensal de DAS (Simples Nacional)
CREATE TABLE IF NOT EXISTS public.das_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (user_id, year, month)
);

-- expenses: registro de despesas do prestador
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  date date,
  status text DEFAULT 'paid',
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Enable RLS and create policies to restrict access to the owner
ALTER TABLE public.das_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar seus DAS" ON public.das_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar suas despesas" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes to speed lookups
CREATE INDEX IF NOT EXISTS idx_das_payments_user_year_month ON public.das_payments (user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses (user_id);