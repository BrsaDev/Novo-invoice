
import React from 'react';
import { Entity, SignatureType, Branding } from '../types';
import { getQrCodeUrl, getContractValidationUrl } from '../utils/formatters';

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
  const validationUrl = getContractValidationUrl(displayHash);

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

  const paragraphs = content.split('\n\n').filter(p => p.trim() !== '');

  return (
    <div 
      id="contract-capture" 
      className="bg-white text-slate-800 relative shadow-2xl"
      style={{ 
        width: '800px', 
        minHeight: '1122px', 
        padding: '60px', 
        borderLeft: `15px solid ${primaryColor}`,
        display: 'block'
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '50px', paddingBottom: '30px', borderBottom: `2px solid ${primaryColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {branding.logoImage ? (
            <img src={branding.logoImage} alt="Logo" style={{ height: '64px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900', color: 'white', backgroundColor: primaryColor, fontFamily: 'Inter' }}>
              {branding.logoLetter}
            </div>
          )}
          <div style={{ fontFamily: 'Inter' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', margin: 0, color: primaryColor }}>
              {provider.name}
            </h1>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 0 0' }}>Instrumento Particular de Contrato</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'Inter' }}>
          <h2 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>Referência Técnica</h2>
          <h3 style={{ fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: '4px 0' }}>Contrato de Serviço</h3>
          <div style={{ marginTop: '12px', padding: '4px 12px', display: 'inline-block', borderRadius: '8px', fontSize: '10px', fontWeight: '700', color: 'white', backgroundColor: primaryColor }}>
            Ref: {displayHash}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px', fontFamily: 'Inter' }}>
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative' }}>
          <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Contratada (Prestadora)</span>
          <h4 style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: '0 0 8px 0' }}>{provider.name}</h4>
          <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', margin: '0 0 4px 0' }}>{formatTaxDetails(provider)}</p>
          <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', margin: 0, lineHeight: '1.5' }}>
            {formatFullAddressShort(provider)}
          </p>
        </div>
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Contratante (Cliente)</span>
          <h4 style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: '0 0 8px 0' }}>{client?.name || 'Não identificado'}</h4>
          {client && <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', margin: '0 0 4px 0' }}>{formatTaxDetails(client)}</p>}
          <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', margin: 0, lineHeight: '1.5' }}>
            {client ? formatFullAddressShort(client) : '-'}
          </p>
        </div>
      </div>

      <main style={{ padding: '0 10px', display: 'block' }}>
        {paragraphs.map((paragraph, idx) => {
          const isClause = paragraph.trim().startsWith('CLÁUSULA') || paragraph.trim().match(/^\d\./);
          
          if (isClause) {
            const lines = paragraph.split('\n');
            return (
              <div key={idx} style={{ marginBottom: '32px', display: 'block', breakInside: 'avoid' }}>
                <h5 style={{ 
                  fontFamily: 'Inter', 
                  fontSize: '13px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase', 
                  color: '#0f172a', 
                  borderLeft: `4px solid ${primaryColor}`, 
                  paddingLeft: '16px',
                  marginBottom: '12px'
                }}>
                  {lines[0]}
                </h5>
                <div style={{ 
                  fontFamily: 'Merriweather', 
                  fontSize: '14px', 
                  lineHeight: '2.1', 
                  textAlign: 'justify', 
                  color: '#334155' 
                }}>
                  {lines.slice(1).join(' ')}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} style={{ 
              marginBottom: '24px', 
              fontFamily: 'Merriweather', 
              fontSize: '14px', 
              lineHeight: '2.1', 
              textAlign: 'justify', 
              color: '#334155',
              display: 'block'
            }}>
              {paragraph}
            </div>
          );
        })}
      </main>

      <footer style={{ marginTop: '60px', paddingTop: '40px', borderTop: '1px solid #e2e8f0', fontFamily: 'Inter' }}>
        {signatureType === 'physical' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', borderBottom: '2px solid #0f172a', display: 'flex', alignItems: 'end', justifyContent: 'center', paddingBottom: '8px' }}>
                 <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>Assinatura Contratada</p>
              </div>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginTop: '12px' }}>{provider.name}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', borderBottom: '2px solid #0f172a', display: 'flex', alignItems: 'end', justifyContent: 'center', paddingBottom: '8px' }}>
                 <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>Assinatura Contratante</p>
              </div>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginTop: '12px' }}>{client?.name || 'CONTRATANTE'}</p>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#0f172a', padding: '30px', borderRadius: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.2em' }}>Autenticado Digitalmente</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#94a3b8', lineHeight: '1.6' }}>
                <p>ID: {displayHash.toUpperCase()}-{Date.now()}</p>
                <p>CERTIFICADO: NOVAINVOICE-PROTOCOL-v3.1</p>
                <p>DATA: {today} • {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '12px' }}>
              <img 
                src={getQrCodeUrl(validationUrl, "100x100")} 
                alt="Validation QR" 
                style={{ width: '60px', height: '60px', display: 'block' }} 
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}
        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
          <span>NovaInvoice Contracts Premium</span>
          <span>Selo de Integridade REF: {displayHash}</span>
        </div>
      </footer>
    </div>
  );
};
