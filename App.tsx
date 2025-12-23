
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InvoiceData, InvoiceItem, InvoiceLabels, Branding, Entity, InvoiceHistoryItem } from './types';
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
};

const INITIAL_PROVIDER: Entity = {
  ...EMPTY_ENTITY,
  name: '',
  taxId: '',
  email: '',
};

const INITIAL_DATA: InvoiceData = {
  invoiceNumber: '001',
  serie: '1',
  issueDate: new Date().toISOString().split('T')[0],
  competency: new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric' }).format(new Date()),
  provider: INITIAL_PROVIDER,
  client: { ...EMPTY_ENTITY },
  items: [{ id: '1', description: 'Consultoria Especializada', quantity: 1, unitValue: 0 }],
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
  onSearch?: () => void;
  onSave?: () => void;
  saveButtonId?: string;
}

const EntityForm: React.FC<EntityFormProps> = ({ 
  title, 
  entity, 
  updateFn, 
  isClient = false,
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
    <InputGroup label="Nome / Razão Social" value={entity.name} onChange={(e) => updateFn('name', e.target.value)} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <InputGroup label="CPF / CNPJ" value={entity.taxId} onChange={(e) => updateFn('taxId', e.target.value)} />
      <InputGroup label="Telefone Fixo / Comercial" value={entity.phone} onChange={(e) => updateFn('phone', e.target.value)} />
    </div>
    {isClient && (
      <InputGroup 
        label="WhatsApp de Cobrança (Celular)" 
        value={entity.whatsapp || ''} 
        onChange={(e) => updateFn('whatsapp', e.target.value)} 
        placeholder="Ex: 11999999999" 
      />
    )}
    <InputGroup label="E-mail" value={entity.email} onChange={(e) => updateFn('email', e.target.value)} />
    
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
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [tempWaNumber, setTempWaNumber] = useState('');
  const [lastGeneratedPdfUrl, setLastGeneratedPdfUrl] = useState<string | null>(null);
  
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
    const { data: profile } = await supabase.from('profiles').select('*').single();
    if (profile) {
      if (profile.whatsapp_template) setWaTemplate(profile.whatsapp_template);
      setData(prev => ({
        ...prev,
        provider: {
          ...prev.provider,
          name: profile.name || prev.provider.name,
          taxId: profile.tax_id || prev.provider.taxId,
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
          template: profile.template || INITIAL_BRANDING.template,
        }
      }));
    }
  };

  const loadClients = async () => {
    const { data: clients } = await supabase.from('clients').select('*').order('name');
    if (clients) {
      setSavedClients(clients.map(c => ({
        name: c.name || '',
        taxId: c.tax_id || '',
        street: c.street || '',
        number: c.number || '',
        complement: c.complement || '',
        neighborhood: c.neighborhood || '',
        zipCode: c.zip_code || '',
        city: c.city || '',
        uf: c.uf || '',
        email: c.email || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || ''
      })));
    }
  };

  const loadHistory = async () => {
    const { data: invoices } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (invoices) {
      setHistory(invoices.map(inv => ({
        id: inv.id,
        timestamp: new Date(inv.created_at).getTime(),
        data: {
          ...inv.full_data,
          pdfUrl: inv.pdf_url // Garante que o estado carregado tenha a URL mais recente do banco
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
    
    // O full_data agora recebe a versão encurtada da URL para consistência interna
    const payload = {
      user_id: session.user.id,
      client_name: data.client.name,
      invoice_number: data.invoiceNumber,
      total_value: total,
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
      
      // Sincroniza o estado local IMEDIATAMENTE com a URL encurtada
      const updatedData = { ...data, pdfUrl: finalUrl || undefined };
      setData(updatedData);
      setLastGeneratedPdfUrl(finalUrl);

      // Salva no banco passando os dados já atualizados com a URL curta
      await saveToHistory(finalUrl, targetId, updatedData);
      showToast('Documento processado e salvo no histórico.', 'success');
    } catch (error) { 
        showToast("Erro crítico ao gerar PDF.", 'error'); 
    } finally { 
        setIsEmitting(false); 
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
        message: `Você está editando o documento #${data.invoiceNumber}. O registro atual no histórico será atualizado com esta nova versão do PDF encurtado.`,
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
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      name: data.provider.name,
      tax_id: data.provider.taxId,
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
      primary_color: data.branding.primaryColor,
      secondary_color: data.branding.secondaryColor,
      logo_letter: data.branding.logoLetter,
      logo_base64: data.branding.logoImage,
      template: data.branding.template,
      whatsapp_template: waTemplate,
      updated_at: new Date().toISOString()
    });
    if (error) showToast('Erro ao sincronizar configurações.', 'error');
    else {
        showToast('Configurações salvas globalmente.', 'success');
        triggerButtonFeedback('save-pattern-btn');
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
        tax_id: entity.taxId,
        street: entity.street,
        number: entity.number,
        complement: entity.complement,
        neighborhood: entity.neighborhood,
        zip_code: entity.zip_code,
        city: entity.city,
        uf: entity.uf,
        email: entity.email,
        phone: entity.phone,
        whatsapp: entity.whatsapp
      }, { onConflict: 'user_id, tax_id' });
      if (error) throw error;
      loadClients();
      showToast('Cliente atualizado na base de dados.', 'success');
      triggerButtonFeedback('save-client-btn');
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      showToast(`Erro ao salvar cliente.`, 'error');
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
    setData(prev => ({ ...INITIAL_DATA, invoiceNumber: nextNum, provider: prev.provider, branding: prev.branding }));
    setLastGeneratedPdfUrl(null);
    setCurrentInvoiceId(null);
    setView('editor');
    setActiveTab('edit');
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

        <div className="w-full max-w-2xl space-y-12 z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Invoice V3.2</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9]">Faturamento inteligente e <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">minimalista.</span></h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-lg">Gere notas fiscais premium e controle seu teto MEI em uma interface projetada para a máxima performance visual.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pt-10">
            <div><p className="text-3xl font-black text-white tracking-tight">R$ 81k</p><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Limite MEI</p></div>
            <div><p className="text-3xl font-black text-white tracking-tight">Cloud</p><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Base de Clientes</p></div>
            <div><p className="text-3xl font-black text-white tracking-tight">PDF</p><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Emissão Instantânea</p></div>
          </div>
        </div>

        <div className="w-full max-w-md z-10">
          <div className="bg-[#0f172a]/80 backdrop-blur-3xl p-10 md:p-14 rounded-[3.5rem] border border-white/10 shadow-2xl relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 blur-3xl rounded-full"></div>
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-xl shadow-blue-600/30">
                <span className="text-white text-4xl font-black">N</span>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight">{authMode === 'login' ? 'Bem-vindo de volta' : 'Portal do Prestador'}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">Acesso de Segurança</p>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Segurança</label>
                <input type="password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full px-7 py-5 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder="••••••••••••" />
              </div>
              <button disabled={isLoggingIn} type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                {isLoggingIn ? 'Autenticando...' : (authMode === 'login' ? 'Entrar no Sistema' : 'Cadastrar Perfil')}
              </button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-10 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-blue-400 transition-colors">
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
                <h2 className="text-2xl font-black text-white tracking-tight">Enviar via WhatsApp</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Selecione ou edite o número de destino</p>
              </header>
              <div className="space-y-6">
                <InputGroup label="Número de WhatsApp" value={tempWaNumber} onChange={(e) => setTempWaNumber(e.target.value)} placeholder="Ex: 11999999999" />
                {data.client.phone && data.client.phone !== tempWaNumber && (
                  <button onClick={() => setTempWaNumber(data.client.phone)} className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    Usar Telefone da Nota ({data.client.phone})
                  </button>
                )}
                <div className={`p-4 rounded-2xl border ${lastGeneratedPdfUrl ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                   <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Status do Documento</span>
                   <p className={`text-[11px] font-bold ${lastGeneratedPdfUrl ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {lastGeneratedPdfUrl ? 'Link encurtado pronto para envio.' : 'Link ausente. Gere o PDF primeiro.'}
                   </p>
                   {lastGeneratedPdfUrl && (
                     <div className="mt-3 flex flex-col gap-2">
                        <span className="text-[9px] text-slate-500 font-mono break-all bg-black/20 p-2 rounded-lg">{lastGeneratedPdfUrl}</span>
                        <a href={lastGeneratedPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[9px] font-black text-white bg-white/10 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/20 transition-all uppercase tracking-widest w-fit">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          Visualizar Arquivo
                        </a>
                     </div>
                   )}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={() => setIsWhatsAppModalOpen(false)} className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                 <button onClick={executeWhatsAppShare} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 transition-all">Abrir WhatsApp</button>
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
          <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px] mb-16">Console de Faturamento Cloud</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
            <button onClick={handleNewDocument} className="p-10 md:p-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl hover:border-blue-500/50 transition-all text-left group">
              <div className="w-16 h-16 bg-white/5 rounded-2xl mb-8 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
              <h3 className="text-2xl font-black mb-3">Nova Fatura</h3><p className="text-slate-400 text-sm">Faturamento premium em tempo real</p>
            </button>
            <button onClick={() => setView('history')} className="p-10 md:p-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl hover:border-blue-500/50 transition-all text-left group">
              <div className="w-16 h-16 bg-white/5 rounded-2xl mb-8 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
              <h3 className="text-2xl font-black mb-3">Meus Registros</h3><p className="text-slate-400 text-sm">Controle histórico centralizado</p>
            </button>
          </div>
        </div>
      ) : (view === 'history' || view === 'mei-report') ? (
        <div className="min-h-screen p-6 md:p-16 z-10 relative">
          <div className="max-w-6xl mx-auto space-y-16">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
              <div>
                <button onClick={() => setView('landing')} className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-4 flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Voltar ao Console
                </button>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Faturamento <span className="text-slate-500">Cloud</span></h1>
              </div>
              <div className="flex gap-4"><button onClick={handleNewDocument} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all">Nova Emissão</button></div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-[#0f172a]/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                  <div className="flex justify-between items-start mb-10">
                    <div><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Teto Anual MEI</h4><p className="text-5xl font-black text-white tracking-tighter">R$ 81.000,00</p></div>
                    <div className="text-right"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Utilizado</h4><p className="text-2xl font-black text-blue-400 tracking-tight">{Math.round(dashboardMetrics.progress)}%</p></div>
                  </div>
                  <div className="space-y-4">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out" style={{ width: `${dashboardMetrics.progress}%` }}></div></div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-slate-500">Acumulado: {formatCurrency(dashboardMetrics.totalAnnual)}</span><span className="text-blue-400">Restante: {formatCurrency(dashboardMetrics.remainingMei)}</span></div>
                  </div>
                  <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-8">
                     <div><span className="text-[9px] font-black text-slate-600 uppercase block tracking-widest mb-2">Faturamento Mensal</span><p className="text-xl font-black text-white">{formatCurrency(dashboardMetrics.totalMonthly)}</p></div>
                     <div><span className="text-[9px] font-black text-slate-600 uppercase block tracking-widest mb-2">Ticket Médio</span><p className="text-xl font-black text-white">{formatCurrency(dashboardMetrics.avgTicket)}</p></div>
                     <div className="hidden md:block"><span className="text-[9px] font-black text-slate-600 uppercase block tracking-widest mb-2">Total Emissões</span><p className="text-xl font-black text-white">{dashboardMetrics.yearItemsCount} un</p></div>
                  </div>
               </div>
               <div className="bg-[#0f172a]/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                  <div>
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
                    <h3 className="text-xl font-black text-white mb-2">Projeção MEI</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">Com base no seu histórico anual, você está operando dentro da conformidade fiscal estabelecida para 2024.</p>
                  </div>
                  <div className="mt-8"><div className="flex items-center gap-3 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Status: Saudável</span></div></div>
               </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-8 px-4"><h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Emissões Recentes</h3><span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{history.length} Documentos Totais</span></div>
              {history.length === 0 ? (
                <div className="text-center py-32 bg-white/5 rounded-[4rem] border border-dashed border-white/10 text-slate-500 font-black uppercase tracking-widest text-xs">Sem emissões registradas no sistema</div>
              ) : history.map(item => (
                <div key={item.id} className="group bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-[3rem] flex flex-col md:flex-row md:items-center justify-between hover:border-blue-500/50 hover:bg-white/[0.07] transition-all gap-6 shadow-2xl">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all">#{item.data.invoiceNumber.slice(-2)}</div>
                    <div>
                      <h4 className="font-black text-white text-xl uppercase tracking-tight">{item.clientName}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>DOCUMENTO #{item.data.invoiceNumber} • {new Date(item.timestamp).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right"><span className="font-black text-2xl text-white tracking-tighter block">{formatCurrency(item.totalValue)}</span><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Líquido Recebido</span></div>
                    <div className="flex gap-3">
                      {item.pdfUrl && (<a href={item.pdfUrl} target="_blank" rel="noreferrer" className="px-5 py-5 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-2xl hover:bg-blue-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>PDF</a>)}
                      <button onClick={() => { setData(item.data); setCurrentInvoiceId(item.id); setLastGeneratedPdfUrl(item.pdfUrl || null); setView('editor'); }} className="px-8 py-5 bg-white/5 text-slate-400 border border-white/10 rounded-2xl hover:bg-white/10 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">Abrir</button>
                    </div>
                  </div>
                </div>
              ))}
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
                  <button onClick={() => setView('history')} title="Dashboard" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600 hover:border-blue-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                  <button onClick={() => setView('landing')} title="Cancelar" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 hover:border-red-500 transition-all text-slate-500 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
              </div>
              {currentInvoiceId && (<div className="bg-blue-600/10 border border-blue-600/30 px-5 py-3 rounded-2xl flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Modo Edição de Histórico</span></div><button onClick={handleNewDocument} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Criar Cópia</button></div>)}
            </header>
            <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-8 relative">
              <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IDENTIDADE VISUAL</h3><button id="save-pattern-btn" onClick={saveGlobalSettings} className="text-[10px] font-black px-6 py-2 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 hover:scale-105 transition-all">Salvar</button></div>
              <div className="grid grid-cols-3 gap-3">{(['classic', 'modern', 'minimal'] as const).map(t => (<button key={t} onClick={() => updateBranding('template', t)} className={`py-4 text-[10px] font-black uppercase rounded-2xl border transition-all ${data.branding.template === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}>{t === 'classic' ? 'RETRÔ' : t === 'modern' ? 'NOVO' : 'MINI'}</button>))}</div>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center overflow-hidden relative group shrink-0 shadow-2xl">
                  {data.branding.logoImage ? <img src={data.branding.logoImage} className="w-full h-full object-contain p-4" /> : <span className="text-5xl font-black text-slate-800">{data.branding.logoLetter}</span>}
                  <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity" onClick={() => fileInputRef.current?.click()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black w-full py-4 bg-white/5 border border-white/10 rounded-2xl uppercase tracking-widest hover:bg-white/10 transition-all">ALTERAR IMAGEM</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">LETRA DA LOGO</label><input type="text" value={data.branding.logoLetter} onChange={(e) => updateBranding('logoLetter', e.target.value.substring(0,1).toUpperCase())} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all" /></div>
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
            <EntityForm title="Informações do Prestador" entity={data.provider} updateFn={updateProvider} />
            <section className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl"><InputGroup label="Chave PIX de Recebimento" value={data.provider.pixKey || ''} onChange={(e) => updateProvider('pixKey', e.target.value)} placeholder="Seu CPF, E-mail ou Celular" /></section>
            <EntityForm title="Tomador (Cliente)" entity={data.client} updateFn={updateClient} isClient onSearch={() => setIsModalOpen(true)} onSave={handleSaveClient} saveButtonId="save-client-btn" />
            <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configurações de Mensagem</h3><span className="text-[9px] px-2 py-1 bg-white/5 rounded-lg text-slate-600 font-bold uppercase">Template Global</span></div>
              <InputGroup label="Template da Mensagem" isTextArea value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} placeholder="Dica: use {cliente}, {valor}, {numero} e {link} para preenchimento automático." />
              <div className="grid grid-cols-4 gap-2">{['{cliente}', '{valor}', '{numero}', '{link}'].map(tag => (<button key={tag} onClick={() => setWaTemplate(prev => prev + ' ' + tag)} className="text-[9px] font-black text-slate-500 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">{tag}</button>))}</div>
            </section>
            <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Itens</h3><button onClick={() => setData(prev => ({ ...prev, items: [...prev.items, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitValue: 0 }] }))} className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full">Add</button></div>
              {data.items.map(item => (
                <div key={item.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl relative">
                  <InputGroup label="Descrição" value={item.description} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, description: e.target.value} : i)})} />
                  <div className="grid grid-cols-2 gap-4 mt-4"><InputGroup label="Qtd" type="number" value={item.quantity} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, quantity: parseFloat(e.target.value) || 0} : i)})} /><InputGroup label="Preço" type="number" value={item.unitValue} onChange={(e) => setData({...data, items: data.items.map(i => i.id === item.id ? {...i, unitValue: parseFloat(e.target.value) || 0} : i)})} /></div>
                </div>
              ))}
            </section>
            <section className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 pb-12">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Escopo e Fisco</h3>
              <div className="grid grid-cols-3 gap-3"><InputGroup label="ISS %" type="number" value={data.taxRate} onChange={(e) => setData({...data, taxRate: parseFloat(e.target.value) || 0})} /><InputGroup label="Outras Ret. R$" type="number" value={data.taxes.others} onChange={(e) => setData({...data, taxes: {...data.taxes, others: parseFloat(e.target.value) || 0}})} /><InputGroup label="Desconto R$" type="number" value={data.discount} onChange={(e) => setData({...data, discount: parseFloat(e.target.value) || 0})} /></div>
              <InputGroup label="Código Municipal" value={data.serviceCode} onChange={(e) => setData({...data, serviceCode: e.target.value})} /><InputGroup label="Atividade (CNAE)" value={data.cnae} onChange={(e) => setData({...data, cnae: e.target.value})} /><InputGroup label="Notas Adicionais" isTextArea value={data.notes} onChange={(e) => setData({...data, notes: e.target.value})} />
            </section>
            <div className="bg-[#020617]/95 pt-8 pb-12 sticky bottom-0 z-20 border-t border-white/10 flex flex-col gap-4">
              <div className="grid grid-cols-12 gap-3">
                <button disabled={isEmitting} onClick={handlePrint} className={`col-span-8 py-6 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all ${isEmitting ? 'opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20'}`}>{isEmitting ? 'Sincronizando...' : (currentInvoiceId ? 'Atualizar PDF' : 'Gerar PDF')}</button>
                <button onClick={handleOpenWhatsAppModal} className="col-span-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-emerald-600/20 transition-all active:scale-95" title="Enviar WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
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
