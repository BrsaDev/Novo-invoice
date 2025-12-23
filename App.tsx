
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InvoiceData, InvoiceItem, InvoiceLabels, Branding, Entity, InvoiceHistoryItem, InvoiceCategory } from './types';
import { InputGroup } from './components/InputGroup';
import { InvoicePreview } from './components/InvoicePreview';
import { ClientSearchModal } from './components/ClientSearchModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { formatCurrency } from './utils/formatters';
import { supabase } from './lib/supabase';

const INITIAL_LABELS: InvoiceLabels = {
  documentTitle: 'Recibo de Prestação de Serviços',
  documentSubtitle: 'Faturamento de Serviços Profissionais',
  providerSection: 'Dados do Prestador',
  clientSection: 'Dados do Tomador (Cliente)',
  itemsSection: 'Discriminação dos Serviços Prestados',
  notesLabel: 'Observações Adicionais',
  serviceCodeLabel: 'Classificação do Serviço',
  cnaeLabel: 'Atividade Econômica',
  signatureLabel: 'Assinatura do Responsável',
  totalLabel: 'Valor Líquido do Documento',
};

const DEFAULT_WA_TEMPLATE = "Olá {cliente}! Segue o seu documento de faturamento #{numero} no valor de {valor}. Você pode visualizar o documento aqui: {link}";

const INITIAL_BRANDING: Branding = {
  primaryColor: '#006494',
  secondaryColor: '#00A6FB',
  logoLetter: 'N',
  template: 'classic',
};

const EMPTY_ENTITY: Entity = {
  name: '',
  tradingName: '',
  taxId: '',
  im: '',
  ie: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  zipCode: '',
  city: '',
  uf: '',
  email: '',
  phone: '',
  whatsapp: '',
  pixKey: '',
};

const INITIAL_PROVIDER: Entity = {
  ...EMPTY_ENTITY,
  name: '',
  taxId: '',
  email: '',
};

const INITIAL_DATA: InvoiceData = {
  category: 'service',
  invoiceNumber: '001',
  serie: '1',
  issueDate: new Date().toISOString().split('T')[0],
  competency: new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric' }).format(new Date()),
  provider: INITIAL_PROVIDER,
  client: { ...EMPTY_ENTITY },
  items: [{ id: '1', description: 'Consultoria Especializada', quantity: 1, unitValue: 0, unit: 'un' }],
  notes: 'Pagamento via PIX. Dados para faturamento inclusos no documento.',
  serviceCode: '01.07 - Suporte técnico e manutenção.',
  cnae: '6201-5/01 - Desenvolvimento de programas.',
  taxRate: 2.0,
  taxes: { inss: 0, ir: 0, pis: 0, cofins: 0, csll: 0, others: 0 },
  discount: 0,
  labels: INITIAL_LABELS,
  branding: INITIAL_BRANDING,
};

const sanitizeFilename = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
};

const shortenUrl = async (longUrl: string): Promise<string> => {
  try {
    const response = await fetch('https://spoo.me/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: `url=${encodeURIComponent(longUrl)}`,
    });

    if (response.ok) {
      const result = await response.json();
      return result.short_url || longUrl;
    }
    return longUrl; 
  } catch (error) {
    console.error('Erro ao encurtar URL (CORS/Network):', error);
    return longUrl;
  }
};

interface EntityFormProps {
  title: string;
  entity: Entity;
  updateFn: (field: keyof Entity, value: string) => void;
  isClient?: boolean;
  isProvider?: boolean;
  onSearch?: () => void;
  onSave?: () => void;
  saveButtonId?: string;
}

const EntityForm: React.FC<EntityFormProps> = ({ 
  title, 
  entity, 
  updateFn, 
  isClient = false,
  isProvider = false,
  onSearch,
  onSave,
  saveButtonId
}) => (
  <section className="bg-white/5 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] border border-white/10 shadow-2xl space-y-6">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
      {isClient && (
        <div className="flex gap-2">
          <button onClick={onSearch} className="text-[9px] md:text-[10px] font-black text-blue-400 px-3 py-1.5 bg-blue-400/10 rounded-lg uppercase tracking-widest hover:bg-blue-400 hover:text-white transition-all flex items-center gap-1 border border-blue-400/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y2="16.65"></line></svg>
            Buscar
          </button>
          <button id={saveButtonId} onClick={onSave} className="text-[9px] md:text-[10px] font-black text-indigo-400 px-3 py-1.5 bg-indigo-400/10 rounded-lg uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all border border-indigo-400/20 min-w-[60px]">
            Salvar
          </button>
        </div>
      )}
    </div>
    <div className="space-y-5">
      <InputGroup label="Razão Social / Nome Completo" value={entity.name} onChange={(e) => updateFn('name', e.target.value)} />
      <InputGroup label="Nome Fantasia (Opcional)" value={entity.tradingName || ''} onChange={(e) => updateFn('tradingName', e.target.value)} />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputGroup label="CPF / CNPJ" value={entity.taxId} onChange={(e) => updateFn('taxId', e.target.value)} />
        <InputGroup label="Telefone" value={entity.phone} onChange={(e) => updateFn('phone', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputGroup label="Insc. Municipal (IM)" value={entity.im || ''} onChange={(e) => updateFn('im', e.target.value)} />
        <InputGroup label="Insc. Estadual (IE)" value={entity.ie || ''} onChange={(e) => updateFn('ie', e.target.value)} />
      </div>

      {isProvider && (
        <InputGroup label="Chave PIX para Recebimento" value={entity.pixKey || ''} onChange={(e) => updateFn('pixKey', e.target.value)} placeholder="E-mail, CPF, CNPJ ou Celular" />
      )}

      {isClient && (
        <InputGroup 
          label="WhatsApp de Cobrança" 
          value={entity.whatsapp || ''} 
          onChange={(e) => updateFn('whatsapp', e.target.value)} 
          placeholder="Ex: 11999999999" 
        />
      )}
      <InputGroup label="E-mail" value={entity.email} onChange={(e) => updateFn('email', e.target.value)} />
    </div>
    
    <div className="pt-6 border-t border-white/5 space-y-5">
      <span className="text-[9px] font-black text-slate-600 uppercase block tracking-[0.2em]">Endereço Estruturado</span>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
        <div className="sm:col-span-8">
          <InputGroup label="Logradouro" value={entity.street} onChange={(e) => updateFn('street', e.target.value)} />
        </div>
        <div className="sm:col-span-4">
          <InputGroup label="Nº" value={entity.number} onChange={(e) => updateFn('number', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputGroup label="Complemento" value={entity.complement || ''} onChange={(e) => updateFn('complement', e.target.value)} />
        <InputGroup label="Bairro" value={entity.neighborhood} onChange={(e) => updateFn('neighborhood', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-12 gap-5">
        <div className="col-span-1 sm:col-span-4">
          <InputGroup label="CEP" value={entity.zipCode} onChange={(e) => updateFn('zipCode', e.target.value)} />
        </div>
        <div className="col-span-1 sm:col-span-6">
          <InputGroup label="Cidade" value={entity.city} onChange={(e) => updateFn('city', e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-2">
          <InputGroup label="UF" value={entity.uf} onChange={(e) => updateFn('uf', e.target.value)} />
        </div>
      </div>
    </div>
  </section>
);

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

type ViewState = 'landing' | 'editor' | 'history' | 'mei-report';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewState>('landing');
  const [data, setData] = useState<InvoiceData>(INITIAL_DATA);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<Entity[]>([]);
  const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [tempWaNumber, setTempWaNumber] = useState('');
  const [lastGeneratedPdfUrl, setLastGeneratedPdfUrl] = useState<string | null>(null);
  const [selectedReportYear, setSelectedReportYear] = useState<number>(new Date().getFullYear());
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'info' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadProfile();
      loadClients();
      loadHistory();
    }
  }, [session]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const loadProfile = async () => {
    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').maybeSingle();
      if (error) throw error;
      if (profile) {
        if (profile.whatsapp_template) setWaTemplate(profile.whatsapp_template);
        setData(prev => ({
          ...prev,
          category: (profile.preferred_category as InvoiceCategory) || prev.category,
          provider: {
            ...prev.provider,
            name: profile.name || prev.provider.name,
            tradingName: profile.trading_name || prev.provider.tradingName,
            taxId: profile.tax_id || prev.provider.taxId,
            im: profile.im || prev.provider.im,
            ie: profile.ie || prev.provider.ie,
            street: profile.street || prev.provider.street,
            number: profile.number || prev.provider.number,
            complement: profile.complement || prev.provider.complement,
            neighborhood: profile.neighborhood || prev.provider.neighborhood,
            zipCode: profile.zip_code || prev.provider.zipCode,
            city: profile.city || prev.provider.city,
            uf: profile.uf || prev.provider.uf,
            email: profile.email || prev.provider.email,
            phone: profile.phone || prev.provider.phone,
            pixKey: profile.pix_key || prev.provider.pixKey,
          },
          branding: {
            primaryColor: profile.primary_color || INITIAL_BRANDING.primaryColor,
            secondaryColor: profile.secondary_color || INITIAL_BRANDING.secondaryColor,
            logoLetter: profile.logo_letter || INITIAL_BRANDING.logoLetter,
            logoImage: profile.logo_base64 || INITIAL_BRANDING.logoImage,
            template: (profile.template as 'classic' | 'modern' | 'minimal') || INITIAL_BRANDING.template,
          }
        }));
      }
    } catch (e) {
      console.warn("Perfil não carregado integralmente. Execute o SQL de migração.");
    }
  };

  const loadClients = async () => {
    const { data: clients } = await supabase.from('clients').select('*').order('name');
    if (clients) {
      setSavedClients(clients.map(c => ({
        name: c.name || '',
        tradingName: c.trading_name || '',
        taxId: c.tax_id || '',
        im: c.im || '',
        ie: c.ie || '',
        street: c.street || '',
        number: c.number || '',
        complement: c.complement || '',
        neighborhood: c.neighborhood || '',
        zipCode: c.zip_code || '',
        city: c.city || '',
        uf: c.uf || '',
        email: c.email || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        pixKey: c.pix_key || ''
      })));
    }
  };

  const loadHistory = async () => {
    const { data: invoices } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (invoices) {
      setHistory(invoices.map(inv => ({
        id: inv.id,
        timestamp: new Date(inv.created_at).getTime(),
        category: (inv.category || 'service') as InvoiceCategory,
        data: {
          ...inv.full_data,
          category: inv.category || inv.full_data.category || 'service',
          pdfUrl: inv.pdf_url
        },
        totalValue: Number(inv.total_value),
        clientName: inv.client_name,
        pdfUrl: inv.pdf_url
      })));
    }
  };

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const yearItems = history.filter(h => new Date(h.timestamp).getFullYear() === currentYear);
    const monthItems = history.filter(h => {
      const d = new Date(h.timestamp);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const totalAnnual = yearItems.reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalMonthly = monthItems.reduce((acc, curr) => acc + curr.totalValue, 0);
    const avgTicket = yearItems.length > 0 ? totalAnnual / yearItems.length : 0;
    const meiLimit = 81000;
    const remainingMei = Math.max(0, meiLimit - totalAnnual);
    const progress = Math.min(100, (totalAnnual / meiLimit) * 100);
    return { totalAnnual, totalMonthly, avgTicket, remainingMei, progress, yearItemsCount: yearItems.length, monthItemsCount: monthItems.length };
  }, [history]);

  const reportData = useMemo(() => {
    const yearHistory = history.filter(h => new Date(h.timestamp).getFullYear() === selectedReportYear);
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      name: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2000, i, 1)),
      totalService: 0,
      totalProduct: 0,
      total: 0
    }));

    yearHistory.forEach(h => {
      const monthIdx = new Date(h.timestamp).getMonth();
      const val = h.totalValue;
      if (h.category === 'product') {
        months[monthIdx].totalProduct += val;
      } else {
        months[monthIdx].totalService += val;
      }
      months[monthIdx].total += val;
    });

    const totalYearService = months.reduce((acc, m) => acc + m.totalService, 0);
    const totalYearProduct = months.reduce((acc, m) => acc + m.totalProduct, 0);
    const totalYear = totalYearService + totalYearProduct;
    
    return { months, totalYearService, totalYearProduct, totalYear };
  }, [history, selectedReportYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    history.forEach(h => years.add(new Date(h.timestamp).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
        showToast('Preencha todos os campos.', 'error');
        return;
    }
    setIsLoggingIn(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPass,
          options: { data: { full_name: userName } }
        });
        if (error) throw error;
        showToast('Sucesso! Verifique seu e-mail para confirmar a conta.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('E-mail ou senha incorretos.');
            }
            throw error;
        }
        showToast('Login realizado com sucesso.', 'success');
      }
    } catch (error: any) { 
        showToast(error.message || 'Erro ao processar autenticação.', 'error'); 
    } finally { 
        setIsLoggingIn(false); 
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setView('landing'); };

  const saveToHistory = async (pdfUrl: string | null = null, forceId: string | null = null, updatedData?: InvoiceData) => {
    const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
    const totalTaxes = (Object.values(data.taxes) as number[]).reduce((a, b) => a + b, 0);
    const total = subtotal - totalTaxes - data.discount;
    const targetId = forceId || currentInvoiceId;
    
    const payload = {
      user_id: session.user.id,
      client_name: data.client.name,
      invoice_number: data.invoiceNumber,
      total_value: total,
      category: data.category,
      full_data: updatedData || { ...data, pdfUrl: pdfUrl }, 
      pdf_url: pdfUrl
    };

    if (targetId) {
      const { error } = await supabase.from('invoices').update(payload).eq('id', targetId);
      if (error) console.error('Erro ao atualizar histórico:', error);
    } else {
      const { error } = await supabase.from('invoices').insert(payload);
      if (error) console.error('Erro ao inserir histórico:', error);
    }
    loadHistory();
  };

  const uploadPdfToStorage = async (blob: Blob): Promise<string | null> => {
    const sanitizedClient = data.client.name ? sanitizeFilename(data.client.name).slice(0, 25) : 'cliente';
    const fileName = `fatura_${data.invoiceNumber}_${sanitizedClient}_${Date.now().toString().slice(-4)}.pdf`;
    const { data: uploadData, error } = await supabase.storage
      .from('invoices')
      .upload(`${session.user.id}/${fileName}`, blob, { upsert: true });
    if (error) {
      console.error('Erro no upload do PDF:', error);
      return null;
    }
    const { data: publicUrlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(`${session.user.id}/${fileName}`);
    return publicUrlData.publicUrl;
  };

  const proceedWithPdfGeneration = async (targetId: string | null) => {
    if (!invoiceRef.current) return;
    setActiveTab('preview');
    setIsEmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const element = invoiceRef.current;
      const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const sanitizedClient = data.client.name ? sanitizeFilename(data.client.name).slice(0, 25) : 'cliente';
      pdf.save(`Fatura_${data.invoiceNumber}_${sanitizedClient}.pdf`);
      
      const pdfBlob = pdf.output('blob');
      const publicUrl = await uploadPdfToStorage(pdfBlob);
      let finalUrl = publicUrl;
      if (publicUrl) finalUrl = await shortenUrl(publicUrl);
      
      const updatedData = { ...data, pdfUrl: finalUrl || undefined };
      setData(updatedData);
      setLastGeneratedPdfUrl(finalUrl);

      await saveToHistory(finalUrl, targetId, updatedData);
      showToast('Documento processado e salvo no histórico.', 'success');
    } catch (error) { 
        showToast("Erro crítico ao gerar PDF.", 'error'); 
    } finally { 
        setIsEmitting(false); 
    }
  };

  const handleExportReportPdf = async () => {
    if (!reportRef.current) return;
    setIsExportingReport(true);
    try {
      const element = reportRef.current;
      const canvas = await (window as any).html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#020617',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        x: 0,
        y: 0
      });
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = contentHeightInPdf;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeightInPdf);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - contentHeightInPdf;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeightInPdf);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Relatorio_DASN_${selectedReportYear}.pdf`);
      showToast('Relatório completo exportado.', 'success');
    } catch (error) {
      showToast('Erro ao exportar relatório.', 'error');
    } finally {
      setIsExportingReport(false);
    }
  };

  const handlePrint = async () => {
    if (!invoiceRef.current) return;

    if (!currentInvoiceId) {
      const { data: existing } = await supabase.from('invoices')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('invoice_number', data.invoiceNumber)
        .maybeSingle();

      if (existing) {
        setConfirmDialog({
          isOpen: true,
          title: "Documento Existente",
          message: `O documento #${data.invoiceNumber} já existe no seu histórico. Deseja substituir o registro existente ou cancelar para alterar o número manualmente?`,
          type: 'warning',
          confirmText: "Substituir Registro",
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            setCurrentInvoiceId(existing.id);
            proceedWithPdfGeneration(existing.id);
          }
        });
        return;
      }
      proceedWithPdfGeneration(null);
    } else {
      setConfirmDialog({
        isOpen: true,
        title: "Atualizar Registro",
        message: `Você está editando o documento #${data.invoiceNumber}. O registro atual no histórico será atualizado com esta nova versão.`,
        type: 'info',
        confirmText: "Atualizar Agora",
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          proceedWithPdfGeneration(currentInvoiceId);
        }
      });
    }
  };

  const handleOpenWhatsAppModal = () => {
    setTempWaNumber(data.client.whatsapp || data.client.phone || '');
    setIsWhatsAppModalOpen(true);
  };

  const executeWhatsAppShare = () => {
    if (!tempWaNumber) {
      showToast('Informe um número de WhatsApp válido.', 'error');
      return;
    }
    const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
    const totalTaxes = (Object.values(data.taxes) as number[]).reduce((a, b) => a + b, 0);
    const total = subtotal - totalTaxes - data.discount;
    let message = waTemplate
      .replace('{cliente}', data.client.name)
      .replace('{valor}', formatCurrency(total))
      .replace('{numero}', data.invoiceNumber)
      .replace('{link}', lastGeneratedPdfUrl || '(Link expirado ou não gerado)');
    const phone = tempWaNumber.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setIsWhatsAppModalOpen(false);
  };

  const saveGlobalSettings = async () => {
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        name: data.provider.name,
        trading_name: data.provider.tradingName,
        tax_id: data.provider.taxId,
        im: data.provider.im,
        ie: data.provider.ie,
        street: data.provider.street,
        number: data.provider.number,
        complement: data.provider.complement,
        neighborhood: data.provider.neighborhood,
        zip_code: data.provider.zipCode,
        city: data.provider.city,
        uf: data.provider.uf,
        email: data.provider.email,
        phone: data.provider.phone,
        pix_key: data.provider.pixKey,
        preferred_category: data.category,
        primary_color: data.branding.primaryColor,
        secondary_color: data.branding.secondaryColor,
        logo_letter: data.branding.logoLetter,
        logo_base64: data.branding.logoImage,
        template: data.branding.template,
        whatsapp_template: waTemplate,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      showToast('Configurações salvas globalmente.', 'success');
      triggerButtonFeedback('save-pattern-btn');
    } catch (error: any) {
      console.error("Erro no Supabase:", error);
      const isMissingColumn = error.message?.includes('column') || error.code === '42703';
      showToast(isMissingColumn ? 'Erro: Colunas faltando no banco. Execute o SQL de migração.' : 'Erro ao salvar configurações.', 'error');
    }
  };

  const handleSaveClient = async () => {
    const entity = data.client;
    if(!entity.name || !entity.taxId) {
        showToast('Nome e Documento são obrigatórios para salvar.', 'error');
        return;
    }
    try {
      const { error } = await supabase.from('clients').upsert({
        user_id: session.user.id,
        name: entity.name,
        trading_name: entity.tradingName,
        tax_id: entity.taxId,
        im: entity.im,
        ie: entity.ie,
        street: entity.street,
        number: entity.number,
        complement: entity.complement,
        neighborhood: entity.neighborhood,
        zip_code: entity.zipCode,
        city: entity.city,
        uf: entity.uf,
        email: entity.email,
        phone: entity.phone,
        whatsapp: entity.whatsapp,
        pix_key: entity.pixKey
      }, { onConflict: 'user_id, tax_id' });
      if (error) throw error;
      loadClients();
      showToast('Cliente atualizado na base de dados.', 'success');
      triggerButtonFeedback('save-client-btn');
    } catch (error: any) {
      console.error("Erro no Supabase:", error);
      const isConstraintError = error.code === '42P10' || error.message?.includes('constraint');
      showToast(isConstraintError ? 'Erro: Restrição de unicidade faltando. Execute o SQL de migração.' : 'Erro ao salvar cliente.', 'error');
    }
  };

  const triggerButtonFeedback = (id: string, successText: string = "CONCLUÍDO!") => {
    const btn = document.getElementById(id);
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = successText;
      btn.style.backgroundColor = '#16a34a'; 
      setTimeout(() => { btn.innerText = originalText; btn.style.backgroundColor = ''; }, 2000);
    }
  };

  const handleNewDocument = () => {
    let nextNum = '001';
    if (history.length > 0) {
      const lastNum = parseInt(history[0].data.invoiceNumber);
      nextNum = String(isNaN(lastNum) ? 1 : lastNum + 1).padStart(3, '0');
    }
    setData(prev => ({ ...INITIAL_DATA, category: prev.category, invoiceNumber: nextNum, provider: prev.provider, branding: prev.branding }));
    setLastGeneratedPdfUrl(null);
    setCurrentInvoiceId(null);
    setView('editor');
    setActiveTab('edit');
  };

  const handleDuplicate = (item: InvoiceHistoryItem) => {
    let nextNum = '001';
    if (history.length > 0) {
      const lastNum = parseInt(history[0].data.invoiceNumber);
      nextNum = String(isNaN(lastNum) ? 1 : lastNum + 1).padStart(3, '0');
    }
    setData({
      ...item.data,
      invoiceNumber: nextNum,
      issueDate: new Date().toISOString().split('T')[0],
      pdfUrl: undefined
    });
    setLastGeneratedPdfUrl(null);
    setCurrentInvoiceId(null);
    setView('editor');
    setActiveTab('edit');
    showToast('Documento duplicado com novo número sugerido.', 'success');
  };

  const toggleCategory = (cat: InvoiceCategory) => {
    setData(prev => {
      const newLabels = { ...prev.labels };
      if (cat === 'product') {
        newLabels.documentTitle = 'Recibo de Venda de Produtos';
        newLabels.documentSubtitle = 'Faturamento de Mercadorias e Bens';
        newLabels.itemsSection = 'Discriminação das Mercadorias Vendidas';
      } else {
        newLabels.documentTitle = 'Recibo de Prestação de Serviços';
        newLabels.documentSubtitle = 'Faturamento de Serviços Profissionais';
        newLabels.itemsSection = 'Discriminação dos Serviços Prestados';
      }
      return { ...prev, category: cat, labels: newLabels };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateBranding('logoImage', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateProvider = (field: keyof Entity, value: string) => setData(prev => ({ ...prev, provider: { ...prev.provider, [field]: value } }));
  const updateClient = (field: keyof Entity, value: string) => setData(prev => ({ ...prev, client: { ...prev.client, [field]: value } }));
  const updateBranding = (field: keyof Branding, value: string) => setData(prev => ({ ...prev, branding: { ...prev.branding, [field]: value } }));

  if (!session) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row p-6 md:p-12 relative overflow-hidden items-center justify-center gap-10 md:gap-20">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/5 blur-[150px] rounded-full bg-orb pointer-events-none"></div>
        <div className="w-full max-w-2xl space-y-12 z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Invoice V3.5</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9]">Faturamento inteligente e <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">minimalista.</span></h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-lg">Gere notas premium para serviços ou produtos e controle seu teto MEI de forma automática.</p>
        </div>
        <div className="w-full max-w-md z-10">
          <div className="bg-[#0f172a]/80 backdrop-blur-3xl p-10 md:p-14 rounded-[3.5rem] border border-white/10 shadow-2xl relative">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-xl shadow-blue-600/30">
                <span className="text-white text-4xl font-black">N</span>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight">{authMode === 'login' ? 'Bem-vindo de volta' : 'Portal do Prestador'}</h3>
            </div>
            <form onSubmit={handleAuth} className="space-y-8">
              {authMode === 'signup' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full px-7 py-5 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="Ada Lovelace" />
                </div>
              )}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-7 py-5 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="ada@empresa.vgr" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                <input type="password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full px-7 py-5 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="••••••••••••" />
              </div>
              <button disabled={isLoggingIn} type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20">
                {isLoggingIn ? 'Autenticando...' : (authMode === 'login' ? 'Entrar no Sistema' : 'Cadastrar Perfil')}
              </button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-10 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-blue-400">
              {authMode === 'login' ? 'Não possui conta? Cadastre-se' : 'Já possui conta? Faça Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-x-hidden font-['Inter']">
      <div className="fixed top-[-10%] left-[-5%] w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none bg-orb"></div>
      
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="fixed top-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-3xl border shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300 ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
            'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
            <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        ))}
      </div>

      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-[#0f172a] w-full max-w-md rounded-[2.5rem] border border-white/10 p-10 space-y-8 shadow-2xl">
              <header className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">Enviar WhatsApp</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Destino do faturamento</p>
              </header>
              <div className="space-y-6">
                <InputGroup label="WhatsApp" value={tempWaNumber} onChange={(e) => setTempWaNumber(e.target.value)} />
                <div className={`p-4 rounded-2xl border ${lastGeneratedPdfUrl ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                   <p className={`text-[11px] font-bold ${lastGeneratedPdfUrl ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {lastGeneratedPdfUrl ? 'Link pronto.' : 'Gere o PDF primeiro.'}
                   </p>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={() => setIsWhatsAppModalOpen(false)} className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                 <button onClick={executeWhatsAppShare} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20">Abrir WhatsApp</button>
              </div>
           </div>
        </div>
      )}

      <ClientSearchModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} clients={savedClients} 
        onSelect={(c) => { setData(prev => ({ ...prev, client: c })); setIsModalOpen(false); }} 
        onDelete={async (tid) => { await supabase.from('clients').delete().match({ user_id: session.user.id, tax_id: tid }); loadClients(); }} 
      />

      {view === 'landing' ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center z-10 relative">
          <div className="absolute top-8 right-8"><button onClick={handleLogout} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest">Sair</button></div>
          <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] mx-auto mb-10 flex items-center justify-center shadow-2xl shadow-blue-600/20"><span className="text-white text-5xl font-black">N</span></div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">NovaInvoice</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px] mb-16">Ecossistema de Faturamento MEI</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
            <button onClick={handleNewDocument} className="p-10 md:p-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl hover:border-blue-500/50 transition-all text-left group">
              <div className="w-16 h-16 bg-white/5 rounded-2xl mb-8 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
              <h3 className="text-2xl font-black mb-3">Nova Emissão</h3><p className="text-slate-400 text-sm">Faturamento para Serviços ou Produtos</p>
            </button>
            <button onClick={() => setView('history')} className="p-10 md:p-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl hover:border-blue-500/50 transition-all text-left group">
              <div className="w-16 h-16 bg-white/5 rounded-2xl mb-8 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
              <h3 className="text-2xl font-black mb-3">Histórico Cloud</h3><p className="text-slate-400 text-sm">Controle central de documentos</p>
            </button>
          </div>
        </div>
      ) : (view === 'history') ? (
        <div className="min-h-screen p-6 md:p-16 z-10 relative">
          <div className="max-w-6xl mx-auto space-y-16">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
              <div>
                <button onClick={() => setView('landing')} className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4 flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Console Principal
                </button>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Histórico <span className="text-slate-500">Global</span></h1>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setView('mei-report')} className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Relatório DASN</button>
                 <button onClick={handleNewDocument} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all">Nova Emissão</button>
              </div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-[#0f172a]/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-10">
                    <div><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Teto Anual MEI</h4><p className="text-5xl font-black text-white tracking-tighter">R$ 81.000,00</p></div>
                    <div className="text-right"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Utilizado</h4><p className="text-2xl font-black text-blue-400 tracking-tight">{Math.round(dashboardMetrics.progress)}%</p></div>
                  </div>
                  <div className="space-y-4">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out" style={{ width: `${dashboardMetrics.progress}%` }}></div></div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-slate-500">Acumulado: {formatCurrency(dashboardMetrics.totalAnnual)}</span><span className="text-blue-400">Restante: {formatCurrency(dashboardMetrics.remainingMei)}</span></div>
                  </div>
               </div>
            </div>
            <div className="space-y-6">
              {history.length === 0 ? (
                <div className="text-center py-32 bg-white/5 rounded-[4rem] border border-dashed border-white/10 text-slate-500 font-black uppercase tracking-widest text-xs">Sem documentos no sistema</div>
              ) : history.map(item => (
                <div key={item.id} className="group bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-[3rem] flex flex-col md:flex-row md:items-center justify-between hover:border-blue-500/50 hover:bg-white/[0.07] transition-all gap-6 shadow-2xl">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all uppercase text-[10px]">
                       {item.category === 'product' ? '📦' : '⚡'}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-xl uppercase tracking-tight">{item.clientName}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>DOC #{item.data.invoiceNumber} • {item.category === 'product' ? 'PRODUTO' : 'SERVIÇO'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right"><span className="font-black text-2xl text-white tracking-tighter block">{formatCurrency(item.totalValue)}</span></div>
                    <div className="flex gap-2">
                      {item.pdfUrl && (<a href={item.pdfUrl} target="_blank" rel="noreferrer" className="px-4 py-4 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-2xl hover:bg-blue-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest">PDF</a>)}
                      <button onClick={() => { setData(item.data); setCurrentInvoiceId(item.id); setLastGeneratedPdfUrl(item.pdfUrl || null); setView('editor'); }} className="px-6 py-4 bg-white/5 text-slate-400 border border-white/10 rounded-2xl hover:bg-white/10 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest">Abrir</button>
                      <button onClick={() => handleDuplicate(item)} title="Duplicar" className="px-4 py-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (view === 'mei-report') ? (
        <div className="min-h-screen p-6 md:p-16 z-10 relative">
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 no-print">
              <div>
                <button onClick={() => setView('history')} className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4 flex items-center gap-2">Voltar</button>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Relatório <span className="text-slate-500">DASN-SIMEI</span></h1>
              </div>
              <div className="flex items-center gap-4">
                 <select value={selectedReportYear} onChange={(e) => setSelectedReportYear(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest">
                   {availableYears.map(y => <option key={y} value={y} className="bg-[#0f172a]">{y}</option>)}
                 </select>
                 <button onClick={handleExportReportPdf} disabled={isExportingReport} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                    {isExportingReport ? 'Gerando...' : 'Exportar PDF'}
                 </button>
              </div>
            </header>

            <div ref={reportRef} className="bg-[#0f172a] rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl p-10 md:p-14 space-y-12">
               <div className="flex justify-between items-center pb-8 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl">N</div>
                    <h2 className="text-2xl font-black tracking-tighter">Declaração Auxiliar de Faturamento</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano Base</p>
                    <p className="text-2xl font-black">{selectedReportYear}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-white/5 pb-12">
                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Totais para Declaração Oficial</h3>
                     <div className="p-8 bg-blue-600/10 border border-blue-600/20 rounded-[2rem] space-y-6">
                        <div>
                           <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">I - Receita de Comércio / Indústria</span>
                           <p className="text-2xl font-black text-white">{formatCurrency(reportData.totalYearProduct)}</p>
                        </div>
                        <div>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">II - Receita de Prestação de Serviços</span>
                           <p className="text-2xl font-black text-white">{formatCurrency(reportData.totalYearService)}</p>
                        </div>
                        <div className="pt-4 border-t border-blue-600/20">
                           <span className="text-[9px] font-black text-white uppercase tracking-widest block mb-2">Receita Bruta Total</span>
                           <p className="text-3xl font-black text-white">{formatCurrency(reportData.totalYear)}</p>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-6 flex flex-col justify-center">
                     <div className="p-6 bg-white/5 border border-white/5 rounded-3xl">
                        <h4 className="text-sm font-black text-white mb-2 tracking-tight">Observação para Declaração</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">O campo "I" deve ser preenchido com as vendas de mercadorias. O campo "II" com as prestações de serviços. A soma total já considera todos os documentos emitidos neste ano base.</p>
                     </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Detalhamento Mensal Separado</h3>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="border-b border-white/5 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                              <th className="py-5 px-4">Mês Referência</th>
                              <th className="py-5 px-4 text-right">Comércio (R$)</th>
                              <th className="py-5 px-4 text-right">Serviço (R$)</th>
                              <th className="py-5 px-4 text-right">Total (R$)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {reportData.months.map(m => (
                              <tr key={m.month} className="group hover:bg-white/5 transition-colors text-xs">
                                 <td className="py-6 px-4 font-black uppercase text-white">{m.name}</td>
                                 <td className="py-6 px-4 text-right text-slate-400">{formatCurrency(m.totalProduct)}</td>
                                 <td className="py-6 px-4 text-right text-slate-400">{formatCurrency(m.totalService)}</td>
                                 <td className="py-6 px-4 text-right font-black text-white">{formatCurrency(m.total)}</td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot>
                           <tr className="bg-white/5 font-black text-sm">
                              <td className="py-8 px-4 uppercase text-[10px] tracking-widest text-slate-400">Total Consolidado</td>
                              <td className="py-8 px-4 text-right text-white">{formatCurrency(reportData.totalYearProduct)}</td>
                              <td className="py-8 px-4 text-right text-white">{formatCurrency(reportData.totalYearService)}</td>
                              <td className="py-8 px-4 text-right text-xl text-blue-400">{formatCurrency(reportData.totalYear)}</td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col lg:flex-row relative z-10">
          <div className="no-print w-full lg:w-[500px] bg-[#0f172a]/60 backdrop-blur-3xl border-r border-white/10 lg:h-screen lg:overflow-y-auto p-6 md:p-10 space-y-10 scrollbar-hide">
            <header className="flex flex-col gap-6 mb-10">
              <div className="flex justify-between items-center">
                <button onClick={() => setView('landing')} className="text-blue-400 font-black tracking-tighter text-2xl uppercase">NovaInvoice</button>
                <div className="flex gap-2">
                  <button onClick={() => setView('history')} title="Dashboard" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                  <button onClick={() => setView('landing')} title="Cancelar Emissão" className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
              {currentInvoiceId && (
                <div className="bg-blue-600 px-6 py-3 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Modo de Edição: Doc #{data.invoiceNumber}</span>
                  </div>
                  <button onClick={handleNewDocument} className="text-[9px] font-black text-white/70 hover:text-white uppercase tracking-widest border-b border-white/30">Novo Doc</button>
                </div>
              )}
            </header>

            <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CATEGORIA DO DOCUMENTO</h3>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => toggleCategory('service')} 
                   className={`flex items-center justify-center gap-3 py-5 rounded-[1.5rem] border font-black text-[11px] uppercase tracking-widest transition-all ${data.category === 'service' ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}
                 >
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                   Serviço
                 </button>
                 <button 
                   onClick={() => toggleCategory('product')} 
                   className={`flex items-center justify-center gap-3 py-5 rounded-[1.5rem] border font-black text-[11px] uppercase tracking-widest transition-all ${data.category === 'product' ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}
                 >
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                   Comércio
                 </button>
              </div>
            </section>

            <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-8 relative">
              <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IDENTIDADE VISUAL</h3><button id="save-pattern-btn" onClick={saveGlobalSettings} className="text-[10px] font-black px-6 py-2 bg-blue-600 text-white rounded-2xl shadow-lg hover:scale-105 transition-all">Salvar</button></div>
              <div className="grid grid-cols-3 gap-3">{(['classic', 'modern', 'minimal'] as const).map(t => (<button key={t} onClick={() => updateBranding('template', t)} className={`py-4 text-[10px] font-black uppercase rounded-2xl border transition-all ${data.branding.template === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}>{t === 'classic' ? 'RETRÔ' : t === 'modern' ? 'NOVO' : 'MINI'}</button>))}</div>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center overflow-hidden relative group shrink-0 shadow-2xl">
                  {data.branding.logoImage ? <img src={data.branding.logoImage} className="w-full h-full object-contain p-4" /> : <span className="text-5xl font-black text-slate-800">{data.branding.logoLetter}</span>}
                  <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity" onClick={() => fileInputRef.current?.click()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black w-full py-4 bg-white/5 border border-white/10 rounded-2xl uppercase tracking-widest hover:bg-white/10 transition-all">ALTERAR IMAGEM</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">COR DE FUNDO</label><div className="p-1.5 bg-white border border-white/10 rounded-2xl flex items-center h-16"><input type="color" value={data.branding.primaryColor} onChange={(e) => updateBranding('primaryColor', e.target.value)} className="w-full h-full rounded-xl cursor-pointer border-0 bg-transparent p-0 overflow-hidden" /></div></div>
                <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">COR DETALHE</label><div className="p-1.5 bg-white border border-white/10 rounded-2xl flex items-center h-16"><input type="color" value={data.branding.secondaryColor} onChange={(e) => updateBranding('secondaryColor', e.target.value)} className="w-full h-full rounded-xl cursor-pointer border-0 bg-transparent p-0 overflow-hidden" /></div></div>
              </div>
            </section>
            
            <section className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cronologia e Identificação</h3>
              <div className="grid grid-cols-2 gap-5"><InputGroup label="Número Doc" value={data.invoiceNumber} onChange={(e) => setData({...data, invoiceNumber: e.target.value})} /><InputGroup label="Série" value={data.serie} onChange={(e) => setData({...data, serie: e.target.value})} /><InputGroup label="Emissão" type="date" value={data.issueDate} onChange={(e) => setData({...data, issueDate: e.target.value})} /><InputGroup label="Mês Ref." value={data.competency} onChange={(e) => setData({...data, competency: e.target.value})} /></div>
            </section>

            <EntityForm title="Dados do Emitente (Você)" entity={data.provider} updateFn={updateProvider} isProvider />
            <EntityForm title="Dados do Cliente" entity={data.client} updateFn={updateClient} isClient onSearch={() => setIsModalOpen(true)} onSave={handleSaveClient} saveButtonId="save-client-btn" />

            <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ITENS DO DOCUMENTO</h3><button onClick={() => setData(prev => ({ ...prev, items: [...prev.items, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitValue: 0, unit: 'un' }] }))} className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full">Add</button></div>
              {data.items.map(item => (
                <div key={item.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl relative space-y-4">
                  <InputGroup label="Descrição" value={item.description} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, description: e.target.value} : i)})} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Quantidade" type="number" value={item.quantity} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, quantity: parseFloat(e.target.value) || 0} : i)})} />
                    <InputGroup label="Valor Unit." type="number" value={item.unitValue} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, unitValue: parseFloat(e.target.value) || 0} : i)})} />
                  </div>
                  {data.category === 'product' && (
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Unidade (Ex: kg, un)" value={item.unit || ''} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, unit: e.target.value} : i)})} />
                      <InputGroup label="Código NCM" value={item.ncm || ''} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, ncm: e.target.value} : i)})} />
                    </div>
                  )}
                </div>
              ))}
            </section>

            <section className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 pb-12">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Impostos e Adicionais</h3>
              <div className="grid grid-cols-3 gap-3">
                {data.category === 'service' ? (
                  <InputGroup label="ISS %" type="number" value={data.taxRate} onChange={(e) => setData({...data, taxRate: parseFloat(e.target.value) || 0})} />
                ) : (
                  <InputGroup label="ICMS (est.) %" type="number" value={data.taxRate} onChange={(e) => setData({...data, taxRate: parseFloat(e.target.value) || 0})} />
                )}
                <InputGroup label="Outras Ret. R$" type="number" value={data.taxes.others} onChange={(e) => setData({...data, taxes: {...data.taxes, others: parseFloat(e.target.value) || 0}})} />
                <InputGroup label="Desconto R$" type="number" value={data.discount} onChange={(e) => setData({...data, discount: parseFloat(e.target.value) || 0})} />
              </div>
              
              {data.category === 'service' ? (
                <InputGroup label="Código Municipal de Serviço" value={data.serviceCode} onChange={(e) => setData({...data, serviceCode: e.target.value})} />
              ) : (
                <InputGroup label="CFOP / Natureza da Operação" value={data.serviceCode} onChange={(e) => setData({...data, serviceCode: e.target.value})} placeholder="Ex: 5.102 - Venda de mercadoria" />
              )}
              
              <InputGroup label="CNAE Correspondente" value={data.cnae} onChange={(e) => setData({...data, cnae: e.target.value})} />
              <InputGroup label="Observações do Documento" isTextArea value={data.notes} onChange={(e) => setData({...data, notes: e.target.value})} />
            </section>

            <div className="bg-[#020617]/95 pt-8 pb-12 sticky bottom-0 z-20 border-t border-white/10 flex flex-col gap-4">
              <div className="grid grid-cols-12 gap-3">
                <button disabled={isEmitting} onClick={handlePrint} className={`col-span-8 py-6 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all ${isEmitting ? 'opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20'}`}>{isEmitting ? 'Sincronizando...' : (currentInvoiceId ? 'Atualizar' : 'Gerar PDF')}</button>
                <button onClick={handleOpenWhatsAppModal} className="col-span-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center transition-all active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
              </div>
            </div>
          </div>
          <main className={`flex-1 overflow-x-hidden lg:overflow-y-auto p-4 md:p-16 flex justify-center items-start bg-transparent no-print scrollbar-hide`}>
            <div className="w-full max-w-[900px] flex justify-center"><div className="origin-top scale-[0.4] sm:scale-[0.6] lg:scale-[0.8] xl:scale-100 transition-all duration-500"><div ref={invoiceRef} className="shadow-[0_48px_100px_-24px_rgba(0,0,0,0.8)]"><InvoicePreview data={data} /></div></div></div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
