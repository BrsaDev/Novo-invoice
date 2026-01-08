-- SQL para atualizar manualmente a assinatura após pagamento bem-sucedido
-- Execute este SQL no Editor SQL do Supabase Dashboard
-- Substitua USER_ID pelo ID real do usuário e price_id pelo ID real do preço

-- Primeiro, verifique qual é o user_id atual
SELECT auth.uid() as current_user_id;

-- Depois atualize a assinatura (substitua os valores)
UPDATE public.subscriptions 
SET 
    status = 'active',
    price_id = 'price_1Qh...', -- Substitua pelo price_id real do Founder
    stripe_subscription_id = 'sub_test_123', -- Substitua pelo ID real da assinatura Stripe
    stripe_customer_id = 'cus_test_123', -- Substitua pelo ID real do cliente Stripe
    current_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
WHERE user_id = 'SEU_USER_ID_AQUI'; -- Substitua pelo ID real do usuário

-- Verificar se atualizou corretamente
SELECT * FROM public.subscriptions WHERE user_id = 'SEU_USER_ID_AQUI';
