
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InvoiceData, InvoiceItem, InvoiceLabels, Branding, Entity, InvoiceHistoryItem, InvoiceCategory, Expense, DasPayment } from './types';
import { InputGroup } from './components/InputGroup';
import { InvoicePreview } from './components/InvoicePreview';
import { ClientSearchModal } from './components/ClientSearchModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { formatCurrency, formatDate } from './utils/formatters';
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

const LABEL_PRESETS: Record<string, Partial<InvoiceLabels>> = {
  recibo: {
    documentTitle: 'Recibo de Prestação de Serviços',
    documentSubtitle: 'Faturamento de Serviços Profissionais',
  },
  note: {
    documentTitle: 'Nota Fiscal de Serviços (RPS)',
    documentSubtitle: 'Documento Auxiliar de Faturamento',
  },
  fatura: {
    documentTitle: 'Fatura Comercial',
    documentSubtitle: 'Cobrança de Prestação de Contas',
  },
  orcamento: {
    documentTitle: 'Orçamento de Projeto',
    documentSubtitle: 'Proposta de Prestação de Serviços',
  }
};

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
  category: 'service',
  invoiceNumber: '001',
  serie: '1',
  issueDate: new Date().toISOString().split('T')[0],
  competency: new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric' }).format(new Date()),
  provider: INITIAL_PROVIDER,
  client: { ...EMPTY_ENTITY },
  items: [{ id: '1', description: 'Consultoria Especializada', quantity: 1, unitValue: 0, unit: 'UN' }],
  notes: 'Pagamento via PIX. Dados para faturamento inclusos no documento.',
  serviceCode: '01.07 - Suporte técnico e manutenção.',
  cnae: '6201-5/01 - Desenvolvimento de programas.',
  taxRate: 2.0,
  taxes: { inss: 0, ir: 0, pis: 0, cofins: 0, csll: 0, others: 0 },
  discount: 0,
  labels: INITIAL_LABELS,
  branding: INITIAL_BRANDING,
  whatsappMessage: 'Olá {{cliente}}! Segue o link do seu documento {{numero}} gerado pela {{empresa}} no valor de {{valor}}: {{link}}',
};

const EXPENSE_CATEGORIES = [
  { name: "Insumos e Mercadorias", icon: "📦" },
  { name: "Aluguel e Utilidades", icon: "🏠" },
  { name: "Tecnologia e Softwares", icon: "💻" },
  { name: "Marketing e Vendas", icon: "📣" },
  { name: "Equipamentos e Ferramentas", icon: "🛠️" },
  { name: "Logística e Transportes", icon: "🚚" },
  { name: "Serviços de Terceiros", icon: "🤝" },
  { name: "Impostos e Tributos", icon: "🏛️" },
  { name: "Educação e Desenvolvimento", icon: "📚" },
  { name: "Outras Despesas", icon: "📎" }
];

const shortenUrl = async (longUrl: string): Promise<string> => {
  try {
    const response = await fetch('https://spoo.me/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: `url=${encodeURIComponent(longUrl)}`,
    });
    if (response.ok) {
      const result = await response.json();
      return result.short_url || longUrl;
    }
    return longUrl; 
  } catch { return longUrl; }
};

interface EntityFormProps {
  title: string;
  entity: Entity;
  updateFn: (field: keyof Entity, value: string) => void;
  isClient?: boolean;
  onSearch?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

const EntityForm: React.FC<EntityFormProps> = ({ title, entity, updateFn, isClient = false, onSearch, onSave, isSaving = false }) => (
  <section className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h3>
      <div className="flex gap-2">
        {isClient && onSearch && (
          <button onClick={onSearch} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">Buscar</button>
        )}
        {onSave && (
          <button onClick={onSave} disabled={isSaving} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
    <div className="space-y-4">
      <InputGroup label="Nome / Razão Social" value={entity.name} onChange={(e) => updateFn('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <InputGroup label="CPF / CNPJ" value={entity.taxId} onChange={(e) => updateFn('taxId', e.target.value)} />
        <InputGroup label="Telefone" value={entity.phone} onChange={(e) => updateFn('phone', e.target.value)} />
      </div>
      <InputGroup label="E-mail" value={entity.email} onChange={(e) => updateFn('email', e.target.value)} />
      {isClient && <InputGroup label="WhatsApp" value={entity.whatsapp || ''} onChange={(e) => updateFn('whatsapp', e.target.value)} />}
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8"><InputGroup label="Logradouro" value={entity.street} onChange={(e) => updateFn('street', e.target.value)} /></div>
          <div className="col-span-4"><InputGroup label="Nº" value={entity.number} onChange={(e) => updateFn('number', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Cidade" value={entity.city} onChange={(e) => updateFn('city', e.target.value)} />
          <InputGroup label="UF" value={entity.uf} onChange={(e) => updateFn('uf', e.target.value)} />
        </div>
      </div>
    </div>
  </section>
);

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
type ViewState = 'landing' | 'editor' | 'history' | 'financial-hub';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewState>('landing');
  const [data, setData] = useState<InvoiceData>(INITIAL_DATA);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<Entity[]>([]);
  const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dasPayments, setDasPayments] = useState<DasPayment[]>([]);
  
  // States for History Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'service' | 'product'>('all');
  const [filterMonth, setFilterMonth] = useState('');

  // States for Expense Filters
  const [expFilterSearch, setExpFilterSearch] = useState('');
  const [expFilterCategory, setExpFilterCategory] = useState('all');
  const [expFilterMonth, setExpFilterMonth] = useState('');

  // States for Analytics/DASN Filters
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  // States for WhatsApp Hub
  const [whatsOverridePhone, setWhatsOverridePhone] = useState('');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Insumos e Mercadorias', date: new Date().toISOString().split('T')[0] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [financialTab, setFinancialTab] = useState<'das' | 'expenses' | 'analytics'>('das');
  const [editorActiveTab, setEditorActiveTab] = useState<'form' | 'preview'>('form');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const invoiceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const whatsappTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const WHATSAPP_TAGS = [
    { label: 'Cliente', tag: '{{cliente}}' },
    { label: 'Empresa', tag: '{{empresa}}' },
    { label: 'Valor', tag: '{{valor}}' },
    { label: 'Nº Doc', tag: '{{numero}}' },
    { label: 'Link', tag: '{{link}}' }
  ];

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
      loadExpenses();
      loadDasPayments();
    }
  }, [session]);

  // Sync override phone when client changes
  useEffect(() => {
    if (data.client) {
      setWhatsOverridePhone(data.client.whatsapp || data.client.phone || '');
    }
  }, [data.client]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const loadProfile = async () => {
    const { data: profile } = await supabase.from('profiles').select('*').maybeSingle();
    if (profile) {
      setData(prev => ({
        ...prev,
        provider: { ...prev.provider, ...profile, taxId: profile.tax_id, zipCode: profile.zip_code },
        branding: {
          primaryColor: profile.primary_color || INITIAL_BRANDING.primaryColor,
          secondaryColor: profile.secondary_color || INITIAL_BRANDING.secondaryColor,
          logoLetter: profile.logo_letter || INITIAL_BRANDING.logoLetter,
          logoImage: profile.logo_base64 || INITIAL_BRANDING.logoImage,
          template: (profile.template as any) || INITIAL_BRANDING.template,
        }
      }));
    }
  };

  const loadClients = async () => {
    const { data: clients } = await supabase.from('clients').select('*').order('name');
    if (clients) setSavedClients(clients.map(c => ({ ...c, taxId: c.tax_id, zipCode: c.zip_code })));
  };

  const loadHistory = async () => {
    const { data: invoices } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (invoices) setHistory(invoices.map(inv => ({ id: inv.id, timestamp: new Date(inv.created_at).getTime(), category: inv.category as InvoiceCategory, data: inv.full_data, totalValue: Number(inv.total_value), clientName: inv.client_name, pdfUrl: inv.pdf_url })));
  };

  const loadExpenses = async () => {
    const { data: list } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (list) setExpenses(list.map(e => ({ id: e.id, description: e.description, amount: Number(e.amount), category: e.category, date: e.date })));
  };

  const loadDasPayments = async () => {
    const { data: list } = await supabase.from('das_payments').select('*');
    if (list) setDasPayments(list.map(d => ({ id: d.id, year: d.year, month: d.month, isPaid: d.is_paid })));
  };

  // Logic for filtering history without mutation
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchSearch = item.clientName.toLowerCase().includes(filterSearch.toLowerCase()) || 
                          item.data.invoiceNumber.includes(filterSearch);
      const matchCategory = filterCategory === 'all' || item.category === filterCategory;
      const itemDate = new Date(item.timestamp);
      const matchMonth = !filterMonth || (
        `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}` === filterMonth
      );
      return matchSearch && matchCategory && matchMonth;
    });
  }, [history, filterSearch, filterCategory, filterMonth]);

  // Logic for filtering expenses without mutation
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = e.description.toLowerCase().includes(expFilterSearch.toLowerCase());
      const matchCategory = expFilterCategory === 'all' || e.category === expFilterCategory;
      const matchMonth = !expFilterMonth || e.date.startsWith(expFilterMonth);
      return matchSearch && matchCategory && matchMonth;
    });
  }, [expenses, expFilterSearch, expFilterCategory, expFilterMonth]);

  // Metrics optimized for filters in the Financial Hub
  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Base annual data for progress bar (fixed to year)
    const yearHistory = history.filter(h => new Date(h.timestamp).getFullYear() === currentYear);
    const totalAnnualRevenue = yearHistory.reduce((acc, curr) => acc + curr.totalValue, 0);
    const progress = Math.min(100, (totalAnnualRevenue / 81000) * 100);

    // Contextual Data based on GLOBAL FILTERS (Shared across tabs)
    let relevantHistory = yearHistory;
    let relevantExpenses = expenses.filter(e => new Date(e.date).getFullYear() === currentYear);

    // Apply shared filters to Metrics
    if (expFilterMonth) {
        relevantHistory = history.filter(h => {
            const d = new Date(h.timestamp);
            const itemCompetency = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return itemCompetency === expFilterMonth;
        });
        relevantExpenses = expenses.filter(e => e.date.startsWith(expFilterMonth));
    }
    
    if (expFilterCategory !== 'all') {
        relevantExpenses = relevantExpenses.filter(e => e.category === expFilterCategory);
    }

    if (expFilterSearch) {
        relevantExpenses = relevantExpenses.filter(e => e.description.toLowerCase().includes(expFilterSearch.toLowerCase()));
    }

    // Category-specific totals for the bento grid filters (always based on current year or month if filtered)
    const categoryTotals: Record<string, number> = {};
    const baseExpensesForIcons = expFilterMonth ? expenses.filter(e => e.date.startsWith(expFilterMonth)) : expenses.filter(e => new Date(e.date).getFullYear() === currentYear);
    baseExpensesForIcons.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const faturamentoBruto = relevantHistory.reduce((acc, curr) => acc + curr.totalValue, 0);
    const custoOperacional = relevantExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Analytics calculations (DASN Assistant & Forecasting)
    const histSelectedYear = history.filter(h => new Date(h.timestamp).getFullYear() === analyticsYear);
    const totalServicos = histSelectedYear.filter(h => h.category === 'service').reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalProdutos = histSelectedYear.filter(h => h.category === 'product').reduce((acc, curr) => acc + curr.totalValue, 0);
    
    // Monthly trend for forecasting
    const currentMonthNum = now.getMonth() + 1;
    const avgMonthly = totalAnnualRevenue / currentMonthNum;
    const projectedYearEnd = avgMonthly * 12;

    return { 
      totalAnnual: totalAnnualRevenue, 
      faturamentoBruto,
      custoOperacional,
      lucroReal: faturamentoBruto - custoOperacional, 
      progress,
      categoryTotals,
      dasn: { totalServicos, totalProdutos },
      forecasting: { avgMonthly, projectedYearEnd }
    };
  }, [history, expenses, expFilterMonth, expFilterCategory, expFilterSearch, analyticsYear]);

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    setIsSavingProfile(true);
    const { error } = await supabase.from('profiles').upsert({
      user_id: session.user.id,
      name: data.provider.name,
      tax_id: data.provider.taxId,
      street: data.provider.number,
      city: data.provider.city,
      uf: data.provider.uf,
      email: data.provider.email,
      phone: data.provider.phone,
      pix_key: data.provider.pixKey,
      primary_color: data.branding.primaryColor,
      secondary_color: data.branding.secondaryColor,
      logo_letter: data.branding.logoLetter,
      template: data.branding.template,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    setIsSavingProfile(false);
    if (!error) showToast('Perfil atualizado com sucesso.', 'success');
  };

  const handleSaveClient = async () => {
    if (!session?.user || !data.client.name) return;
    setIsSavingClient(true);
    const { error } = await supabase.from('clients').upsert({
      user_id: session.user.id,
      name: data.client.name,
      tax_id: data.client.taxId,
      street: data.client.street,
      number: data.client.number,
      city: data.client.city,
      uf: data.client.uf,
      email: data.client.email,
      phone: data.client.phone,
      whatsapp: data.client.whatsapp,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, tax_id' });
    setIsSavingClient(false);
    if (!error) { showToast('Cliente salvo.', 'success'); loadClients(); }
  };

  const toggleDasPayment = async (year: number, month: number) => {
    const existing = dasPayments.find(d => d.year === year && d.month === month);
    const newVal = !existing?.isPaid;
    const { error } = await supabase.from('das_payments').upsert({ user_id: session.user.id, year, month, is_paid: newVal, updated_at: new Date().toISOString() }, { onConflict: 'user_id, year, month' });
    if (!error) { showToast(`${month}/${year} marcado como ${newVal ? 'Pago' : 'Pendente'}`, 'info'); loadDasPayments(); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amount);
    if (!expenseForm.description || isNaN(amount)) return showToast('Valores inválidos.', 'error');
    const { error } = await supabase.from('expenses').insert({ user_id: session.user.id, description: expenseForm.description, amount, category: expenseForm.category, date: expenseForm.date });
    if (!error) { showToast('Despesa registrada.', 'success'); setExpenseForm({ ...expenseForm, description: '', amount: '' }); loadExpenses(); }
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) { showToast('Despesa removida.', 'info'); loadExpenses(); }
  };

  const handleExportPack = () => {
    const [year, month] = exportMonth.split('-');
    const filteredHist = history.filter(h => {
        const d = new Date(h.timestamp);
        return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
    });
    const filteredExp = expenses.filter(e => e.date.startsWith(exportMonth));

    if (filteredHist.length === 0 && filteredExp.length === 0) return showToast('Sem dados para exportar neste mês.', 'error');

    let content = `RELATÓRIO MENSAL - ${month}/${year}\n`;
    content += `GERADO POR: ${data.provider.name}\n`;
    content += `--------------------------------------------------\n\n`;
    
    content += `DOCS EMITIDOS:\n`;
    filteredHist.forEach(h => {
        content += `${new Date(h.timestamp).toLocaleDateString('pt-BR')} | ${h.data.invoiceNumber} | ${h.clientName} | ${formatCurrency(h.totalValue)}\n`;
    });
    content += `TOTAL EMISSÕES: ${formatCurrency(filteredHist.reduce((a,b) => a+b.totalValue, 0))}\n\n`;

    content += `DESPESAS REGISTRADAS:\n`;
    filteredExp.forEach(e => {
        content += `${formatDate(e.date)} | ${e.description} | ${e.category} | ${formatCurrency(e.amount)}\n`;
    });
    content += `TOTAL DESPESAS: ${formatCurrency(filteredExp.reduce((a,b) => a+b.amount, 0))}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pack_Contador_${month}_${year}.txt`;
    link.click();
    showToast('Pack do Contador exportado!', 'success');
  };

  const handlePrint = async () => {
    if (!invoiceRef.current) return;
    setIsEmitting(true);
    await new Promise(r => setTimeout(r, 500));
    try {
      const element = invoiceRef.current;
      const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Doc_${data.invoiceNumber}.pdf`);
      
      const pdfBlob = pdf.output('blob');
      const fileName = `fatura_${data.invoiceNumber}_${Date.now()}.pdf`;
      const { data: up } = await supabase.storage.from('invoices').upload(`${session.user.id}/${fileName}`, pdfBlob);
      let publicUrl = null;
      if (up) publicUrl = supabase.storage.from('invoices').getPublicUrl(`${session.user.id}/${fileName}`).data.publicUrl;
      const finalUrl = publicUrl ? await shortenUrl(publicUrl) : null;

      const payload = {
        user_id: session.user.id,
        client_name: data.client.name,
        invoice_number: data.invoiceNumber,
        total_value: data.items.reduce((a, b) => a + (b.quantity * b.unitValue), 0) - (data.discount || 0),
        category: data.category,
        full_data: { ...data, pdfUrl: finalUrl },
        pdf_url: finalUrl
      };
      
      if (currentInvoiceId) await supabase.from('invoices').update(payload).eq('id', currentInvoiceId);
      else await supabase.from('invoices').insert(payload);
      
      setData(prev => ({ ...prev, pdfUrl: finalUrl || undefined }));
      showToast('Documento emitido e salvo.', 'success');
      loadHistory();
    } catch { showToast('Erro na emissão.', 'error'); } finally { setIsEmitting(false); }
  };

  const parseWhatsAppMessage = (template: string): string => {
    const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
    const totalTaxes = (Object.values(data.taxes) as number[]).reduce((a, b) => a + b, 0);
    const total = subtotal - totalTaxes - (data.discount || 0);

    return template
      .replace(/{{cliente}}/g, data.client.name || '[Nome do Cliente]')
      .replace(/{{empresa}}/g, data.provider.name || '[Sua Empresa]')
      .replace(/{{valor}}/g, formatCurrency(total))
      .replace(/{{numero}}/g, data.invoiceNumber)
      .replace(/{{link}}/g, data.pdfUrl || '');
  };

  const handleSendWhatsApp = () => {
    const phone = whatsOverridePhone.replace(/\D/g, '') || data.client.whatsapp?.replace(/\D/g, '') || data.client.phone?.replace(/\D/g, '');
    if (!phone) return showToast('Número de WhatsApp não informado.', 'error');
    if (!data.pdfUrl) return showToast('Gere o documento primeiro.', 'error');
    
    const rawMessage = data.whatsappMessage || '';
    const parsedMessage = parseWhatsAppMessage(rawMessage);
    const message = encodeURIComponent(parsedMessage);
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${message}`, '_blank');
  };

  const handleCopyLink = () => {
    if (data.pdfUrl) {
      navigator.clipboard.writeText(data.pdfUrl);
      showToast('Link copiado!', 'success');
    }
  };

  const insertTag = (tag: string) => {
    const textarea = whatsappTextAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = data.whatsappMessage || '';
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    
    setData(prev => ({ ...prev, whatsappMessage: newText }));
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      const newPos = start + tag.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setData(prev => ({ ...prev, branding: { ...prev.branding, logoImage: reader.result as string } }));
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) return showToast('Preencha os campos.', 'error');
    setIsLoggingIn(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: loginEmail, password: loginPass, options: { data: { full_name: userName } } });
        if (error) throw error;
        showToast('Cadastro realizado! Verifique seu e-mail.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
        if (error) throw error;
        showToast('Acesso autorizado.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro de autenticação.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setView('landing'); };
  const updateProvider = (field: keyof Entity, value: string) => setData(prev => ({ ...prev, provider: { ...prev.provider, [field]: value } }));
  const updateClient = (field: keyof Entity, value: string) => setData(prev => ({ ...prev, client: { ...prev.client, [field]: value } }));

  // Helper to render active filter info - Now SHARED across all tabs
  const renderFilterStatus = () => {
    const activeFilters = [];
    if (expFilterMonth) activeFilters.push(`Competência: ${expFilterMonth}`);
    if (expFilterCategory !== 'all') activeFilters.push(`Categoria: ${expFilterCategory}`);
    if (expFilterSearch) activeFilters.push(`Busca: "${expFilterSearch}"`);

    const hasFilters = activeFilters.length > 0;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${hasFilters ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}></div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">
                    {hasFilters
                      ? `Exibindo análise para: ${activeFilters.join(' • ')}`
                      : `Visualização Geral Anual (${new Date().getFullYear()})`}
                </span>
            </div>
            {hasFilters && (
                <button 
                  onClick={() => { setExpFilterSearch(''); setExpFilterCategory('all'); setExpFilterMonth(''); }}
                  className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-all self-start md:self-auto border border-rose-500/20"
                >
                  Limpar Filtros Analíticos
                </button>
            )}
        </div>
    );
  };

  if (!session) return (
    <div className="min-h-screen lg:h-screen bg-[#020617] flex flex-col md:flex-row p-6 md:px-8 lg:p-12 relative overflow-y-auto lg:overflow-hidden items-center justify-center gap-10 md:gap-8 lg:gap-20 animate-in fade-in duration-700">
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/5 blur-[150px] rounded-full bg-orb pointer-events-none"></div>
      
      {/* Hero Section */}
      <div className="w-full max-w-2xl space-y-6 md:space-y-8 lg:space-y-12 z-10 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Invoice V3.5</span>
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[0.95] md:leading-[1] lg:leading-[0.9]">
          Faturamento inteligente e <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">minimalista.</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg lg:text-xl font-medium max-w-lg mx-auto md:mx-0">
          Gere notas premium para serviços ou produtos e controle seu faturamento MEI de forma automática.
        </p>
      </div>

      {/* Auth Card Section */}
      <div className="w-full max-w-md z-10">
        <div className="bg-[#0f172a]/80 backdrop-blur-3xl p-8 md:p-10 lg:p-14 rounded-[2.5rem] md:rounded-[3rem] lg:rounded-[3.5rem] border border-white/10 shadow-2xl relative">
          <div className="text-center mb-6 md:mb-8 lg:mb-12">
            <div className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 bg-blue-600 rounded-[1.5rem] lg:rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-blue-600/30 shrink-0">
              <span className="text-white text-3xl md:text-4xl font-black">N</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h3>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4 lg:space-y-6">
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm" placeholder="Seu Nome" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm" placeholder="seu@email.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
              <input type="password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm" placeholder="••••••••••••" />
            </div>
            <button disabled={isLoggingIn} type="submit" className="w-full py-5 md:py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 text-xs md:text-sm uppercase tracking-widest mt-2">
              {isLoggingIn ? 'Processando...' : (authMode === 'login' ? 'Entrar no Sistema' : 'Cadastrar Agora')}
            </button>
          </form>
          
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-6 md:mt-8 text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-blue-400 transition-colors">
            {authMode === 'login' ? 'Não possui conta? Registre-se aqui' : 'Já possui conta? Faça o login'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Inter'] relative">
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
      <div className="fixed top-8 right-8 z-[200] flex flex-col gap-4">
        {toasts.map(t => (
          <div key={t.id} className={`px-6 py-4 rounded-2xl border backdrop-blur-3xl shadow-2xl animate-in slide-in-from-right-10 ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>

      {view === 'landing' ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-12 animate-in fade-in duration-700">
          <div className="absolute top-8 right-8"><button onClick={handleLogout} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest">Sair</button></div>
          <header className="space-y-4">
            <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-5xl font-black shadow-2xl shadow-blue-600/30">N</div>
            <h1 className="text-7xl font-black tracking-tighter">NovaInvoice</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">Gestão Fiscal e Financeira MEI</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
            <button onClick={() => { setData({ ...INITIAL_DATA, provider: data.provider, branding: data.branding }); setCurrentInvoiceId(null); setView('editor'); setEditorActiveTab('form'); }} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-left group hover:border-blue-500/50 transition-all shadow-2xl">
              <div className="w-14 h-14 bg-white/5 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
              <h3 className="text-2xl font-black mb-1 uppercase tracking-tight text-white">Nova Emissão</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Recibos Premium</p>
            </button>
            <button onClick={() => setView('history')} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] text-left group hover:border-blue-500/50 transition-all shadow-2xl">
              <div className="w-14 h-14 bg-white/5 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg></div>
              <h3 className="text-2xl font-black mb-1 uppercase tracking-tight text-white">Histórico</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Armazenamento em Nuvem</p>
            </button>
            <button onClick={() => setView('financial-hub')} className="p-10 bg-emerald-600/5 border border-emerald-600/10 rounded-[3rem] text-left group hover:border-emerald-600/50 transition-all shadow-2xl">
              <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-emerald-600 transition-all text-emerald-500 group-hover:text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></div>
              <h3 className="text-2xl font-black mb-1 uppercase tracking-tight text-emerald-400">Hub Financeiro</h3>
              <p className="text-emerald-900 text-[10px] font-bold uppercase tracking-widest">Monitor DAS & Gastos</p>
            </button>
          </div>
        </div>
      ) : view === 'history' ? (
        <div className="p-4 md:p-16 max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-32">
           <header className="flex flex-col md:flex-row justify-between md:items-end gap-6">
             <div>
               <button onClick={() => setView('landing')} className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform flex items-center gap-1">← Voltar</button>
               <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Histórico Cloud</h1>
             </div>
             <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 md:text-right shadow-2xl w-full md:w-auto md:min-w-[320px]">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Monitor Teto MEI Anual</span>
               <div className="flex justify-between items-end mb-4">
                 <p className="text-2xl md:text-3xl font-black text-white">{formatCurrency(dashboardMetrics.totalAnnual)}</p>
                 <p className="text-lg md:text-xl font-black text-blue-500">{Math.round(dashboardMetrics.progress)}%</p>
               </div>
               <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${dashboardMetrics.progress}%` }}></div></div>
             </div>
           </header>

           {/* History Toolbelt / Filters */}
           <section className="bg-white/5 backdrop-blur-3xl p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 shadow-xl flex flex-col md:flex-row gap-6 md:items-center">
             <div className="flex-1 relative">
               <input 
                 type="text" 
                 value={filterSearch}
                 onChange={e => setFilterSearch(e.target.value)}
                 placeholder="Buscar cliente ou número..." 
                 className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
               />
               <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             </div>
             
             <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shrink-0">
               {(['all', 'service', 'product'] as const).map(cat => (
                 <button 
                   key={cat}
                   onClick={() => setFilterCategory(cat)}
                   className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                 >
                   {cat === 'all' ? 'Todos' : cat === 'service' ? 'Serviços' : 'Produtos'}
                 </button>
               ))}
             </div>

             <div className="flex flex-col gap-1.5 shrink-0">
               <input 
                 type="month" 
                 value={filterMonth}
                 onChange={e => setFilterMonth(e.target.value)}
                 className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all cursor-pointer"
               />
             </div>
             
             {(filterSearch || filterCategory !== 'all' || filterMonth) && (
               <button 
                onClick={() => { setFilterSearch(''); setFilterCategory('all'); setFilterMonth(''); }}
                className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
               >
                 Limpar Filtros
               </button>
             )}
           </section>

           <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-20 md:py-40 border border-dashed border-white/10 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-700">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <p className="text-slate-700 font-black uppercase tracking-widest text-xs">Nenhum documento encontrado com estes filtros</p>
                </div>
              ) : filteredHistory.map(item => (
                <div key={item.id} className="p-5 md:p-8 bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[3rem] flex flex-col md:flex-row items-center group hover:bg-white/[0.08] transition-all shadow-xl gap-6 md:gap-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all uppercase text-[10px] shrink-0">
                    {item.category === 'product' ? '📦' : '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-lg md:text-2xl uppercase tracking-tight truncate">
                      {item.clientName || 'Cliente não identificado'}
                    </h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 md:mt-1.5 flex items-center gap-2">
                      Doc #{item.data.invoiceNumber} • {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10 w-full md:w-auto pt-4 md:pt-0 border-t border-white/5 md:border-0 shrink-0">
                    <div className="md:text-right">
                      <span className="text-xl md:text-2xl font-black text-white block tracking-tighter">
                        {formatCurrency(item.totalValue)}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                       <button onClick={() => { setData(item.data); setCurrentInvoiceId(item.id); setView('editor'); setEditorActiveTab('form'); }} className="px-4 py-3 md:px-6 md:py-4 bg-white/5 text-slate-400 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-white/10 hover:text-white transition-all">Abrir</button>
                       {item.pdfUrl && <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="p-3 md:p-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl md:rounded-2xl hover:bg-blue-500 hover:text-white transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      ) : view === 'financial-hub' ? (
        <div className="p-6 md:p-16 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
          <header className="flex justify-between items-end flex-wrap gap-6">
            <div>
              <button onClick={() => setView('landing')} className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">← Voltar</button>
              <h1 className="text-6xl font-black tracking-tighter text-white">Hub Financeiro</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Gestão de DAS e Despesas Isentas</p>
            </div>
            <div className="flex bg-white/5 p-2 rounded-3xl border border-white/10 shadow-lg overflow-x-auto">
               <button onClick={() => setFinancialTab('das')} className={`px-6 md:px-8 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap ${financialTab === 'das' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Monitor DAS</button>
               <button onClick={() => setFinancialTab('expenses')} className={`px-6 md:px-8 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap ${financialTab === 'expenses' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Despesas</button>
               <button onClick={() => setFinancialTab('analytics')} className={`px-6 md:px-8 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap ${financialTab === 'analytics' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Análise & Exportação</button>
            </div>
          </header>

          <section>
            {renderFilterStatus()}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-emerald-600/10 border border-emerald-600/20 p-10 rounded-[3rem] text-center space-y-2 shadow-2xl">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lucro Real Estimado</span>
                <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(dashboardMetrics.lucroReal)}</p>
                <p className="text-[9px] text-emerald-800 font-bold uppercase">Base Isenta de IRPF</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center space-y-2 shadow-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Faturamento Bruto</span>
                <p className="text-3xl font-black text-white">{formatCurrency(dashboardMetrics.faturamentoBruto)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center space-y-2 shadow-xl">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Custo Operacional</span>
                <p className="text-3xl font-black text-rose-500">{formatCurrency(dashboardMetrics.custoOperacional)}</p>
                </div>
            </div>
          </section>

          {financialTab === 'das' ? (
            <div className="bg-white/5 border border-white/10 p-12 rounded-[4rem] space-y-12 shadow-2xl">
              <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                   <h3 className="text-2xl font-black uppercase tracking-tight text-white">Contribuições {new Date().getFullYear()}</h3>
                   <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Checklist de Conformidade MEI</p>
                 </div>
                 <div className="px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[11px] font-black uppercase tracking-widest">
                   {dasPayments.filter(p => p.isPaid).length}/12 Meses Pagos
                 </div>
              </header>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const p = dasPayments.find(d => d.month === month && d.year === new Date().getFullYear());
                  const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2000, month - 1, 1));
                  return (
                    <button key={month} onClick={() => toggleDasPayment(new Date().getFullYear(), month)} className={`p-8 rounded-[3rem] border transition-all flex flex-col items-center gap-6 ${p?.isPaid ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-xl' : 'bg-white/5 border-white/10 text-slate-700 hover:border-white/20'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest">{name}</span>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${p?.isPaid ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'border-slate-800 text-slate-800'}`}>
                        {p?.isPaid ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg> : <span className="text-xs font-black">X</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : financialTab === 'expenses' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
               <div className="lg:col-span-1">
                 <form onSubmit={handleAddExpense} className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-8 shadow-2xl sticky top-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registrar Gasto</h3>
                    <InputGroup label="O que adquiriu?" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Ex: Internet Vivo" />
                    <InputGroup label="Valor Pago R$" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria de Custo</label>
                       <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white outline-none focus:border-emerald-500/50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat">
                          {EXPENSE_CATEGORIES.map(c => <option key={c.name} value={c.name} className="bg-[#0f172a]">{c.name}</option>)}
                       </select>
                    </div>
                    <InputGroup label="Data do Gasto" type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                    <button type="submit" className="w-full py-5 bg-emerald-600 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Adicionar Saída</button>
                 </form>
               </div>
               
               <div className="lg:col-span-2 space-y-6">
                  {/* Expense Filter Toolbelt - BENTO GRID DESIGN */}
                  <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-lg space-y-8">
                    <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={expFilterSearch}
                          onChange={e => setExpFilterSearch(e.target.value)}
                          placeholder="Buscar na listagem..." 
                          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </div>
                      <input 
                        type="month" 
                        value={expFilterMonth}
                        onChange={e => setExpFilterMonth(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                      />
                    </header>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                       <button 
                         onClick={() => setExpFilterCategory('all')}
                         className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-4 group ${expFilterCategory === 'all' ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-600/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'}`}
                       >
                         <div className="flex justify-between items-start">
                           <span className="text-xl">🌟</span>
                           {expFilterCategory === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                         </div>
                         <div>
                           <span className={`text-[9px] font-black uppercase tracking-widest block ${expFilterCategory === 'all' ? 'text-white/80' : 'text-slate-600'}`}>Todos</span>
                           <span className="text-[11px] font-black truncate">Geral Anual</span>
                         </div>
                       </button>

                       {EXPENSE_CATEGORIES.map(cat => (
                         <button 
                           key={cat.name}
                           onClick={() => setExpFilterCategory(cat.name)}
                           className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-4 group ${expFilterCategory === cat.name ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-600/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'}`}
                         >
                           <div className="flex justify-between items-start">
                             <span className="text-xl">{cat.icon}</span>
                             <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${expFilterCategory === cat.name ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-white/5 text-slate-600'}`}>
                               R$ {Math.round(dashboardMetrics.categoryTotals[cat.name] || 0)}
                             </span>
                           </div>
                           <div>
                             <span className={`text-[8px] font-black uppercase tracking-widest block mb-0.5 ${expFilterCategory === cat.name ? 'text-white/80' : 'text-slate-600'}`}>Categoria</span>
                             <span className="text-[10px] font-black truncate leading-tight block">{cat.name}</span>
                           </div>
                         </button>
                       ))}
                    </div>

                    {(expFilterSearch || expFilterCategory !== 'all' || expFilterMonth) && (
                      <div className="pt-4 border-t border-white/5 flex justify-end">
                        <button 
                          onClick={() => { setExpFilterSearch(''); setExpFilterCategory('all'); setExpFilterMonth(''); }}
                          className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all"
                        >
                          Resetar Todos os Filtros
                        </button>
                      </div>
                    )}
                  </section>

                  <div className="space-y-4">
                    {filteredExpenses.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[4rem] gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-800">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <span className="text-slate-800 font-black uppercase tracking-widest text-[10px]">Sem despesas para este filtro</span>
                      </div>
                    ) : filteredExpenses.map(e => (
                      <div key={e.id} className="p-6 md:p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-lg gap-4">
                        <div className="flex items-center gap-4 md:gap-8 min-w-0">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 font-black text-[12px] md:text-[14px] shrink-0 text-center leading-tight">
                                {EXPENSE_CATEGORIES.find(cat => cat.name === e.category)?.icon || "📎"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-white text-base md:text-lg uppercase tracking-tight truncate">{e.description}</h4>
                              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 md:mt-1.5">{formatDate(e.date)} • {e.category}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8 shrink-0">
                            <span className="text-xl md:text-2xl font-black text-rose-500 tracking-tighter">{formatCurrency(e.amount)}</span>
                            <button onClick={() => handleDeleteExpense(e.id)} className="p-2.5 text-slate-800 hover:text-rose-500 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/10 rounded-xl"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                {/* 1. Previsão de Faturamento (Forecasting) */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-blue-600/10 border border-blue-500/20 p-10 md:p-12 rounded-[3.5rem] relative overflow-hidden flex flex-col md:flex-row items-center gap-10 shadow-2xl">
                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full"></div>
                        <div className="space-y-6 flex-1 text-center md:text-left relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase">Previsão Anual de Faturamento</h3>
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-1">Algoritmo de Velocidade de Caixa</p>
                            </div>
                            <div className="flex items-end justify-center md:justify-start gap-3">
                                <span className="text-5xl font-black text-white tracking-tighter">{formatCurrency(dashboardMetrics.forecasting.projectedYearEnd)}</span>
                                <span className="text-xs font-black text-blue-500 uppercase pb-2">Estimado para Dez/31</span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-sm">
                                Com base na sua média mensal de <strong className="text-white">{formatCurrency(dashboardMetrics.forecasting.avgMonthly)}</strong>, este é o valor projetado. 
                                {dashboardMetrics.forecasting.projectedYearEnd > 81000 ? 
                                    " ⚠️ Atenção: Risco crítico de ultrapassar o limite MEI." : 
                                    " ✅ Você está dentro da zona de segurança do MEI."
                                }
                            </p>
                        </div>
                        <div className="shrink-0 text-center space-y-4">
                            <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center relative ${dashboardMetrics.forecasting.projectedYearEnd > 81000 ? 'border-rose-500 shadow-rose-500/20' : 'border-blue-500 shadow-blue-500/20'} shadow-2xl transition-all duration-1000`}>
                                <span className="text-xl font-black text-white">
                                    {Math.round((dashboardMetrics.forecasting.projectedYearEnd / 81000) * 100)}%
                                </span>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Capacidade do Teto</span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] flex flex-col justify-center items-center text-center space-y-6 shadow-xl">
                        <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-3xl">📦</div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Pack do Contador</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Exportação em Um Clique</p>
                        </div>
                        <div className="w-full space-y-4">
                            <input 
                                type="month" 
                                value={exportMonth}
                                onChange={e => setExportMonth(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase text-center outline-none focus:border-blue-500/50"
                            />
                            <button onClick={handleExportPack} className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 shadow-lg">
                                Baixar Arquivo .TXT
                            </button>
                        </div>
                    </div>
                </section>

                {/* 2. Assistente DASN-SIMEI */}
                <section className="bg-white/5 border border-white/10 p-12 md:p-16 rounded-[4rem] space-y-12 shadow-2xl">
                    <header className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Assistente DASN-SIMEI</h3>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em]">Fechamento Fiscal Anual</p>
                        </div>
                        <div className="flex bg-white/5 p-2 rounded-2xl border border-white/10">
                            {[new Date().getFullYear() - 1, new Date().getFullYear()].map(y => (
                                <button key={y} onClick={() => setAnalyticsYear(y)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analyticsYear === y ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-white'}`}>
                                    Ano {y}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="p-10 bg-white/[0.03] border border-white/5 rounded-[3rem] space-y-6 group hover:bg-white/[0.05] transition-all">
                            <div className="flex justify-between items-start">
                                <span className="text-4xl">⚡</span>
                                <button onClick={() => { navigator.clipboard.writeText(dashboardMetrics.dasn.totalServicos.toString()); showToast('Copiado para o clipboard!'); }} className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all opacity-0 group-hover:opacity-100"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-white tracking-tight uppercase">Prestação de Serviços</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Valor para declarar no campo específico</p>
                            </div>
                            <p className="text-4xl font-black text-blue-500 tracking-tighter">{formatCurrency(dashboardMetrics.dasn.totalServicos)}</p>
                        </div>

                        <div className="p-10 bg-white/[0.03] border border-white/5 rounded-[3rem] space-y-6 group hover:bg-white/[0.05] transition-all">
                            <div className="flex justify-between items-start">
                                <span className="text-4xl">📦</span>
                                <button onClick={() => { navigator.clipboard.writeText(dashboardMetrics.dasn.totalProdutos.toString()); showToast('Copiado para o clipboard!'); }} className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all opacity-0 group-hover:opacity-100"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-white tracking-tight uppercase">Vendas de Mercadorias</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Valor para o campo de Comércio/Indústria</p>
                            </div>
                            <p className="text-4xl font-black text-emerald-500 tracking-tighter">{formatCurrency(dashboardMetrics.dasn.totalProdutos)}</p>
                        </div>
                    </div>

                    <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] flex items-center gap-6">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase">
                            <strong>Dica NovaInvoice:</strong> O governo exige que você separe o que foi serviço do que foi venda. Use os valores acima diretamente no portal do Simples Nacional em Maio de cada ano.
                        </p>
                    </div>
                </section>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-screen flex flex-col animate-in fade-in duration-500">
          <div className="lg:hidden sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10 p-4">
            <div className="flex justify-between items-center mb-4">
               <button onClick={() => setView('landing')} className="text-xl font-black text-blue-500 uppercase tracking-tighter">NovaInvoice</button>
               <div className="flex gap-2">
                 <button onClick={() => setView('history')} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                 <button onClick={() => setView('landing')} className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
               </div>
            </div>
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
              <button 
                onClick={() => setEditorActiveTab('form')} 
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${editorActiveTab === 'form' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                Editor
              </button>
              <button 
                onClick={() => setEditorActiveTab('preview')} 
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${editorActiveTab === 'preview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                Documento
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 relative">
            <aside className={`w-full lg:w-[500px] bg-[#0f172a]/90 backdrop-blur-3xl border-r border-white/10 p-6 md:p-10 space-y-12 overflow-y-auto lg:h-screen scrollbar-hide no-print ${editorActiveTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
              <header className="hidden lg:flex justify-between items-center mb-6">
                 <button onClick={() => setView('landing')} className="text-3xl font-black text-blue-500 uppercase tracking-tighter">NovaInvoice</button>
                 <div className="flex gap-2">
                   <button onClick={() => setView('history')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                   <button onClick={() => setView('landing')} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                 </div>
              </header>

              <div className="space-y-12 pb-24 lg:pb-0">
                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identidade Visual</h3>
                   <div className="space-y-8">
                     <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Template Base</label>
                       <div className="grid grid-cols-3 gap-3">
                         {['classic', 'modern', 'minimal'].map(t => (
                           <button key={t} onClick={() => setData(prev => ({ ...prev, branding: { ...prev.branding, template: t as any } }))} className={`py-4 px-1 text-[9px] font-black uppercase rounded-2xl border transition-all ${data.branding.template === t ? 'bg-blue-600 border-blue-500 text-white shadow-xl' : 'bg-white/5 border-white/10 text-slate-600 hover:border-white/20'}`}>{t}</button>
                         ))}
                       </div>
                     </div>
                     <div className="flex flex-col sm:flex-row items-center gap-8">
                       <div className="w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center overflow-hidden relative group shrink-0 shadow-2xl border-4 border-white/10">
                         {data.branding.logoImage ? <img src={data.branding.logoImage} className="w-full h-full object-contain p-4" /> : <span className="text-5xl font-black text-slate-800">{data.branding.logoLetter}</span>}
                         <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity" onClick={() => fileInputRef.current?.click()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                       </div>
                       <div className="flex-1 w-full space-y-4">
                         <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black w-full py-4 bg-white/5 border border-white/10 rounded-2xl uppercase tracking-widest hover:bg-white/10 transition-all">Alterar Imagem</button>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                         <InputGroup label="Logo Letra" value={data.branding.logoLetter} onChange={(e) => setData(prev => ({ ...prev, branding: { ...prev.branding, logoLetter: e.target.value.substring(0,1).toUpperCase() } }))} />
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cor Primária</label><input type="color" value={data.branding.primaryColor} onChange={e => setData(prev => ({ ...prev, branding: { ...prev.branding, primaryColor: e.target.value } }))} className="w-full h-12 bg-white rounded-2xl cursor-pointer border-4 border-white/10 p-0" /></div>
                        <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cor Secundária</label><input type="color" value={data.branding.secondaryColor} onChange={e => setData(prev => ({ ...prev, branding: { ...prev.branding, secondaryColor: e.target.value } }))} className="w-full h-12 bg-white rounded-2xl cursor-pointer border-4 border-white/10 p-0" /></div>
                     </div>
                   </div>
                </section>

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rótulos do Documento</h3>
                   <div className="flex flex-wrap gap-2 mb-4">
                      {Object.keys(LABEL_PRESETS).map(key => (
                        <button key={key} onClick={() => setData(prev => ({ ...prev, labels: { ...prev.labels, ...LABEL_PRESETS[key] } }))} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase text-slate-400 transition-all">{key}</button>
                      ))}
                   </div>
                   <InputGroup label="Título Principal" value={data.labels.documentTitle} onChange={e => setData(prev => ({ ...prev, labels: { ...prev.labels, documentTitle: e.target.value } }))} />
                   <InputGroup label="Subtítulo" value={data.labels.documentSubtitle} onChange={e => setData(prev => ({ ...prev, labels: { ...prev.labels, documentSubtitle: e.target.value } }))} />
                </section>

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Faturamento</h3>
                   <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={() => setData(prev => ({ ...prev, category: 'service' }))} className={`py-4 rounded-[1.5rem] border font-black text-[10px] uppercase tracking-widest transition-all ${data.category === 'service' ? 'bg-blue-600 border-blue-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-600'}`}>Serviços</button>
                           <button onClick={() => setData(prev => ({ ...prev, category: 'product' }))} className={`py-4 rounded-[1.5rem] border font-black text-[10px] uppercase tracking-widest transition-all ${data.category === 'product' ? 'bg-blue-600 border-blue-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-600'}`}>Produtos</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <InputGroup label="Número" value={data.invoiceNumber} onChange={e => setData(prev => ({ ...prev, invoiceNumber: e.target.value }))} />
                         <InputGroup label="Série" value={data.serie} onChange={e => setData(prev => ({ ...prev, serie: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <InputGroup label="Emissão" type="date" value={data.issueDate} onChange={e => setData(prev => ({ ...prev, issueDate: e.target.value }))} />
                         <InputGroup label="Competência" value={data.competency} onChange={e => setData(prev => ({ ...prev, competency: e.target.value }))} placeholder="MM/AAAA" />
                      </div>
                   </div>
                </section>

                <EntityForm title="Informações do Prestador" entity={data.provider} updateFn={updateProvider} isProvider onSave={handleSaveProfile} isSaving={isSavingProfile} />
                <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl"><InputGroup label="Chave PIX" value={data.provider.pixKey || ''} onChange={e => updateProvider('pixKey', e.target.value)} /></section>
                
                <EntityForm title="Dados do Tomador (Cliente)" entity={data.client} updateFn={updateClient} isClient onSearch={() => setIsModalOpen(true)} onSave={handleSaveClient} isSaving={isSavingClient} />

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl">
                   <header className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Itens</h3>
                      <button onClick={() => setData(prev => ({ ...prev, items: [...prev.items, { id: Math.random().toString(36).substr(2,9), description: '', quantity: 1, unitValue: 0, unit: data.category === 'product' ? 'UN' : 'H' }] }))} className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl hover:scale-110 transition-all">+</button>
                   </header>
                   <div className="space-y-6">
                     {data.items.map(item => (
                       <div key={item.id} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4 relative group">
                          <button onClick={() => setData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }))} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-600 text-white rounded-2xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all shadow-xl">X</button>
                          <InputGroup label="Descrição" value={item.description} onChange={e => setData(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, description: e.target.value } : i) }))} />
                          <div className="grid grid-cols-3 gap-4">
                             <InputGroup label="Qtd" type="number" value={item.quantity} onChange={e => setData(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i) }))} />
                             <InputGroup label="Und" value={item.unit || ''} onChange={e => setData(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i) }))} placeholder="UN, KG, H..." />
                             <InputGroup label="V. Unitário" type="number" value={item.unitValue} onChange={e => setData(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, unitValue: parseFloat(e.target.value) || 0 } : i) }))} />
                          </div>
                       </div>
                     ))}
                   </div>
                </section>

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fiscal</h3>
                   <div className="space-y-6">
                      <InputGroup label={data.category === 'service' ? "Código do Serviço" : "CFOP"} value={data.serviceCode} onChange={e => setData(prev => ({ ...prev, serviceCode: e.target.value }))} />
                      <InputGroup label="CNAE" value={data.cnae} onChange={e => setData(prev => ({ ...prev, cnae: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-4">
                         <InputGroup label={data.category === 'service' ? "ISS %" : "ICMS %"} type="number" value={data.taxRate} onChange={e => setData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))} />
                         <InputGroup label="Desconto R$" type="number" value={data.discount} onChange={e => setData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))} />
                      </div>
                   </div>
                </section>

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Configurações de Envio</h3>
                   <div className="space-y-4">
                      <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mensagem WhatsApp</label>
                        <textarea 
                          ref={whatsappTextAreaRef}
                          rows={4}
                          value={data.whatsappMessage || ''}
                          onChange={e => setData(prev => ({ ...prev, whatsappMessage: e.target.value }))}
                          placeholder="Olá {{cliente}}..."
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {WHATSAPP_TAGS.map(item => (
                          <button 
                            key={item.tag} 
                            onClick={() => insertTag(item.tag)}
                            className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase text-blue-400 tracking-widest transition-all active:scale-90"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-600 font-medium uppercase mt-2">Clique nas tags acima para inserir no texto.</p>
                   </div>
                </section>

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                   <InputGroup label="Observações no Documento" isTextArea value={data.notes} onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))} />
                </section>

                <div className="sticky bottom-0 bg-[#020617]/95 pt-10 pb-16 border-t border-white/10 z-30 lg:block hidden">
                   <button disabled={isEmitting} onClick={handlePrint} className={`w-full py-8 rounded-[3rem] text-white font-black uppercase text-[11px] tracking-[0.5em] shadow-2xl transition-all active:scale-95 ${isEmitting ? 'bg-blue-600/50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'}`}>{isEmitting ? 'Gerando...' : 'Gerar PDF Premium'}</button>
                </div>
              </div>
            </aside>
            
            {/* Editor Preview Area */}
            <main className={`flex-1 flex flex-col items-center lg:items-start justify-start lg:justify-start p-4 sm:p-10 lg:p-12 overflow-y-auto lg:h-screen no-print scrollbar-hide bg-[#020617] transition-all duration-300 ${editorActiveTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="hidden lg:flex w-full max-w-[900px] justify-between items-center mb-10 mx-auto gap-8">
                 <div className="px-6 py-3 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shrink-0">Real-time Preview</div>
                 
                 {data.pdfUrl && (
                   <div className="flex-1 flex gap-3 animate-in slide-in-from-top-4 duration-500">
                     <div className="w-full flex bg-emerald-600/10 border border-emerald-600/20 p-2.5 rounded-2xl items-center gap-3 shadow-xl backdrop-blur-md">
                        <div className="flex flex-col px-3 border-r border-emerald-500/20">
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Enviar p/ Whatsapp:</span>
                          <input 
                            value={whatsOverridePhone} 
                            onChange={e => setWhatsOverridePhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="bg-transparent text-[11px] text-white font-bold outline-none w-32 placeholder:text-emerald-900" 
                          />
                        </div>
                        
                        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                          <span className="text-[8px] font-black text-slate-500 uppercase">Link:</span>
                          <input readOnly value={data.pdfUrl} className="bg-transparent border-none text-[9px] text-white outline-none w-full font-mono" />
                          <button onClick={handleCopyLink} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                        </div>

                        <button onClick={handleSendWhatsApp} className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2 shrink-0 shadow-lg">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                           Enviar
                        </button>
                     </div>
                   </div>
                 )}
              </div>

              {/* Mobile Hub de Compartilhamento */}
              {data.pdfUrl && (
                <div className="lg:hidden w-full max-w-[800px] bg-[#0f172a] p-8 rounded-[2.5rem] border border-emerald-500/30 mb-8 flex flex-col gap-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                  <header className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Documento Disponível</p>
                    <button onClick={handleCopyLink} className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar Link</button>
                  </header>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp de Envio</label>
                       <input 
                        type="text" 
                        value={whatsOverridePhone} 
                        onChange={e => setWhatsOverridePhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold"
                       />
                    </div>
                    
                    <button onClick={handleSendWhatsApp} className="w-full py-5 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Enviar pelo WhatsApp
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full flex justify-center items-start lg:pt-10 py-10 min-h-full lg:min-h-0">
                <div className="relative w-[800px] origin-top scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.65] xl:scale-[0.85] 2xl:scale-100 transition-all duration-700 mx-auto">
                   <div ref={invoiceRef} className="shadow-[0_80px_160px_-40px_rgba(0,0,0,1)] bg-white"><InvoicePreview data={data} /></div>
                </div>
              </div>

              <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
                 <button disabled={isEmitting} onClick={handlePrint} className={`w-full py-6 rounded-[2.5rem] text-white font-black uppercase text-[11px] tracking-[0.5em] shadow-2xl transition-all active:scale-95 ${isEmitting ? 'bg-blue-600/50' : 'bg-blue-600 shadow-blue-600/40'}`}>
                   {isEmitting ? 'Processando...' : 'Gerar Documento Agora'}
                 </button>
              </div>
            </main>
          </div>
        </div>
      )}
      
      <ClientSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} clients={savedClients} onSelect={c => { setData({ ...data, client: c }); setIsModalOpen(false); }} onDelete={async tid => { await supabase.from('clients').delete().match({ user_id: session.user.id, tax_id: tid }); loadClients(); }} />
    </div>
  );
};

export default App;
