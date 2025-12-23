
import React, { useState } from 'react';
import { Entity } from '../types';

interface ClientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Entity[];
  onSelect: (client: Entity) => void;
  onDelete: (taxId: string) => void;
}

export const ClientSearchModal: React.FC<ClientSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  clients, 
  onSelect,
  onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.taxId.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f172a] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden">
        <header className="p-8 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Base de Clientes</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Armazenamento Local Criptográfico</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-white border border-transparent hover:border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="p-8">
          <div className="relative">
            <input 
              type="text"
              placeholder="Pesquisar por nome ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
            />
            <svg className="absolute left-4 top-4.5 text-slate-600" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-4 custom-scrollbar">
          {filteredClients.length === 0 ? (
            <div className="text-center py-16"><p className="text-slate-600 font-medium tracking-widest text-xs uppercase">Nenhum registro correspondente.</p></div>
          ) : (
            filteredClients.map((client) => (
              <div 
                key={client.taxId} 
                className="group p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-blue-500/40 hover:bg-blue-600/5 transition-all cursor-pointer relative shadow-lg"
                onClick={() => onSelect(client)}
              >
                <div className="flex justify-between items-start pr-10">
                  <div className="space-y-1">
                    <h4 className="font-black text-white text-base leading-tight uppercase tracking-tight">{client.name}</h4>
                    <p className="text-xs text-slate-500 font-bold tracking-widest">{client.taxId}</p>
                    <p className="text-[10px] text-slate-600 font-medium uppercase mt-2">{client.city} • {client.uf}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20">Selecionar</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(client.taxId); }}
                  className="absolute bottom-6 right-6 p-2 text-slate-700 hover:text-red-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
