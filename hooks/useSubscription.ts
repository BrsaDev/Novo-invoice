
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserSubscription, SubscriptionStatus } from '../types';

// IDs Reais do Stripe (Certifique-se de que estes batem com o seu Dashboard)
export const STRIPE_PRICES = {
  FOUNDER: 'price_1SlefhPJVxZJJHnyq6gLY6Ev',
  REGULAR: 'price_1SlegYPJVxZJJHnyS1Cfxql1'
};

export const useSubscription = (userId: string | undefined) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [founderCount, setFounderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. Contagem de Fundadores (opcional para exibição de escassez)
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('price_id', STRIPE_PRICES.FOUNDER);
      
      setFounderCount(count || 0);

      // 2. Busca a assinatura do usuário
      let { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!sub) {
        // Se não houver registro, assume Trial de 30 dias (o SQL Trigger deve ter criado um, 
        // mas tratamos aqui por segurança caso o Realtime atrase)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        setSubscription({
          status: 'trialing',
          trial_ends_at: trialEndDate.toISOString(),
        });
      } else {
        setSubscription({
          status: sub.status as SubscriptionStatus,
          trial_ends_at: sub.trial_ends_at,
          price_id: sub.price_id,
          is_founder: sub.price_id === STRIPE_PRICES.FOUNDER
        });
      }
    } catch (err) {
      console.error('Erro ao buscar assinatura:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscription();

    if (!userId) return;

    // CONFIGURAÇÃO REALTIME: Ouve mudanças na tabela de assinaturas para este usuário específico
    const channel = supabase
      .channel(`subscription_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Quando houver QUALQUER mudança (ex: Webhook atualizou o status), recarrega
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSubscription]);

  const isTrialActive = subscription?.status === 'trialing' && 
    new Date(subscription.trial_ends_at) > new Date();
  
  const isPremium = subscription?.status === 'active';
  
  // O usuário só é obrigado a pagar se não for Premium E o Trial tiver expirado
  const mustPay = !isPremium && !isTrialActive;

  const spotsLeft = Math.max(0, 200 - founderCount);

  const daysRemaining = subscription?.trial_ends_at 
    ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    subscription,
    isTrialActive,
    isPremium,
    mustPay,
    spotsLeft,
    daysRemaining,
    loading,
    refresh: fetchSubscription
  };
};
