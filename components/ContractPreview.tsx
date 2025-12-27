
import React from 'react';
import { Entity, SignatureType, Branding } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ContractPreviewProps {
  content: string;
  provider: Entity;
  client: Entity | null;
  branding: Branding;
  signatureType: SignatureType;
  docId: string;
  contractHash?: string;
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({ 
  content, 
  provider, 
  client, 
  branding, 
  signatureType,
  docId,
  contractHash: externalHash
}) => {
  const primaryColor = branding.primaryColor;
  const today = new Date().toLocaleDateString('pt-BR');
  
  const displayHash = externalHash || (docId.split('-')[0].toUpperCase() + "REF");

  const formatTaxDetails = (e: Entity) => {
    let details = `Doc: ${e.taxId}`;
    if (e.im || e.ie) {
      details += ` • IM/IE: ${e.im || '-'}/${e.ie || '-'}`;
    }
    return details;
  };

  const formatFullAddressShort = (e: Entity) => {
    const parts = [];
    if (e.street) parts.push(`${e.street}, ${e.number}`);
    if (e.neighborhood) parts.push(e.neighborhood);
    parts.push(`${e.city}/${e.uf}`);
    if (e.zipCode) parts.push(`CEP: ${e.zipCode}`);
    return parts.join(' - ');
  };

  return (
    <div id="contract-capture" className="w-[800px] min-h-[1122px] bg-white p-16 text-slate-800 shadow-2xl relative flex flex-col font-serif">
      <header className="flex justify-between items-start mb-12 pb-8 border-b-2" style={{ borderColor: primaryColor }}>
        <div>
          {branding.logoImage ? (
            <img src={branding.logoImage} alt="Logo" className="h-16 object-contain" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ backgroundColor: primaryColor }}>
              {branding.logoLetter}
            </div>
          )}
          <h1 className="mt-4 text-xl font-black font-sans uppercase tracking-tighter" style={{ color: primaryColor }}>
            {provider.name}
          </h1>
        </div>
        <div className="text-right font-sans">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Instrumento Particular de</h2>
          <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Contrato de Prestação</h3>
          <div className="mt-4 px-3 py-1 inline-block rounded-lg text-[9px] font-bold text-white uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
            Ref: {displayHash}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8 mb-12 font-sans">
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contratada</span>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">{provider.name}</h4>
          <p className="text-[9px] font-bold text-slate-600 mb-2">{formatTaxDetails(provider)}</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Endereço: {formatFullAddressShort(provider)}
          </p>
        </div>
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contratante</span>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">{client?.name || 'A DEFINIR'}</h4>
          {client && <p className="text-[9px] font-bold text-slate-600 mb-2">{formatTaxDetails(client)}</p>}
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Endereço: {client ? formatFullAddressShort(client) : '-'}
          </p>
        </div>
      </div>

      <main className="flex-grow text-[13px] leading-[1.8] text-justify space-y-6">
        {content.split('\n\n').map((paragraph, idx) => {
          if (paragraph.startsWith('CLÁUSULA') || paragraph.match(/^\d\./)) {
            return (
              <div key={idx} className="space-y-2">
                <h5 className="font-sans font-black text-slate-900 uppercase tracking-tight border-l-4 pl-4" style={{ borderColor: primaryColor }}>
                  {paragraph.split('\n')[0]}
                </h5>
                <p>{paragraph.split('\n').slice(1).join('\n')}</p>
              </div>
            );
          }
          return <p key={idx}>{paragraph}</p>;
        })}
      </main>

      <footer className="mt-16 pt-12 border-t border-slate-100 font-sans">
        {signatureType === 'physical' ? (
          <div className="grid grid-cols-2 gap-12 mt-8">
            <div className="text-center space-y-2">
              <div className="border-t border-slate-300 pt-3">
                <span className="text-[10px] font-black uppercase text-slate-900">{provider.name}</span>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest">Contratada</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="border-t border-slate-300 pt-3">
                <span className="text-[10px] font-black uppercase text-slate-900">{client?.name || 'CONTRATANTE'}</span>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest">Contratante</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Protocolo de Assinatura Digital</h5>
              </div>
              <div className="font-mono text-[9px] text-slate-400 space-y-1">
                <p>Hash de Integridade: {displayHash}-{Date.now()}</p>
                <p>Autenticação via NovaInvoice Cloud Auth</p>
                <p>Data de Registro: {today} às {new Date().toLocaleTimeString('pt-BR')}</p>
                <p>IP de Origem: Requisitado pelo Usuário Autenticado</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 bg-white rounded-xl p-1.5 shadow-lg">
                  <svg viewBox="0 0 24 24" fill="black"><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-2 2h2v2h-2zm2 2h3v2h-3zm0-2h2v2h-2zm-2 2h2v2h-2zm2-2h3v2h-3z"/></svg>
               </div>
               <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Validar Documento</span>
            </div>
          </div>
        )}
        <div className="mt-8 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">
          <span>© NovaInvoice Contracts Premium</span>
          <span>Página 1 de 1</span>
          <span>Ref: {displayHash}</span>
        </div>
      </footer>
    </div>
  );
};
