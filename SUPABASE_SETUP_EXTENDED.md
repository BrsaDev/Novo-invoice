# SUPABASE_SETUP - Extended Notes

Este arquivo complementa `SUPABASE_SETUP.md` com seções adicionais extraídas e recomendações operacionais.

---

## 5) Extensões instaladas (detalhado)
- **pgcrypto** — funções de criptografia/utilitários (usado para gen_random_uuid, hashing, etc.)
- **uuid-ossp** — geração de UUIDs (quando aplicável)
- **pg_stat_statements** — monitoramento de consultas
- **supabase_vault** — integração de secrets/segurança

---

## 6) Sequences (detectadas)
- `auth.refresh_tokens_id_seq` (schema `auth`)
- `graphql.seq_schema_version` (schema `graphql`)

---

## 7) Índices, Constraints e Checks (resumo)
- `subscriptions_pkey` — UNIQUE INDEX on `public.subscriptions(user_id)`
- múltiplas UNIQUE/PKs no schema `auth` (identities, oauth_clients, refresh_tokens, etc.)
- Check constraints em várias tabelas `auth` para limites de tamanho e consistência (ex.: `oauth_authorizations_redirect_uri_length`).

---

## 8) Triggers e Functions (completo que temos)
### Triggers importantes (resumo)
- `auth.users`:
  - `on_auth_user_created` → `handle_new_user()` (cria profile)
  - `on_auth_user_created_subscription` → `handle_new_user_subscription()` (cria row em `subscriptions` com trial 30 dias)
- `realtime.subscription`:
  - `tr_check_filters` → validação de filtros
- `storage.*` triggers — manutenção de prefixos, updated_at e deleção em cascata (padrão Supabase Storage)

### Funções extraídas (definições)
- `public.handle_new_user()` — insere registro em `public.profiles` com dados do novo usuário.
- `public.handle_new_user_subscription()` — insere row em `public.subscriptions` com `trialing` por 30 dias; `ON CONFLICT DO NOTHING` (não sobrescreve).

> Se desejar, eu posso extrair o `pg_get_functiondef` completo para outras funções específicas mediante sua autorização (execute as queries que mencionei ou me permita rodar read-only via service role).

---

## 9) Policies (RLS) - resumo e notas
- `public.subscriptions` — **SELECT** permitido apenas para o dono (`auth.uid() = user_id`). Não há policies de escrita públicas (UPDATE/INSERT/DELETE) — alterações devem ocorrer por backend com service role ou por RPCs com SECURITY DEFINER.
- `public.profiles`, `public.clients`, `public.invoices` — possuem policies que restringem leitura/atualização ao próprio usuário.

**Recomendação:** adicionar RPCs/Edge Functions documentadas para operações de escrita em `subscriptions` (assinatura, cancelamento, troca de preço), mantendo RLS para leitura. Evitar expor credenciais ou service role ao frontend.

---

## 10) Edge Functions — inventário e observações
### Funções detectadas
- **stripe-webhook** (ACTIVE)
  - Variáveis usadas: `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - Comportamento: valida assinatura do Stripe e processa eventos de pagamento e assinatura. *Atualização aplicada:* agora trata `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated` e `customer.subscription.deleted`. Grava dados em tabelas de faturamento (`billing_invoices`, `billing_payments`) e atualiza `public.subscriptions` com `status`, `stripe_subscription_id`, `stripe_customer_id`, `price_id` e `current_period_end`.
- **create-checkout-session** (ACTIVE)
  - Variáveis usadas: `STRIPE_SECRET_KEY`.
  - Comportamento: cria sessão de Checkout no Stripe. *Atualização aplicada:* migrado de SDK para chamada REST (fetch) para evitar erro Deno `runMicrotasks`.

### Sugestões operacionais para Edge Functions
- Criar **create-portal-session** para Customer Portal (atualização de cartão e cancelamento autoatendimento). (Implementada: `supabase/functions/create-portal-session/index.ts`)
- Ampliar `stripe-webhook` para: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, e uso do recurso `stripe.subscriptions.retrieve` para dados oficiais (`current_period_end`, `status`, etc.).
- Implementar logs estruturados e monitoramento/alertas (logs de erro, taxa de falha de webhook).

---

## 11) Webhooks Stripe — estado e verificação
- Confirme em **Stripe Dashboard → Developers → Webhooks** que existe endpoint para a função `stripe-webhook` com os eventos necessários (mínimo: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`).
- Verifique que o `STRIPE_WEBHOOK_SECRET` da function corresponde ao segredo do endpoint configurado no Stripe.

---

## 12) Observações de segurança e arquitetura
- **Service Role Key**: usada pelas funções para ignorar RLS ao atualizar `subscriptions` — mantê-la somente em env vars do server (Edge Functions) e no Vault.
- **Auditoria:** registrar `invoices`/`payments` no DB via webhook para histórico e reconciliamento financeiro.
- **1:1 user → subscription**: hoje `subscriptions` usa `user_id` como PK (um por usuário). Se for necessário suportar múltiplas assinaturas por usuário (produtos diferentes), considerar migrar para `id` autogerado e adicionar `user_id` como FK.

---

## 13) Testes e validação (passos recomendados)
1. Teste `create-checkout-session` (Dashboard → Functions → Test ou curl) e confirme retorno de `url` para checkout.
2. Complete um pagamento no modo teste do Stripe e dispare os webhooks correspondentes via Dashboard (ou simule envios) e confirme updates em `public.subscriptions` e inserções em `billing_invoices`/`billing_payments`.
3. Verifique logs nas funções (`Dashboard → Functions → Logs`) para garantir ausência de erros (ex.: o erro `Deno.core.runMicrotasks()` foi resolvido).

**Tabelas `das_payments` e `expenses`**
- `das_payments` — usada para marcar pagamentos mensais do DAS; o frontend usa `upsert` com `user_id,year,month` como chave de conflito.
- `expenses` — usada para registrar despesas; o frontend insere e exclui despesas por `id`.

**Migração sugerida:** rodar `supabase/migrations/2026-01-05-add-das-and-expenses.sql` para criar essas tabelas (inclui RLS + policies e índices).

**Migração de schema:** rodar o arquivo `supabase/migrations/2026-01-05-add-billing-tables.sql` no SQL Editor do Supabase para criar `billing_invoices` e `billing_payments` (ou enviar via sua rotina de migrations).

**Testes de webhook local/semideploy:** use o script `supabase/functions/tests/send_webhook_test.js` para enviar payloads de exemplo. Exemplo:

```bash
node supabase/functions/tests/send_webhook_test.js https://<PROJECT_REF>.functions.supabase.co/stripe-webhook supabase/functions/tests/payloads/invoice.payment_succeeded.json "<STRIPE_WEBHOOK_SECRET>"
```

Substitua `STRIPE_WEBHOOK_SECRET` pela chave encontrada no painel do Stripe para o endpoint de webhook.

> Dica: primeiro aplicar a migration (criação das tabelas), depois executar os testes e conferir as inserções em `billing_invoices` / `billing_payments` e atualizações em `public.subscriptions`.

---

## 14) Arquivos e locais no repositório (referência)
- `supabase/functions/create-checkout-session/index.ts` — função de Checkout (atualizada)
- `supabase/functions/stripe-webhook/index.ts` — função que processa webhooks
- `lib/supabase.ts` — cliente Supabase para o frontend (usa VITE_ env vars)
- `.env.local` — variáveis locais (NÃO COMITAR)
- `SUPABASE_SETUP.md` — **documento principal**

---

## 15) Próximos passos que posso executar (autorização necessária)
- (A) Implemento `create-portal-session` (Edge Function) e testo.
- (B) Atualizo `stripe-webhook` para tratar eventos extras e gravar histórico em `invoices/payments`.
- (C) Faço PR com ambos e adiciono testes de integração (checkout + webhook).
- (D) Executo auditoria completa (logs + testes) em ambiente de staging.

Diga qual ação autoriza (A / B / C / D) ou peça alterações/documentação adicional — eu implemento conforme autorizado.
