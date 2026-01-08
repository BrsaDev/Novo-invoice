import React from 'react';
import { useSubscription, STRIPE_PRICES } from '../hooks/useSubscription';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { supabase } from '../lib/supabase';

interface Props {
  userId?: string;
  userEmail?: string | null;
  onBack: () => void;
}

export const SubscriptionsPage: React.FC<Props> = ({ userId, userEmail, onBack }) => {
  const { subscription, isTrialActive, isPremium, mustPay, spotsLeft, daysRemaining, loading } = useSubscription(userId);
  const { invoices, payments, loading: billingLoading, error: billingError } = useBillingHistory(userId);

  console.log('🎯 SubscriptionsPage - Estado completo:', {
    userId,
    subscription,
    isTrialActive,
    isPremium,
    mustPay,
    spotsLeft,
    daysRemaining,
    loading,
    invoices: invoices.length,
    payments: payments.length,
    stripe_customer_id: subscription?.stripe_customer_id,
    subscription_status: subscription?.status,
    price_id: subscription?.price_id
  });

  const handleSubscribe = async () => {
    if (!userId) return;
    try {
      const priceId = spotsLeft > 0 ? (STRIPE_PRICES.FOUNDER) : (STRIPE_PRICES.REGULAR);
      // Call the existing Edge Function via Supabase SDK (client-side)
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, userId, userEmail, returnUrl: window.location.origin }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error('Servidor não retornou url de checkout');
    } catch (err: any) {
      console.error('Erro ao iniciar checkout', err);
      alert(err.message || String(err));
    }
  }

  const handleOpenPortal = async () => {
    if (!userId) return;
    
    try {
      console.log('🚀 Abrindo portal de assinatura para usuário:', userId);
      
      // Tenta chamar a função primeiro
      const { data, error } = await supabase.functions.invoke('create-portal-session', { 
        body: { userId, returnUrl: window.location.origin } 
      });
      
      if (error) {
        console.error('❌ Erro na chamada da função:', error);
        
        // Se der erro de backend, redireciona para o portal direto do Stripe
        if (error.message?.includes('stripe_customer_id não encontrado') || 
            error.message?.includes('Cliente Stripe não encontrado') ||
            error.message?.includes('Nenhuma assinatura encontrada')) {
          
          console.log('🔄 Redirecionando para portal direto do Stripe...');
          
          // Redirecionamento direto para o portal do Stripe (solução temporária)
          const stripePortalUrl = 'https://billing.stripe.com/login';
          window.open(stripePortalUrl, '_blank');
          
          alert('⚠️ Redirecionando para o portal do Stripe.\n\n' +
                'Se não conseguir acessar, entre em contato com o suporte.');
          return;
        }
        
        throw new Error(error.message || 'Erro ao comunicar com servidor');
      }
      
      if (!data?.url) {
        console.error('❌ Sem URL retornada:', data);
        throw new Error('Servidor não retornou URL do portal');
      }
      
      console.log('✅ Portal URL recebida:', data.url);
      window.location.href = data.url;
    } catch (err: any) {
      console.error('❌ Erro ao abrir portal:', err);
      
      // Se falhar completamente, redireciona para portal direto
      console.log('🔄 Redirecionando para portal direto do Stripe...');
      const stripePortalUrl = 'https://billing.stripe.com/login';
      window.open(stripePortalUrl, '_blank');
      
      alert('⚠️ Redirecionando para o portal do Stripe.\n\n' +
            'Se não conseguir acessar, entre em contato com o suporte.');
    }
  }

  return (
    <div className="p-6 md:p-16 max-w-4xl mx-auto animate-in fade-in duration-500">
      <header className="flex items-center justify-between mb-8">
        <div>
          <button onClick={onBack} className="text-blue-500 text-[12px] font-black uppercase tracking-widest mb-2">← Voltar</button>
          <h1 className="text-4xl font-black tracking-tighter">Assinaturas</h1>
          <p className="text-slate-500 text-[12px] mt-1">Gerencie sua assinatura, pagamentos e histórico.</p>
        </div>
        <div>
          <SubscriptionStatusBadge status={(subscription?.status as any) ?? 'none'} />
        </div>
      </header>

      <section className="bg-white/5 p-8 rounded-[2rem] border border-white/10 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black uppercase">Plano Atual</h3>
            <p className="text-slate-400 text-sm mt-1">{subscription?.price_id ? `Preço: ${subscription.price_id}` : 'Sem plano ativo'}</p>
            {subscription?.trial_ends_at && <p className="text-sm text-slate-400 mt-1">Dias restantes de teste: {daysRemaining}</p>}
          </div>
          <div className="flex gap-3">
            {(isPremium || subscription?.status === 'active') ? (
              <button onClick={handleOpenPortal} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[13px] font-black uppercase hover:bg-white/10">Gerenciar Assinatura</button>
            ) : (
              <button onClick={handleSubscribe} className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl uppercase hover:bg-blue-500">Assinar Agora</button>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-sm font-black uppercase text-slate-400">Benefícios</h4>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-sm list-disc list-inside">
            <li>Templates de alto padrão</li>
            <li>Suporte prioritário</li>
            <li>Integração com o Portal de Pagamentos</li>
            <li>Recibos e Notas sem limite</li>
          </ul>
        </div>

      </section>

      <section className="mt-8">
        <h3 className="text-lg font-black mb-4 uppercase">Histórico de Faturamento</h3>
        
        {billingError ? (
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Erro ao carregar histórico</p>
                <p className="text-sm text-slate-400">{billingError}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        ) : billingLoading ? (
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400">Carregando histórico...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Resumo</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{invoices.length}</p>
                  <p className="text-xs text-slate-400">Faturas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{payments.length}</p>
                  <p className="text-xs text-slate-400">Pagamentos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    R$ {payments.reduce((sum, p) => sum + (p.amount / 100), 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">Total Pago</p>
                </div>
              </div>
            </div>

            {/* Faturas */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Faturas</h4>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H4a2 2 0 00-2 2v6a2 2 0 002 2zm2-4h.01M9 16h.01" />
                  </svg>
                  <p className="text-slate-400">Nenhuma fatura encontrada.</p>
                  <p className="text-xs text-slate-500 mt-1">As faturas aparecerão aqui após os pagamentos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            Fatura #{invoice.stripe_invoice_id.slice(-8)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                            invoice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {invoice.status === 'paid' ? 'Paga' :
                             invoice.status === 'pending' ? 'Pendente' : 'Falha'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          R$ {(invoice.amount / 100).toFixed(2)}
                        </p>
                        {invoice.paid_at && (
                          <p className="text-xs text-slate-400">
                            Pago em: {new Date(invoice.paid_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagamentos */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Pagamentos</h4>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-slate-400">Nenhum pagamento encontrado.</p>
                  <p className="text-xs text-slate-500 mt-1">Os pagamentos aparecerão aqui após serem processados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            Pagamento #{payment.stripe_payment_intent_id.slice(-8)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            payment.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                            payment.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {payment.status === 'succeeded' ? 'Sucesso' :
                             payment.status === 'processing' ? 'Processando' : 'Falha'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Método: {payment.payment_method || 'Cartão de crédito'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          R$ {(payment.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
