
import React from 'react';
import { formatCurrency } from '../utils/formatters';

interface SubscriptionGateProps {
  isOpen: boolean;
  onSubscribe: () => void;
  spotsLeft: number;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ isOpen, onSubscribe, spotsLeft }) => {
  if (!isOpen) return null;

  const isFounderAvailable = spotsLeft > 0;
  const price = isFounderAvailable ? 16.90 : 19.90;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="bg-[#0f172a] w-full max-w-xl rounded-[4rem] border border-white/10 p-12 space-y-10 shadow-[0_0_100px_rgba(59,130,246,0.2)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        
        <header className="space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-4xl font-black shadow-xl shadow-blue-600/30">N</div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Teste Expirado</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Obrigado por usar o NovaInvoice</p>
        </header>

        <div className="space-y-6">
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            Seu período de teste de 30 dias chegou ao fim. Assine agora para continuar emitindo documentos com o padrão de grife que seu negócio merece.
          </p>

          <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 relative group">
            {isFounderAvailable && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                Vaga Fundador: Restam {spotsLeft}
              </div>
            )}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Assinatura Mensal</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-white tracking-tighter">{formatCurrency(price)}</span>
                <span className="text-sm font-bold text-slate-500">/mês</span>
              </div>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-2 italic">
                {isFounderAvailable ? 'Preço vitalício para os primeiros 200 membros' : 'Preço Padrão Ativo'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={onSubscribe}
            className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
          >
            Ativar Assinatura Premium
          </button>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Cancele a qualquer momento • Pagamento Seguro via Stripe</p>
        </div>
      </div>
    </div>
  );
};
