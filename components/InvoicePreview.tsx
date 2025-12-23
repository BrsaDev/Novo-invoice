
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
          {data.provider.tradingName && <h3 className="text-[11px] font-bold text-slate-600 uppercase mb-1">{data.provider.tradingName}</h3>}
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
      
      {[
        { title: data.labels.providerSection, entity: data.provider },
        { title: data.labels.clientSection, entity: data.client }
      ].map((sec, i) => (
        <React.Fragment key={i}>
          <div className="text-center py-1.5 border-b border-black font-bold text-[10px] uppercase tracking-widest" style={{ backgroundColor: primaryColor, color: 'white' }}>{sec.title}</div>
          <Row>
            <Cell label="Razão Social / Nome:" value={sec.entity.name} className="w-1/2" />
            <Cell label="Nome Fantasia:" value={sec.entity.tradingName} className="w-1/2" />
          </Row>
          <Row>
            <Cell label="CPF / CNPJ:" value={sec.entity.taxId} className="w-1/4" />
            <Cell label="Insc. Municipal:" value={sec.entity.im} className="w-1/4" />
            <Cell label="Insc. Estadual:" value={sec.entity.ie} className="w-1/4" />
            <Cell label="Telefone:" value={sec.entity.phone} className="w-1/4" />
          </Row>
          <Row>
            <Cell label="Endereço:" value={formatFullAddress(sec.entity)} className="w-2/3" />
            <Cell label="E-mail:" value={sec.entity.email} className="w-1/3" />
          </Row>
        </React.Fragment>
      ))}

      <div className="bg-slate-100 text-slate-700 text-center py-1.5 border-b border-black font-bold text-[10px] uppercase tracking-widest">{data.labels.itemsSection}</div>
      <div className="flex-grow border-b border-black min-h-[250px] bg-white">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50 text-[8px] font-black uppercase text-slate-400 border-b border-slate-200">
                  <th className="p-2">Descrição</th>
                  <th className="p-2 text-center w-20">{isProduct ? 'Unid' : 'Ref'}</th>
                  <th className="p-2 text-center w-16">Qtd</th>
                  <th className="p-2 text-right w-24">Unitário</th>
                  <th className="p-2 text-right w-24">Total</th>
               </tr>
            </thead>
            <tbody>
               {data.items.map(item => (
                 <tr key={item.id} className="border-b border-slate-100 last:border-0 text-[10px]">
                    <td className="p-2">
                       <span className="font-bold text-slate-900 block">{item.description}</span>
                       {isProduct && item.ncm && <span className="text-[7px] text-slate-400 font-mono">NCM: {item.ncm}</span>}
                    </td>
                    <td className="p-2 text-center text-slate-600 uppercase">{isProduct ? item.unit || 'un' : '-'}</td>
                    <td className="p-2 text-center text-slate-900">{item.quantity}</td>
                    <td className="p-2 text-right text-slate-600">{formatCurrency(item.unitValue)}</td>
                    <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(item.quantity * item.unitValue)}</td>
                 </tr>
               ))}
            </tbody>
         </table>
        <div className="p-4 mt-auto text-[10px] text-slate-600 italic">
          <strong className="text-slate-900">Obs:</strong> {data.notes}
        </div>
      </div>

      <div className="flex border-b border-black h-36 bg-slate-50">
        <div className="w-1/3 p-4 border-r border-black flex flex-col items-center justify-center">
          {data.provider.pixKey && (
             <>
               <span className="text-[7px] font-black uppercase mb-1 text-slate-900">PIX para Recebimento</span>
               <img src={getPixQrCodeUrl(data.provider.pixKey, total, data.provider.name, data.provider.city)} className="w-20 h-20" />
               <span className="text-[6px] font-bold text-slate-400 mt-1">{data.provider.pixKey}</span>
             </>
          )}
        </div>
        <div className="w-2/3 grid grid-cols-4">
           <Cell label="VALOR BRUTO" value={formatCurrency(subtotal)} />
           <Cell label="DESCONTOS" value={formatCurrency(data.discount || 0)} valueClass="text-red-600" />
           <Cell label="RETENÇÕES" value={formatCurrency(totalTaxes)} />
           <Cell label={isProduct ? "EST. IMPOSTO" : "VALOR ISS"} value={formatCurrency(taxValue)} />
           <Cell label={isProduct ? "CFOP / NATUREZA" : "CÓD. SERVIÇO"} value={data.serviceCode} className="col-span-3" />
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
          {data.provider.tradingName && <p className="text-sm font-bold text-slate-500 uppercase mt-1">{data.provider.tradingName}</p>}
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">{data.labels.documentSubtitle}</p>
          <div className="mt-6 space-y-1 text-[9px] font-bold text-slate-500 uppercase">
             <p>CNPJ: {data.provider.taxId}</p>
             {data.provider.im && <p>IM: {data.provider.im} {data.provider.ie ? `| IE: ${data.provider.ie}` : ''}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-slate-200 mb-4">{data.labels.documentTitle}</h2>
          <div className="grid grid-cols-2 gap-x-6 text-[10px] font-bold text-right">
             <span className="text-slate-400 uppercase">IDENTIFICADOR:</span><span className="text-slate-800">#{data.invoiceNumber}</span>
             <span className="text-slate-400 uppercase">CATEGORIA:</span><span className="text-slate-800 uppercase">{isProduct ? 'Produtos' : 'Serviços'}</span>
             <span className="text-slate-400 uppercase">DATA:</span><span className="text-slate-800">{formatDate(data.issueDate)}</span>
          </div>
        </div>
      </header>
      <div className="flex-grow">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-100">
               <th className="py-5 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Descrição</th>
               <th className="py-5 text-[10px] font-black text-slate-400 uppercase text-center w-24">Qtd / {isProduct ? 'Un' : 'Ref'}</th>
               <th className="py-5 text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.items.map(item => (
              <tr key={item.id}>
                <td className="py-6">
                   <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{item.description}</p>
                   {isProduct && item.ncm && <p className="text-[9px] text-slate-400 mt-1">NCM: {item.ncm}</p>}
                </td>
                <td className="py-6 text-xs font-bold text-slate-800 text-center uppercase">{item.quantity} {isProduct ? (item.unit || 'un') : ''}</td>
                <td className="py-6 text-xs font-black text-slate-800 text-right tracking-tight">{formatCurrency(item.quantity * item.unitValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-auto pt-10 border-t-2 border-slate-100 flex justify-between items-end">
        <div className="w-1/2">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Informações Fiscais</p>
           <p className="text-[10px] text-slate-500">{isProduct ? 'CFOP:' : 'Cód. Serviço:'} {data.serviceCode} • CNAE: {data.cnae}</p>
           {data.provider.pixKey && <p className="text-[9px] font-bold text-slate-400 mt-2">PIX: {data.provider.pixKey}</p>}
        </div>
        <div className="text-right">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Total a Receber</span>
             <span className="text-3xl font-black tracking-tighter" style={{ color: primaryColor }}>{formatCurrency(total)}</span>
        </div>
      </footer>
    </div>
  );

  const renderMinimal = () => (
    <div className="p-20 h-full flex flex-col bg-white text-slate-900 border-[1.5px] border-black">
       <div className="flex justify-between items-center mb-24">
          <CustomLogo primary={primaryColor} secondary={secondaryColor} letter={data.branding.logoLetter} size={50} image={data.branding.logoImage} />
          <div className="text-right">
            <h2 className="text-xs font-black uppercase tracking-[0.5em] text-slate-300">ID #{data.invoiceNumber} • {isProduct ? 'PROD' : 'SERV'}</h2>
            <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">{data.provider.name}</p>
          </div>
       </div>
       <div className="flex-grow space-y-8">
          {data.items.map(item => (
            <div key={item.id} className="flex justify-between items-center py-5 border-b border-slate-100 last:border-0">
               <div>
                  <p className="text-xs font-bold text-slate-800 uppercase">{item.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{item.quantity} x {formatCurrency(item.unitValue)} {isProduct ? item.unit : ''}</p>
               </div>
               <div className="text-base font-black text-slate-800 tracking-tight">{formatCurrency(item.quantity * item.unitValue)}</div>
            </div>
          ))}
       </div>
       <div className="mt-24 py-6 border-t-2 border-slate-900 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 block">Total Líquido</span>
            {data.provider.pixKey && <span className="text-[8px] font-bold text-slate-300 uppercase">PIX: {data.provider.pixKey}</span>}
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">{formatCurrency(total)}</span>
       </div>
    </div>
  );

  return (
    <div id="invoice-capture" className="bg-white w-[800px] min-h-[1100px] flex flex-col border-[10px] border-black p-[10px] shadow-2xl overflow-hidden">
      {template === 'classic' && renderClassic()}
      {template === 'modern' && renderModern()}
      {template === 'minimal' && renderMinimal()}
    </div>
  );
};
