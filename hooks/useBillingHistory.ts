import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface BillingInvoice {
  id: string;
  stripe_invoice_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
  stripe_subscription_id?: string;
}

export interface BillingPayment {
  id: string;
  stripe_payment_intent_id: string;
  user_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
}

export const useBillingHistory = (userId?: string) => {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setInvoices([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    const loadBillingHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar faturas
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('billing_invoices')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Carregar pagamentos
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('billing_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (invoicesError) {
          console.error('Erro ao carregar faturas:', invoicesError);
          setError('Erro ao carregar faturas');
        }

        if (paymentsError) {
          console.error('Erro ao carregar pagamentos:', paymentsError);
          setError('Erro ao carregar pagamentos');
        }

        setInvoices(invoicesData || []);
        setPayments(paymentsData || []);
      } catch (error) {
        console.error('Erro ao carregar histórico de faturamento:', error);
        setError('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    };

    loadBillingHistory();

    // Configurar Realtime para atualizações
    const invoicesSubscription = supabase
      .channel('billing_invoices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_invoices',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Invoice change:', payload);
          if (payload.eventType === 'INSERT') {
            setInvoices(prev => [payload.new as BillingInvoice, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInvoices(prev => 
              prev.map(inv => inv.id === payload.new.id ? payload.new as BillingInvoice : inv)
            );
          } else if (payload.eventType === 'DELETE') {
            setInvoices(prev => prev.filter(inv => inv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const paymentsSubscription = supabase
      .channel('billing_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_payments',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Payment change:', payload);
          if (payload.eventType === 'INSERT') {
            setPayments(prev => [payload.new as BillingPayment, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPayments(prev => 
              prev.map(pay => pay.id === payload.new.id ? payload.new as BillingPayment : pay)
            );
          } else if (payload.eventType === 'DELETE') {
            setPayments(prev => prev.filter(pay => pay.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      invoicesSubscription.unsubscribe();
      paymentsSubscription.unsubscribe();
    };
  }, [userId]);

  return {
    invoices,
    payments,
    loading,
    error,
    refetch: () => {
      if (userId) {
        // Trigger manual refetch
        const loadBillingHistory = async () => {
          try {
            setLoading(true);
            
            const { data: invoicesData } = await supabase
              .from('billing_invoices')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            const { data: paymentsData } = await supabase
              .from('billing_payments')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            setInvoices(invoicesData || []);
            setPayments(paymentsData || []);
          } catch (error) {
            console.error('Erro ao recarregar histórico:', error);
          } finally {
            setLoading(false);
          }
        };
        
        loadBillingHistory();
      }
    }
  };
};
