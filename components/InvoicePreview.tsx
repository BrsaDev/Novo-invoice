
import React from 'react';
import { InvoiceData, Entity } from '../types';
import { formatCurrency, getPixQrCodeUrl, formatDate } from '../utils/formatters';

interface InvoicePreviewProps {
  data: InvoiceData;
}

const CustomLogo = ({ primary, secondary, letter, image, size = 60 }: { primary: string, secondary: string, letter: string, image?: string, size?: number }) => {
  if (image) {
    return <img src={image} alt="Logo" style={{ maxWidth: size * 2, maxHeight: size }} className="object-contain" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5L90 25V75L50 95L10 75V25L50 5Z" fill={primary} />
      <path d="M50 15L80 30V70L50 85L20 70V30L50 15Z" fill={secondary} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="40" fontWeight="900" fontFamily="Inter, sans-serif">{letter}</text>
    </svg>
  );
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data }) => {
  const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
  const totalTaxes = (Object.values(data.taxes) as number[]).reduce((a, b) => a + b, 0);
  const taxValue = (subtotal * data.taxRate) / 100;
  const total = subtotal - totalTaxes - (data.discount || 0);
  const primaryColor = data.branding.primaryColor;
  const secondaryColor = data.branding.secondaryColor;
  const template = data.branding.template || 'classic';
  const isProduct = data.category === 'product';

  const formatFullAddress = (e: Entity) => {
    const parts = [];
    if (e.street) {
      let streetLine = e.street;
      if (e.number) streetLine += `, ${e.number}`;
      if (e.complement) streetLine += ` ${e.complement}`;
      parts.push(streetLine);
    }
    if (e.neighborhood) parts.push(e.neighborhood);
    if (e.city) parts.push(`${e.city}${e.uf ? ' / ' + e.uf : ''}`);
    if (e.zipCode) parts.push(`CEP: ${e.zipCode}`);
    
    return parts.join(' - ') || '-';
  };

  const Row = ({ children, className = "", border = true }: { children?: React.ReactNode, className?: string, border?: boolean }) => (
    <div className={`flex ${border ? 'border-b border-black' : ''} last:border-b-0 ${className}`}>{children}</div>
  );

  const Cell = ({ label, value, className = "", labelClass = "", valueClass = "", border = true }: { label?: string, value?: string | number, className?: string, labelClass?: string, valueClass?: string, border?: boolean }) => (
    <div className={`p-1.5 ${border ? 'border-r border-black' : ''} last:border-r-0 flex flex-col ${className}`}>
      {label && <span className={`text-[8px] font-bold text-black uppercase leading-tight ${labelClass}`}>{label}</span>}
      <span className={`text-[10px] text-black font-medium ${valueClass}`}>{value || '-'}</span>
    </div>
  );

  const renderClassic = () => (
    <div className="flex flex-col border-[1.5px] border-black h-full text-slate-950 bg-white">
      <div className="flex border-b border-black">
        <div className="w-1/4 p-4 border-r border-black flex items-center justify-center bg-white">
          <CustomLogo primary={primaryColor} secondary={secondaryColor} letter={data.branding.logoLetter} image={data.branding.logoImage} />
        </div>
        <div className="w-1/2 p-4 border-r border-black flex flex-col items-center justify-center text-center">
          <h1 className="text-xl font-black mb-0.5 tracking-tighter uppercase" style={{ color: primaryColor }}>{data.provider.name}</h1>
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">{data.labels.documentSubtitle}</h2>
          <div className="border border-black px-6 py-2 rounded-sm bg-slate-50">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-900">{data.labels.documentTitle}</span>
          </div>
        </div>
        <div className="w-1/4">
          <div className="h-1/2 border-b border-black flex flex-col items-center justify-center p-1"><span className="text-[9px] font-bold uppercase text-slate-400">Número</span><span className="text-sm font-black text-slate-900">{data.invoiceNumber}</span></div>
          <div className="h-1/2 flex flex-col items-center justify-center p-1"><span className="text-[9px] font-bold uppercase text-slate-400">Série</span><span className="text-sm font-black text-slate-900">{data.serie || 'ÚNICA'}</span></div>
        </div>
      </div>
      <Row className="bg-slate-50/50">
        <Cell label="Emissão:" value={formatDate(data.issueDate)} className="w-1/2" />
        <Cell label="Competência:" value={data.competency} className="w-1/2" />
      </Row>
      
      {[
        { title: data.labels.providerSection, entity: data.provider, bgColor: primaryColor, textColor: 'white' },
        { title: data.labels.clientSection, entity: data.client, bgColor: primaryColor, textColor: 'white' }
      ].map((sec, i) => (
        <React.Fragment key={i}>
          <div className="text-center py-1.5 border-b border-black font-bold text-[10px] uppercase tracking-widest" style={{ backgroundColor: sec.bgColor, color: sec.textColor }}>{sec.title}</div>
          <Row><Cell label="Nome / Razão Social:" value={sec.entity.name} className="w-full" /></Row>
          <Row>
            <Cell label="CPF / CNPJ:" value={sec.entity.taxId} className="w-2/4" />
            <Cell label="I. Municipal:" value={sec.entity.im} className="w-1/4" />
            <Cell label="I. Estadual:" value={sec.entity.ie} className="w-1/4" />
          </Row>
          <Row>
            <Cell label="E-mail:" value={sec.entity.email} className="w-1/2" />
            <Cell label="Telefone:" value={sec.entity.phone} className="w-1/2" />
          </Row>
          <Row><Cell label="Endereço:" value={formatFullAddress(sec.entity)} className="w-full" /></Row>
        </React.Fragment>
      ))}

      <div className="text-center py-1.5 border-b border-black font-bold text-[10px] uppercase tracking-widest" style={{ backgroundColor: primaryColor, color: 'white' }}>{data.labels.itemsSection}</div>
      <div className="p-6 flex-grow border-b border-black min-h-[250px] bg-white text-slate-900">
        <div className="grid grid-cols-12 gap-2 mb-2 border-b border-slate-200 pb-1 text-[9px] font-black uppercase text-slate-400">
          <div className="col-span-7">Discriminação</div>
          <div className="col-span-1 text-center">Qtd</div>
          <div className="col-span-1 text-center">Und</div>
          <div className="col-span-3 text-right">Total</div>
        </div>
        {data.items.map(item => (
          <div key={item.id} className="mb-3 grid grid-cols-12 gap-2 border-b border-slate-100 pb-2 text-slate-950 items-center">
            <div className="col-span-7">
              <span className="font-bold block text-xs">• {item.description || "Descrição não informada"}</span>
            </div>
            <div className="col-span-1 text-center text-[10px] font-medium">{item.quantity}</div>
            <div className="col-span-1 text-center text-[10px] font-medium uppercase">{item.unit || '-'}</div>
            <div className="col-span-3 text-right font-black text-xs">{formatCurrency(item.quantity * item.unitValue)}</div>
          </div>
        ))}
        <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-600 italic">
          <strong className="text-slate-900">Informações Adicionais:</strong> {data.notes}
        </div>
      </div>
      <div className="flex border-b border-black h-36 bg-slate-50">
        <div className="w-1/3 p-4 border-r border-black flex flex-col items-center justify-center">
          {data.provider.pixKey && (
             <>
               <span className="text-[7px] font-black uppercase mb-1 text-slate-900">Pagamento via PIX</span>
               <img src={getPixQrCodeUrl(data.provider.pixKey, total, data.provider.name, data.provider.city)} className="w-20 h-20" />
               <span className="text-[7px] font-mono mt-1 text-slate-600">{data.provider.pixKey}</span>
             </>
          )}
        </div>
        <div className="w-2/3 grid grid-cols-4">
           <Cell label="VALOR BRUTO" value={formatCurrency(subtotal)} />
           <Cell label="DESCONTO" value={formatCurrency(data.discount || 0)} valueClass="text-red-600" />
           <Cell label="RETENÇÕES" value={formatCurrency(totalTaxes)} />
           <Cell label={isProduct ? "VALOR DO ICMS" : "VALOR DO ISS"} value={formatCurrency(taxValue)} />
           <Cell label={isProduct ? "CFOP" : "CÓD. SERVIÇO"} value={data.serviceCode} className="col-span-3" />
           <Cell label="CNAE" value={data.cnae} />
        </div>
      </div>
      <div className="p-4 text-white text-center font-black uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>{data.labels.totalLabel}: {formatCurrency(total)}</div>
    </div>
  );

  const renderModern = () => (
    <div className="p-16 h-full flex flex-col bg-white text-slate-900 border-[1.5px] border-black">
      <header className="flex justify-between items-start mb-16">
        <div>
          <CustomLogo primary={primaryColor} secondary={secondaryColor} letter={data.branding.logoLetter} size={80} image={data.branding.logoImage} />
          <h1 className="mt-8 text-3xl font-black tracking-tighter" style={{ color: primaryColor }}>{data.provider.name}</h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">{data.labels.documentSubtitle}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-slate-200 mb-4">{data.labels.documentTitle}</h2>
          <div className="grid grid-cols-2 gap-x-6 text-[10px] font-bold text-right">
            <span className="text-slate-400 uppercase">IDENTIFICADOR:</span><span className="text-slate-800">{data.invoiceNumber} / {data.serie || 'U'}</span>
            <span className="text-slate-400 uppercase">DATA EMISSÃO:</span><span className="text-slate-800">{formatDate(data.issueDate)}</span>
            <span className="text-slate-400 uppercase">COMPETÊNCIA:</span><span className="text-slate-800">{data.competency}</span>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-16 mb-20">
        {[ { label: 'Prestador:', entity: data.provider }, { label: 'Tomador:', entity: data.client } ].map((item, i) => (
          <div key={i}>
            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 border-b pb-2">{item.label}</h4>
            <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{item.entity.name}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Documento: <span className="text-slate-600">{item.entity.taxId}</span></p>
              {(item.entity.im || item.entity.ie) && (
                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">IM/IE: <span className="text-slate-600">{item.entity.im || '-'}/{item.entity.ie || '-'}</span></p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">{formatFullAddress(item.entity)}</p>
          </div>
        ))}
      </div>
      <div className="flex-grow">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-100">
              <th className="py-5 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Descrição</th>
              <th className="py-5 text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Und</th>
              <th className="py-5 text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">Total Líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.items.map(item => (
              <tr key={item.id}>
                <td className="py-6 text-xs font-bold text-slate-800">{item.description || "Descrição não informada"} (x{item.quantity})</td>
                <td className="py-6 text-xs font-medium text-slate-500 text-center uppercase">{item.unit || '-'}</td>
                <td className="py-6 text-xs font-black text-slate-800 text-right tracking-tight">{formatCurrency(item.quantity * item.unitValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-auto pt-10 border-t-2 border-slate-100 flex justify-between items-end">
        <div className="w-1/2 flex items-center gap-6">
            {data.provider.pixKey && (
               <>
                 <img src={getPixQrCodeUrl(data.provider.pixKey, total, data.provider.name, data.provider.city)} className="w-20 h-20 shadow-sm" />
                 <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Pagamento Pix</p>
                    <p className="text-[11px] font-bold text-slate-800">{data.provider.pixKey}</p>
                 </div>
               </>
            )}
        </div>
        <div className="w-1/3 text-right">
          <div className="pt-4 border-t border-slate-100">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Total Final</span>
             <span className="text-3xl font-black tracking-tighter" style={{ color: primaryColor }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </footer>
    </div>
  );

  const renderMinimal = () => (
    <div className="p-20 h-full flex flex-col bg-white text-slate-900 border-[1.5px] border-black">
       <div className="flex justify-between items-center mb-24">
          <div className="flex items-center gap-8">
             <CustomLogo primary={primaryColor} secondary={secondaryColor} letter={data.branding.logoLetter} size={50} image={data.branding.logoImage} />
             <div><h1 className="text-lg font-black tracking-tight uppercase leading-none">{data.provider.name}</h1></div>
          </div>
          <div className="text-right">
             <h2 className="text-xs font-black uppercase tracking-[0.5em] text-slate-300">ID #{data.invoiceNumber}</h2>
          </div>
       </div>
       <div className="grid grid-cols-2 gap-16 mb-24">
          {[ { label: 'Empresa', entity: data.provider }, { label: 'Cliente', entity: data.client } ].map((item, i) => (
            <div key={i} className="space-y-2">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.label}</p>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{item.entity.name}</h3>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Doc: {item.entity.taxId}</p>
              {(item.entity.im || item.entity.ie) && (
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">IM/IE: {item.entity.im || '-'}/{item.entity.ie || '-'}</p>
              )}
            </div>
          ))}
       </div>
       <div className="flex-grow space-y-6">
          {data.items.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-6 py-5 border-b border-slate-100 last:border-0 items-center">
               <div className="col-span-8 text-xs font-bold text-slate-800">{item.description || "Descrição não informada"} <span className="text-[10px] text-slate-400">({item.quantity} {item.unit})</span></div>
               <div className="col-span-4 text-right text-base font-black text-slate-800 tracking-tight">{formatCurrency(item.quantity * item.unitValue)}</div>
            </div>
          ))}
       </div>
       <div className="mt-24">
          <div className="flex justify-between items-center py-6 border-t-2 border-slate-900 w-full">
             <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Total Líquido</span>
             <span className="text-2xl font-black tracking-tighter text-slate-900">{formatCurrency(total)}</span>
          </div>
       </div>
    </div>
  );

  return (
    <div id="invoice-capture" className="bg-white w-[800px] min-h-[1100px] flex flex-col border-[10px] border-black p-[10px] shadow-2xl overflow-hidden no-print-margin">
      {template === 'classic' && renderClassic()}
      {template === 'modern' && renderModern()}
      {template === 'minimal' && renderMinimal()}
    </div>
  );
};
