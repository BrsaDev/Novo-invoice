-- Migration: Add billing tables for Stripe webhooks
-- Run this SQL in Supabase (SQL Editor) or via migration tool

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  stripe_invoice_id text UNIQUE,
  amount_paid numeric,
  currency text,
  status text,
  full_data jsonb,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  stripe_payment_intent text UNIQUE,
  stripe_charge_id text,
  amount numeric,
  currency text,
  status text,
  invoice_id text,
  full_data jsonb,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Indexes to accelerate lookups by stripe ids
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe_invoice_id ON public.billing_invoices (stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_payment_intent ON public.billing_payments (stripe_payment_intent);
