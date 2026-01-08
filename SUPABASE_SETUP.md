
# Estrutura de Backend - NovaInvoice (Supabase)

Este documento descreve a configuração necessária no Supabase para suportar todas as funcionalidades premium, financeiras e de assinatura do sistema.

## 1. Tabelas do Banco de Dados (SQL)

### `profiles`
Armazena os dados do prestador (usuário) e configurações de branding.
```sql
create table profiles (
  user_id uuid references auth.users not null primary key,
  name text,
  tax_id text,
  im text,
  ie text,
  zip_code text,
  neighborhood text,
  street text,
  number text,
  city text,
  uf text,
  email text,
  phone text,
  pix_key text,
  primary_color text default '#006494',
  secondary_color text default '#00A6FB',
  logo_letter text default 'N',
  logo_base64 text,
  template text default 'classic',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

### `clients`
Gerenciamento de clientes (CRM).
```sql
create table clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  tax_id text,
  im text,
  ie text,
  zip_code text,
  neighborhood text,
  street text,
  number text,
  city text,
  uf text,
  email text,
  phone text,
  whatsapp text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, tax_id)
);
```

### `subscriptions`
Controle de acesso premium e integração Stripe.
```sql
create table subscriptions (
  user_id uuid references auth.users not null primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'none')),
  price_id text,
  trial_ends_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

### `invoices` & `contracts`
Histórico de documentos gerados.
*Ambas possuem estrutura similar com `user_id`, `client_name`, `total_value` e um campo `full_data` (JSONB) para preservar o estado do documento no momento da emissão.*

---

### `das_payments`
Registro mensal de pagamentos do DAS (Simples Nacional) por usuário.
```sql
create table das_payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  year integer not null,
  month integer not null,
  is_paid boolean default false,
  created_at timestamptz default timezone('utc'::text, now()),
  unique(user_id, year, month)
);
```
- Observações: o frontend faz `upsert` com `onConflict: 'user_id,year,month'` para alternar `is_paid` — por isso o índice/constraint único é necessário.
- Segurança: recomendamos ativar RLS e criar policy que permita apenas ao dono (auth.uid()) ler/alterar seus pagamentos.

---

### `expenses`
Registro de despesas do prestador (usado no Hub Financeiro).
```sql
create table expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  category text,
  date date,
  status text default 'paid',
  created_at timestamptz default timezone('utc'::text, now())
);
```
- Observações: o frontend insere e remove despesas via `supabase.from('expenses').insert(...)` / `delete().eq('id', id)`.
- Segurança: recomendamos ativar RLS e criar policy que permita apenas ao dono (auth.uid()) ler/alterar/excluir suas despesas.

---

## 2. Edge Functions (Deno Runtime)

### `create-checkout-session`
Inicia o processo de pagamento.
- **Entrada:** `priceId`, `userId`, `userEmail`.
- **Saída:** URL de checkout do Stripe.

### `create-portal-session`
Gera o link para o Portal do Cliente Stripe (Gestão de Assinatura).
- **Entrada:** `userId`.
- **Lógica:** Busca o `stripe_customer_id` na tabela `subscriptions` e solicita ao Stripe um link de portal seguro.

---

## ✨ Recent changes (2026-01-05) — correção crítica
- **O que foi corrigido:** a função `create-checkout-session` foi **reimplementada** para usar chamadas HTTP diretas ao endpoint da Stripe (`fetch`) em vez do SDK importado que causava erro no runtime Deno (ex.: `Deno.core.runMicrotasks() is not supported`).
- **Por que:** o SDK traz polyfills que não são compatíveis com o ambiente de Edge Functions do Supabase, provocando crashes na inicialização.
- **Arquivos afetados:**
  - `supabase/functions/create-checkout-session/index.ts` (substituído: uso de SDK -> fetch REST)
  - `supabase/functions/stripe-webhook/index.ts` (atualizada: trata eventos adicionais e grava `billing_invoices`/`billing_payments`)
  - `supabase/migrations/2026-01-05-add-billing-tables.sql` (nova migration para tabelas de faturamento)
- **Status:** Deploy da função `create-checkout-session` realizado ✅; `stripe-webhook` atualizado no repositório (pronto para deploy/migration em staging).

### Como testar (manualmente)
- Pelo Dashboard -> Functions -> `create-checkout-session` → painel de **Test**: envie um JSON com `priceId`, `userId`, `userEmail`, `returnUrl`.
- Ou via curl (exemplo):

```bash
curl -X POST https://<PROJECT_REF>.functions.supabase.co/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_XXX","userId":"<USER_UUID>","userEmail":"teste@example.com","returnUrl":"https://example.com/assinatura"}'
```

> Observação: a função exige que a variável de ambiente `STRIPE_SECRET_KEY` esteja configurada nas Edge Functions (Dashboard).

### Próximos passos recomendados
1. **Testes de integração:** executar o fluxo de Checkout e verificar se o webhook registra/atualiza `public.subscriptions` corretamente.
2. **Melhorar `stripe-webhook`:** adicionar tratamento para eventos: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` (atualmente trata `checkout.session.completed`).
3. **Implementar `create-portal-session`:** caso queira autosserviço do cliente para trocar cartão e cancelar (se ainda não existir). *Atual:* `create-portal-session` implementada como Edge Function (`supabase/functions/create-portal-session/index.ts`).
4. **Observabilidade:** adicionar logs mais verbosos e monitoramento para webhook e functions.

---

(Documento atualizado automaticamente com as notas de deploy.)

---

## 3. Storage (Buckets)

- **Bucket: `invoices`**
  - Pasta: `{user_id}/*` (Notas e recibos)
  - Pasta: `{user_id}/contracts/*` (Contratos)
  - **Políticas:** Apenas o proprietário (`auth.uid()`) pode ler/gravar na sua pasta.

---

## 4. Segurança (RLS)

Todas as tabelas possuem **Row Level Security** ativado:
```sql
alter table public.profiles enable row level security;
create policy "Usuários podem ver o próprio perfil" on profiles for select using (auth.uid() = user_id);
create policy "Usuários podem atualizar o próprio perfil" on profiles for update using (auth.uid() = user_id);
```
*(Repetir padrão para todas as tabelas garantindo isolamento total de dados entre usuários).*
