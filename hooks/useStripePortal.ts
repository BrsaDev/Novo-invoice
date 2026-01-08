import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface StripePortalOptions {
  cancel_at_period_end?: boolean;
  return_url?: string;
  flow?: 'manage_payment_methods' | 'update_subscription' | 'cancel_subscription';
}

export const useStripePortal = (userId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelSubscription = useCallback(async (options: StripePortalOptions = {}) => {
    if (!userId) {
      setError('Usuário não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Criar sessão do portal com opções de cancelamento
      const { data, error } = await supabase.functions.invoke('create-portal-session-enhanced', {
        body: {
          userId,
          returnUrl: options.return_url || window.location.origin,
          cancel_at_period_end: options.cancel_at_period_end || false, // Default false para cancelamento imediato
          flow: options.flow || 'cancel_subscription'
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar sessão do portal');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível criar sessão do portal');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePaymentMethod = useCallback(async () => {
    if (!userId) {
      setError('Usuário não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Criar sessão do portal para atualizar método de pagamento
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          userId,
          returnUrl: window.location.origin,
          // Redirecionar diretamente para a seção de pagamento
          flow: 'manage_payment_methods'
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao acessar configurações de pagamento');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível acessar configurações de pagamento');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const changePlan = useCallback(async (newPriceId: string) => {
    if (!userId) {
      setError('Usuário não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Criar checkout para troca de plano
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: newPriceId,
          userId,
          userEmail: '', // Será preenchido no backend
          returnUrl: window.location.origin
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar sessão de checkout');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível criar sessão de checkout');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getInvoices = useCallback(async () => {
    if (!userId) {
      setError('Usuário não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar faturas recentes
      const { data, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw new Error('Erro ao buscar faturas');
      }

      return data || [];
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    cancelSubscription,
    updatePaymentMethod,
    changePlan,
    getInvoices
  };
};
