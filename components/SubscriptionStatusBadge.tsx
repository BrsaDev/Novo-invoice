import React from 'react';
import { SubscriptionStatus } from '../types';

const statusColor = (s: SubscriptionStatus) => {
  switch (s) {
    case 'active': return 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
    case 'trialing': return 'bg-blue-600/10 border-blue-600 text-blue-400';
    case 'past_due': return 'bg-amber-500/10 border-amber-500 text-amber-400';
    case 'canceled': return 'bg-rose-500/10 border-rose-500 text-rose-400';
    case 'unpaid': return 'bg-rose-600/10 border-rose-600 text-rose-400';
    default: return 'bg-white/5 border-white/10 text-slate-400';
  }
}

export const SubscriptionStatusBadge: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border text-xs font-black uppercase tracking-widest ${statusColor(status)}`}>
      <span className="w-2 h-2 rounded-full" style={{ background: 'currentColor' }}></span>
      <span>{status === 'trialing' ? 'Período de Teste' : status === 'active' ? 'Ativo' : status === 'past_due' ? 'Atrasado' : status === 'canceled' ? 'Cancelado' : status}</span>
    </div>
  )
}
