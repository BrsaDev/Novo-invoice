
import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = 'info',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0f172a] w-full max-w-md rounded-[3rem] border border-white/10 p-10 space-y-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 ${
          type === 'danger' ? 'bg-rose-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
        }`}></div>

        <header className="space-y-3 relative">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full animate-pulse ${
               type === 'danger' ? 'bg-rose-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
             }`}></div>
             <h2 className="text-2xl font-black text-white tracking-tight leading-none">{title}</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Solicitação de Segurança</p>
        </header>

        <div className="space-y-6 relative">
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 relative">
          <button 
            onClick={onCancel} 
            className="flex-1 py-5 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all order-2 sm:order-1"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 order-1 sm:order-2 ${
              type === 'danger' ? 'bg-rose-600 shadow-rose-600/20' : 
              type === 'warning' ? 'bg-amber-600 shadow-amber-600/20' : 
              'bg-blue-600 shadow-blue-600/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
