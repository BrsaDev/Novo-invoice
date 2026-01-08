import React, { useState } from 'react';
import { useSubscription, STRIPE_PRICES } from '../hooks/useSubscription';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { useStripePortal } from '../hooks/useStripePortal';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { supabase } from '../lib/supabase';

interface Props {
  userId?: string;
  userEmail?: string | null;
  onBack: () => void;
}

export const SubscriptionsPageIntegrated: React.FC<Props> = ({ userId, userEmail, onBack }) => {
  const { subscription, isTrialActive, isPremium, mustPay, spotsLeft, daysRemaining, loading } = useSubscription(userId);
  const { invoices, payments, loading: billingLoading } = useBillingHistory(userId);
  const { 
    loading: portalLoading, 
    error: portalError, 
    cancelSubscription, 
    updatePaymentMethod, 
    changePlan 
  } = useStripePortal(userId);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);

  const handleSubscribe = async () => {
    if (!userId) return;
    try {
      const priceId = spotsLeft > 0 ? (STRIPE_PRICES.FOUNDER) : (STRIPE_PRICES.REGULAR);
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
  };

  const handleCancelSubscription = async () => {
    if (!userId) return;
    
    setShowCancelConfirm(true);
  };

  const confirmCancelSubscription = async () => {
    setShowCancelConfirm(false);
    await cancelSubscription({ cancel_at_period_end: false });
  };

  const handleUpdatePayment = async () => {
    await updatePaymentMethod();
  };

  const handleChangePlan = async () => {
    setShowChangePlan(true);
  };

  const selectNewPlan = async (priceId: string) => {
    setShowChangePlan(false);
    await changePlan(priceId);
  };

  return (
    <div className="p-6 md:p-16 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="flex items-center justify-between mb-8">
        <div>
          <button onClick={onBack} className="text-blue-500 text-[12px] font-black uppercase tracking-widest mb-2">← Voltar</button>
          <h1 className="text-4xl font-black tracking-tighter">Gerenciamento de Assinatura</h1>
          <p className="text-slate-500 text-[12px] mt-1">Gerencie seu plano, pagamentos e configurações.</p>
        </div>
        <div>
          <SubscriptionStatusBadge status={(subscription?.status as any) ?? 'none'} />
        </div>
      </header>

      {/* Alerta de Cancelamento */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 border border-red-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cancelar Assinatura</h3>
              <p className="text-gray-600 mb-6">Tem certeza que deseja cancelar sua assinatura? Você perderá acesso a todos os recursos premium.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                >
                  Manter Assinatura
                </button>
                <button
                  onClick={confirmCancelSubscription}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Sim, Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Troca de Plano */}
      {showChangePlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 border border-blue-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 4h.01M9 16l4-4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Alterar Plano</h3>
              <p className="text-gray-600 mb-6">Selecione o novo plano que deseja assinar:</p>
              <div className="space-y-3">
                <button
                  onClick={() => selectNewPlan(STRIPE_PRICES.FOUNDER)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700"
                >
                  <div className="flex items-center justify-center">
                    <span>Plano Founder</span>
                    <span className="ml-2 text-sm opacity-75">R$ 97/mês • Vagas limitadas</span>
                  </div>
                </button>
                <button
                  onClick={() => selectNewPlan(STRIPE_PRICES.REGULAR)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700"
                >
                  <div className="flex items-center justify-center">
                    <span>Plano Regular</span>
                    <span className="ml-2 text-sm opacity-75">R$ 47/mês • Acesso total</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white/5 p-8 rounded-[2rem] border border-white/10 space-y-6">
        {/* Status Atual */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black uppercase">Plano Atual</h3>
            <p className="text-slate-400 text-sm mt-1">
              {subscription?.status === 'active' ? `Plano ${subscription.is_founder ? 'Founder' : 'Regular'}` : 'Sem plano ativo'}
            </p>
            {subscription?.trial_ends_at && (
              <p className="text-sm text-slate-400 mt-1">
                Dias restantes de teste: {daysRemaining}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {/* Botões de Ação Rápida */}
            <button
              onClick={handleUpdatePayment}
              disabled={portalLoading}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[13px] font-black uppercase hover:bg-white/10 disabled:opacity-50"
            >
              {portalLoading ? 'Atualizando...' : '💳 Atualizar Cartão'}
            </button>
            
            <button
              onClick={handleChangePlan}
              disabled={portalLoading}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[13px] font-black uppercase hover:bg-white/10 disabled:opacity-50"
            >
              {portalLoading ? 'Processando...' : '🔄 Trocar Plano'}
            </button>
            
            <button
              onClick={handleCancelSubscription}
              disabled={portalLoading}
              className="px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-xl text-[13px] font-black uppercase hover:bg-red-700/20 disabled:opacity-50"
            >
              {portalLoading ? 'Processando...' : '❌ Cancelar Assinatura'}
            </button>
          </div>
        </div>

        {/* Benefícios */}
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Benefícios do Plano Atual</h4>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-sm list-disc list-inside">
            <li>✅ Templates de alto padrão</li>
            <li>✅ Suporte prioritário</li>
            <li>✅ Integração com Portal de Pagamentos</li>
            <li>✅ Recibos e Notas sem limite</li>
            {subscription?.is_founder && <li>👑 Acesso exclusivo Founder</li>}
          </ul>
        </div>
      </section>

      {/* Histórico de Faturamento */}
      <section className="mt-8">
        <h3 className="text-lg font-black mb-4 uppercase">Histórico de Faturamento</h3>
        
        {billingLoading ? (
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
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Resumo Financeiro</h4>
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

            {/* Lista de Faturas */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Faturas Recentes</h4>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h12a2 2 0 00-2 2v6a2 2 0 002 2H4a2 2 0 00-2 2v6a2 2 0 002 2zm2-4h.01M9 16h.01" />
                  </svg>
                  <p className="text-slate-400">Nenhuma fatura encontrada.</p>
                  <p className="text-xs text-slate-500 mt-1">As faturas aparecerão aqui após os pagamentos.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {invoices.slice(0, 5).map((invoice) => (
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
                  {invoices.length > 5 && (
                    <button className="w-full mt-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[13px] font-black uppercase hover:bg-white/10">
                      Ver todas as faturas
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
