-- SQL para diagnóstico e correção de problemas de assinatura
-- Execute este SQL no Editor SQL do Supabase Dashboard

-- 1. Verificar se a tabela subscriptions existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'subscriptions'
) AS subscriptions_table_exists;

-- 2. Verificar estrutura da tabela subscriptions
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar todos os dados da tabela subscriptions
SELECT * FROM public.subscriptions ORDER BY updated_at DESC;

-- 3.1. Verificar se há assinaturas ativas
SELECT 
    user_id,
    status,
    price_id,
    trial_ends_at,
    updated_at
FROM public.subscriptions 
WHERE status IN ('active', 'trialing')
ORDER BY updated_at DESC;

-- 3.2. Verificar assinaturas com price_id (indicativo de pagamento)
SELECT 
    user_id,
    status,
    price_id,
    updated_at,
    CASE 
        WHEN price_id IS NOT NULL THEN 'Possui pagamento'
        ELSE 'Apenas trial'
    END as payment_status
FROM public.subscriptions 
ORDER BY updated_at DESC;

-- 4. Verificar assinatura do usuário específico (substitua USER_ID pelo ID real)
-- SELECT * FROM public.subscriptions WHERE user_id = 'SEU_USER_ID_AQUI';

-- 5. Verificar se há triggers configurados
SELECT event_object_table, trigger_name, action_timing, action_condition, action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'subscriptions';

-- 6. Criar trigger para trial automático (se não existir)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at, updated_at)
  VALUES (
    NEW.id,
    'trialing',
    NOW() + INTERVAL '30 days',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para novos usuários (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Atualizar manualmente uma assinatura (para teste)
-- UPDATE public.subscriptions 
-- SET status = 'active', 
--     price_id = 'price_1Qh...', 
--     updated_at = NOW()
-- WHERE user_id = 'SEU_USER_ID_AQUI';

-- 9. Inserir assinatura manualmente (se não existir)
-- INSERT INTO public.subscriptions (user_id, status, trial_ends_at, price_id, updated_at)
-- VALUES (
--   'SEU_USER_ID_AQUI',
--   'active',
--   NOW() + INTERVAL '30 days',
--   'price_1Qh...',
--   NOW()
-- ) ON CONFLICT (user_id) DO UPDATE SET
--   status = EXCLUDED.status,
--   price_id = EXCLUDED.price_id,
--   updated_at = EXCLUDED.updated_at;

-- 10. Verificar se as tabelas de billing foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('billing_invoices', 'billing_payments')
ORDER BY table_name;

-- 11. Verificar se há registros de pagamento
SELECT 
    'billing_invoices' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_record
FROM public.billing_invoices
UNION ALL
SELECT 
    'billing_payments' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_record
FROM public.billing_payments;

-- 12. Verificar logs recentes (se disponível)
-- SELECT * FROM pg_stat_activity WHERE query LIKE '%subscriptions%' ORDER BY query_start DESC LIMIT 5;

-- 13. Adicionar colunas que faltam para integração Stripe (se não existirem)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- 14. Verificar estrutura final da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
