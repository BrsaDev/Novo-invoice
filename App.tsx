
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InvoiceData, InvoiceItem, InvoiceLabels, Branding, Entity, InvoiceHistoryItem, InvoiceCategory, Expense, DasPayment, PaymentStatus, SignatureType } from './types';
import { InputGroup } from './components/InputGroup';
import { InvoicePreview } from './components/InvoicePreview';
import { ContractPreview } from './components/ContractPreview';
import { ClientSearchModal } from './components/ClientSearchModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { formatCurrency, formatDate } from './utils/formatters';
import { supabase } from './lib/supabase';
import { CONTRACT_TEMPLATES } from './utils/contracts';

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
  status: 'pending'
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
type ViewState = 'landing' | 'editor' | 'history' | 'financial-hub' | 'contracts';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewState>('landing');
  const [data, setData] = useState<InvoiceData>(INITIAL_DATA);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<Entity[]>([]);
  const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dasPayments, setDasPayments] = useState<DasPayment[]>([]);
  
  // WhatsApp Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppRecipientPhone, setWhatsAppRecipientPhone] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Contracts State
  const [contractForm, setContractForm] = useState({ 
    templateId: CONTRACT_TEMPLATES[0].id, 
    serviceDesc: '', 
    value: '', 
    paymentMethod: 'Transferência Bancária',
    deadline: '30',
    signatureType: 'physical' as SignatureType
  });
  const [isContractClientModalOpen, setIsContractClientModalOpen] = useState(false);
  const [contractClient, setContractClient] = useState<Entity | null>(null);
  
  // States for History Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'service' | 'product'>('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');

  // States for Expense Filters
  const [expFilterSearch, setExpFilterSearch] = useState('');
  const [expFilterCategory, setExpFilterCategory] = useState('all');
  const [expFilterMonth, setExpFilterMonth] = useState('');

  // States for Analytics/DASN Filters
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [expenseForm, setExpenseForm] = useState({ 
    description: '', 
    amount: '', 
    category: 'Insumos e Mercadorias', 
    date: new Date().toISOString().split('T')[0],
    status: 'paid' as PaymentStatus
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [financialTab, setFinancialTab] = useState<'das' | 'expenses' | 'analytics' | 'crm'>('das');
  const [editorActiveTab, setEditorActiveTab] = useState<'form' | 'preview'>('form');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const invoiceRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const whatsappTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (data.client) {
      setWhatsAppRecipientPhone(data.client.whatsapp || data.client.phone || '');
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
          logo_letter: profile.logo_letter || INITIAL_BRANDING.logoLetter,
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
    if (invoices) setHistory(invoices.map(inv => ({ 
      id: inv.id, 
      timestamp: new Date(inv.created_at).getTime(), 
      category: inv.category as InvoiceCategory, 
      data: inv.full_data, 
      totalValue: Number(inv.total_value), 
      clientName: inv.client_name, 
      pdfUrl: inv.pdf_url,
      status: (inv.full_data.status || 'pending') as PaymentStatus
    })));
  };

  const loadExpenses = async () => {
    const { data: list } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (list) setExpenses(list.map(e => ({ 
      id: e.id, 
      description: e.description, 
      amount: Number(e.amount), 
      category: e.category, 
      date: e.date,
      status: (e.status || 'paid') as PaymentStatus
    })));
  };

  const loadDasPayments = async () => {
    const { data: list } = await supabase.from('das_payments').select('*');
    if (list) setDasPayments(list.map(d => ({ id: d.id, year: d.year, month: d.month, isPaid: d.is_paid })));
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchSearch = item.clientName.toLowerCase().includes(filterSearch.toLowerCase()) || 
                          item.data.invoiceNumber.includes(filterSearch);
      const matchCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;
      const itemDate = new Date(item.timestamp);
      const matchMonth = !filterMonth || (
        `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}` === filterMonth
      );
      return matchSearch && matchCategory && matchStatus && matchMonth;
    });
  }, [history, filterSearch, filterCategory, filterStatus, filterMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = e.description.toLowerCase().includes(expFilterSearch.toLowerCase());
      const matchCategory = expFilterCategory === 'all' || e.category === expFilterCategory;
      const matchMonth = !expFilterMonth || e.date.startsWith(expFilterMonth);
      return matchSearch && matchCategory && matchMonth;
    });
  }, [expenses, expFilterSearch, expFilterCategory, expFilterMonth]);

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearHistory = history.filter(h => new Date(h.timestamp).getFullYear() === currentYear);
    const totalAnnualRevenue = yearHistory.reduce((acc, curr) => acc + curr.totalValue, 0);
    const progress = Math.min(100, (totalAnnualRevenue / 81000) * 100);

    let relevantHistory = yearHistory;
    let relevantExpenses = expenses.filter(e => new Date(e.date).getFullYear() === currentYear);

    if (expFilterMonth) {
        relevantHistory = history.filter(h => {
            const d = new Date(h.timestamp);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === expFilterMonth;
        });
        relevantExpenses = expenses.filter(e => e.date.startsWith(expFilterMonth));
    }
    if (expFilterCategory !== 'all') relevantExpenses = relevantExpenses.filter(e => e.category === expFilterCategory);

    const categoryTotals: Record<string, number> = {};
    const baseExpensesForIcons = expFilterMonth ? expenses.filter(e => e.date.startsWith(expFilterMonth)) : expenses.filter(e => new Date(e.date).getFullYear() === currentYear);
    baseExpensesForIcons.forEach(e => categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount);

    const faturamentoBruto = relevantHistory.reduce((acc, curr) => acc + curr.totalValue, 0);
    const custoOperacional = relevantExpenses
      .filter(e => e.status === 'paid')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const histSelectedYear = history.filter(h => new Date(h.timestamp).getFullYear() === analyticsYear);
    const totalServicos = histSelectedYear.filter(h => h.category === 'service').reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalProdutos = histSelectedYear.filter(h => h.category === 'product').reduce((acc, curr) => acc + curr.totalValue, 0);
    
    const currentMonthNum = now.getMonth() + 1;
    const avgMonthly = totalAnnualRevenue / currentMonthNum;
    const projectedYearEnd = avgMonthly * 12;

    const clientRankingMap: Record<string, { total: number, count: number, lastDate: number }> = {};
    history.forEach(h => {
      if (!clientRankingMap[h.clientName]) clientRankingMap[h.clientName] = { total: 0, count: 0, lastDate: 0 };
      clientRankingMap[h.clientName].total += h.totalValue;
      clientRankingMap[h.clientName].count += 1;
      clientRankingMap[h.clientName].lastDate = Math.max(clientRankingMap[h.clientName].lastDate, h.timestamp);
    });

    const topClients = Object.entries(clientRankingMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, stats]) => ({ name, ...stats }));

    const inactiveClients = Object.entries(clientRankingMap)
      .filter(([_, stats]) => (Date.now() - stats.lastDate) > (1000 * 60 * 60 * 24 * 60)) // 60 days
      .sort((a, b) => a[1].lastDate - b[1].lastDate)
      .slice(0, 5)
      .map(([name, stats]) => ({ name, ...stats }));

    return { 
      totalAnnual: totalAnnualRevenue, 
      faturamentoBruto, custoOperacional, 
      lucroReal: faturamentoBruto - custoOperacional, 
      progress, categoryTotals, 
      dasn: { totalServicos, totalProdutos }, 
      forecasting: { avgMonthly, projectedYearEnd },
      crm: { topClients, inactiveClients }
    };
  }, [history, expenses, expFilterMonth, expFilterCategory, analyticsYear]);

  const togglePaymentStatus = async (item: InvoiceHistoryItem) => {
    const newStatus: PaymentStatus = item.status === 'paid' ? 'pending' : 'paid';
    const updatedFullData = { ...item.data, status: newStatus };
    const { error } = await supabase.from('invoices').update({ full_data: updatedFullData }).eq('id', item.id);
    if (!error) { showToast(`Status atualizado para ${newStatus === 'paid' ? 'PAGO' : 'PENDENTE'}.`, 'success'); loadHistory(); }
  };

  const toggleExpenseStatus = async (expense: Expense) => {
    const newStatus: PaymentStatus = expense.status === 'paid' ? 'pending' : 'paid';
    const { error } = await supabase.from('expenses').update({ status: newStatus }).eq('id', expense.id);
    if (!error) { showToast(`Despesa marcada como ${newStatus === 'paid' ? 'PAGA' : 'PENDENTE'}.`, 'success'); loadExpenses(); }
  };

  const handleOpenWhatsAppModalFromHistory = (item: InvoiceHistoryItem) => {
      setData(item.data);
      setWhatsAppRecipientPhone(item.data.client.whatsapp || item.data.client.phone || '');
      setIsWhatsAppModalOpen(true);
  };

  const handleGenerateContract = async () => {
    if (!contractClient || !contractRef.current) return showToast('Selecione um cliente e preencha os dados.', 'error');
    setIsEmitting(true);
    await new Promise(r => setTimeout(r, 500));
    try {
      const element = document.getElementById('contract-capture');
      if (!element) throw new Error("Element not found");
      const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Contrato_${contractClient.name}.pdf`);
      showToast('Contrato gerado com sucesso.', 'success');
    } catch { showToast('Erro ao gerar contrato.', 'error'); } finally { setIsEmitting(false); }
  };

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
    const { error } = await supabase.from('expenses').insert({ 
      user_id: session.user.id, 
      description: expenseForm.description, 
      amount, 
      category: expenseForm.category, 
      date: expenseForm.date,
      status: expenseForm.status
    });
    if (!error) { 
      showToast('Despesa registrada.', 'success'); 
      setExpenseForm({ ...expenseForm, description: '', amount: '', status: 'paid' }); 
      loadExpenses(); 
    }
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

    let content = `RELATÓRIO MENSAL - ${month}/${year}\nGERADO POR: ${data.provider.name}\n--------------------------------------------------\n\nDOCS EMITIDOS:\n`;
    filteredHist.forEach(h => content += `${new Date(h.timestamp).toLocaleDateString('pt-BR')} | ${h.data.invoiceNumber} | ${h.clientName} | ${formatCurrency(h.totalValue)} | ${h.status.toUpperCase()}\n`);
    content += `TOTAL EMISSÕES: ${formatCurrency(filteredHist.reduce((a,b) => a+b.totalValue, 0))}\n\nDESPESAS REGISTRADAS:\n`;
    filteredExp.forEach(e => content += `${formatDate(e.date)} | ${e.description} | ${e.category} | ${formatCurrency(e.amount)} | ${e.status.toUpperCase()}\n`);
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
        full_data: { ...data, pdfUrl: finalUrl, status: data.status || 'pending' },
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

  const handleSendWhatsAppFinal = () => {
    const phone = whatsAppRecipientPhone.replace(/\D/g, '');
    if (!phone) return showToast('Número de WhatsApp inválido.', 'error');
    if (!data.pdfUrl) return showToast('Gere o documento primeiro.', 'error');
    const parsedMessage = parseWhatsAppMessage(data.whatsappMessage || '');
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(parsedMessage)}`, '_blank');
    setIsWhatsAppModalOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({
          ...prev,
          branding: { ...prev.branding, logoImage: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyLink = () => {
    if (data.pdfUrl) { 
      navigator.clipboard.writeText(data.pdfUrl); 
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      showToast('Link copiado!', 'success'); 
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
    } catch (err: any) { showToast(err.message || 'Erro de autenticação.', 'error'); } finally { setIsLoggingIn(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setView('landing'); };
  const updateProvider = (field: keyof Entity, value: string) => setData(prev => ({ ...prev, provider: { ...prev.provider, [field]: value } }));
  const updateClient = (field: keyof Entity, value: string) => setData(prev => ({ ...prev, client: { ...prev.client, [field]: value } }));

  const parseContractTemplateText = (template: string) => {
    if (!contractClient) return template;
    const providerAddress = `${data.provider.street}, ${data.provider.number} - ${data.provider.city}/${data.provider.uf}`;
    const clientAddress = `${contractClient.street}, ${contractClient.number} - ${contractClient.city}/${contractClient.uf}`;
    return template
      .replace(/{{prestador_nome}}/g, data.provider.name)
      .replace(/{{prestador_doc}}/g, data.provider.taxId)
      .replace(/{{prestador_endereco}}/g, providerAddress)
      .replace(/{{cliente_nome}}/g, contractClient.name)
      .replace(/{{cliente_doc}}/g, contractClient.taxId)
      .replace(/{{cliente_endereco}}/g, clientAddress)
      .replace(/{{servico_descricao}}/g, contractForm.serviceDesc || '[DESCRIÇÃO]')
      .replace(/{{valor_total}}/g, contractForm.value ? formatCurrency(parseFloat(contractForm.value)) : '[VALOR]')
      .replace(/{{forma_pagamento}}/g, contractForm.paymentMethod)
      .replace(/{{prazo}}/g, contractForm.deadline)
      .replace(/{{cidade_foro}}/g, data.provider.city || '[CIDADE]')
      .replace(/{{data_hoje}}/g, new Date().toLocaleDateString('pt-BR'));
  };

  const renderFilterStatus = () => {
    const activeFilters = [];
    if (expFilterMonth) activeFilters.push(`Competência: ${expFilterMonth}`);
    if (expFilterCategory !== 'all') activeFilters.push(`Categoria: ${expFilterCategory}`);
    if (expFilterSearch) activeFilters.push(`Busca: "${expFilterSearch}"`);
    const hasFilters = activeFilters.length > 0;
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 animate-in fade-in duration-500">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${hasFilters ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}></div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">
                    {hasFilters ? `Análise: ${activeFilters.join(' • ')}` : `Geral Anual (${new Date().getFullYear()})`}
                </span>
            </div>
            {hasFilters && (
                <button onClick={() => { setExpFilterSearch(''); setExpFilterCategory('all'); setExpFilterMonth(''); }} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-all border border-rose-500/20">Limpar Filtros</button>
            )}
        </div>
    );
  };

  const scrollToTop = () => {
    if (sidebarRef.current) {
        sidebarRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-start lg:justify-center p-6 py-12 lg:py-16 relative overflow-x-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full bg-orb"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full bg-orb" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center z-10">
        
        {/* Left Side: The Pitch */}
        <div className="space-y-12 animate-in slide-in-from-left-10 duration-1000">
          <header className="space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-xl shadow-blue-600/30">N</div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight">
              Gestão <span className="text-blue-500">Premium</span><br/>para o seu MEI.
            </h1>
            <p className="text-lg md:text-2xl text-slate-400 font-medium leading-relaxed max-w-lg">
              Pare de perder tempo com planilhas. Emita notas, gerencie despesas e gere contratos em segundos.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 text-blue-500">✨</div>
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Notas em Segundos</h4>
                <p className="text-slate-500 text-sm mt-1">PDFs profissionais e automáticos para seus clientes.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 text-emerald-500">📊</div>
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Lucro Real</h4>
                <p className="text-slate-500 text-sm mt-1">Visão clara do seu saldo após despesas pagas.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 text-indigo-500">⚖️</div>
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Contratos Prontos</h4>
                <p className="text-slate-500 text-sm mt-1">Templates jurídicos para fechar negócios com segurança.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 text-rose-500">🏛️</div>
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Monitor DAS</h4>
                <p className="text-slate-500 text-sm mt-1">Controle suas obrigações mensais sem estresse.</p>
              </div>
            </div>
            {/* New Features Added Here */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 text-emerald-400">📱</div>
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Envio via WhatsApp</h4>
                <p className="text-slate-500 text-sm mt-1">Compartilhe links de faturas diretamente pelo celular.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 text-amber-500">🎯</div>
              <div>
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">Radar de Teto MEI</h4>
                <p className="text-slate-500 text-sm mt-1">Projeção inteligente contra o limite de faturamento.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-4 border-t border-white/5 w-fit">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] bg-slate-800 flex items-center justify-center text-[10px] font-bold">👤</div>)}
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Junte-se a +500 MEIs organizados</p>
          </div>
        </div>

        {/* Right Side: The Action (Login/Signup Card) */}
        <div className="flex justify-center animate-in slide-in-from-right-10 duration-1000">
          <div className="w-full max-w-md bg-[#0f172a]/40 backdrop-blur-3xl p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative">
            {/* Free Trial Badge */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 z-20 whitespace-nowrap">
              Degustação: 30 Dias Grátis
            </div>

            <div className="space-y-10">
              <header className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight">{authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Acesse o ecossistema NovaInvoice</p>
              </header>

              <form onSubmit={handleAuth} className="space-y-6">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <InputGroup label="Como quer ser chamado?" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Seu Nome Completo" />
                  </div>
                )}
                <InputGroup label="Seu E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="email@exemplo.com" />
                <InputGroup label="Sua Senha" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" />
                
                <div className="pt-4">
                  <button 
                    disabled={isLoggingIn} 
                    type="submit" 
                    className={`w-full py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all ${
                      authMode === 'login' 
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-indigo-600/20'
                    }`}
                  >
                    {isLoggingIn ? 'Processando...' : (authMode === 'login' ? 'Entrar no Sistema' : 'Ativar meu Teste Grátis')}
                  </button>
                </div>
              </form>

              <div className="text-center space-y-6">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
                  className="text-[10px] text-slate-400 hover:text-white font-black uppercase tracking-widest transition-all"
                >
                  {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                </button>
                
                <div className="pt-6 border-t border-white/5">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                    Ao se cadastrar, você concorda com nossos termos. <br/>
                    <span className="text-emerald-500/60">Acesso Premium liberado • Sem Cartão • Instantâneo</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Inter'] relative">
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
      
      {/* WhatsApp Send Modal */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in zoom-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-sm rounded-[3rem] border border-white/10 p-8 space-y-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]">
                <header className="space-y-2">
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Enviar Documento</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Protocolo de Envio WhatsApp</p>
                </header>
                <div className="space-y-6">
                    <InputGroup label="Número do WhatsApp (DDD + Número)" value={whatsAppRecipientPhone} onChange={e => setWhatsAppRecipientPhone(e.target.value)} placeholder="Ex: 11988887777" />
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Link do PDF</label>
                        <div className="flex gap-2">
                            <input readOnly value={data.pdfUrl || ''} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-blue-400 font-mono focus:outline-none" />
                            <button onClick={handleCopyLink} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-blue-400 flex items-center justify-center min-w-[44px]">
                                {linkCopied ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-emerald-400 animate-in zoom-in"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={handleSendWhatsAppFinal} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Abrir WhatsApp</button>
                    <button onClick={() => setIsWhatsAppModalOpen(false)} className="w-full py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">Cancelar</button>
                </div>
            </div>
        </div>
      )}

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
            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">Ecossistema Financeiro MEI</p>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
            <button onClick={() => { setData({ ...INITIAL_DATA, provider: data.provider, branding: data.branding }); setCurrentInvoiceId(null); setView('editor'); }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-left group hover:border-blue-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 bg-white/5 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
              <h3 className="text-xl font-black uppercase text-white">Nova Emissão</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Recibos Premium</p>
            </button>
            <button onClick={() => setView('history')} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-left group hover:border-blue-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 bg-white/5 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-blue-600 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg></div>
              <h3 className="text-xl font-black uppercase text-white">Histórico</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Gestão de Recebíveis</p>
            </button>
            <button onClick={() => setView('financial-hub')} className="p-8 bg-emerald-600/5 border border-emerald-600/10 rounded-[2.5rem] text-left group hover:border-emerald-600/50 transition-all shadow-xl">
              <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-emerald-600 transition-all text-emerald-500 group-hover:text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></div>
              <h3 className="text-xl font-black uppercase text-emerald-400">Hub Financeiro</h3>
              <p className="text-emerald-900 text-[9px] font-bold uppercase tracking-widest">Fluxo de Caixa</p>
            </button>
            <button onClick={() => setView('contracts')} className="p-8 bg-indigo-600/5 border border-indigo-600/10 rounded-[2.5rem] text-left group hover:border-indigo-600/50 transition-all shadow-xl">
              <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-indigo-600 transition-all text-indigo-400 group-hover:text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
              <h3 className="text-xl font-black uppercase text-indigo-400">Contratos</h3>
              <p className="text-indigo-900 text-[9px] font-bold uppercase tracking-widest">Express Jurídico</p>
            </button>
          </div>
        </div>
      ) : view === 'history' ? (
        <div className="p-6 md:p-16 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
           <header className="flex flex-col md:flex-row justify-between items-end gap-6">
             <div>
               <button onClick={() => setView('landing')} className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">← Voltar</button>
               <h1 className="text-5xl font-black tracking-tighter text-white">Histórico Cloud</h1>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex gap-2">
                {(['all', 'pending', 'paid'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : 'Pagos'}</button>
                ))}
             </div>
           </header>
           
           <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-xl flex flex-col md:flex-row gap-6">
             <div className="flex-1 relative">
               <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Pesquisar..." className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500/50" />
               <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" cy1="21" x2="16.65" y2="16.65"></line></svg>
             </div>
             <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase outline-none" />
           </section>

           <div className="space-y-4">
              {filteredHistory.map(item => (
                <div key={item.id} className="p-6 md:p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row items-center group gap-6">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all uppercase text-[10px]">
                    {item.status === 'paid' ? '✅' : '⏳'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-white text-xl uppercase tracking-tight">{item.clientName}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">#{item.data.invoiceNumber} • {new Date(item.timestamp).toLocaleDateString('pt-BR')}</p>
                      <button onClick={() => togglePaymentStatus(item)} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${item.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>{item.status === 'paid' ? 'Pago' : 'Pendente'}</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <span className="text-2xl font-black text-white">{formatCurrency(item.totalValue)}</span>
                    <div className="flex gap-2">
                       {(item.pdfUrl || item.status === 'pending') && (
                         <button onClick={() => handleOpenWhatsAppModalFromHistory(item)} className="p-3 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg" title="Enviar via WhatsApp">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                         </button>
                       )}
                       <button onClick={() => { setData(item.data); setCurrentInvoiceId(item.id); setView('editor'); }} className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase hover:text-white transition-all">Abrir</button>
                       {item.pdfUrl && <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl hover:bg-blue-500 hover:text-white transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      ) : view === 'contracts' ? (
        <div className="flex flex-col lg:flex-row h-screen animate-in fade-in duration-500">
           <aside className="w-full lg:w-[450px] bg-[#0f172a] border-r border-white/10 p-8 space-y-8 overflow-y-auto lg:h-screen no-print scrollbar-hide bg-[#0f172a]">
              <button onClick={() => setView('landing')} className="text-indigo-400 text-[10px] font-black uppercase mb-4">← Voltar</button>
              <h2 className="text-3xl font-black text-white tracking-tighter">Novo Contrato</h2>
              <section className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Template do Documento</label>
                  <select value={contractForm.templateId} onChange={e => setContractForm({...contractForm, templateId: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white appearance-none outline-none focus:border-indigo-500/50">
                    {CONTRACT_TEMPLATES.map(t => <option key={t.id} value={t.id} className="bg-[#0f172a]">{t.title}</option>)}
                  </select>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Cliente (CONTRATANTE)</span><button onClick={() => setIsContractClientModalOpen(true)} className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[8px] font-black uppercase">Selecionar</button></div>
                  <p className="text-xs font-bold text-white uppercase">{contractClient?.name || 'Não selecionado'}</p>
                </div>
                <InputGroup label="Objeto do Serviço" value={contractForm.serviceDesc} onChange={e => setContractForm({...contractForm, serviceDesc: e.target.value})} placeholder="Ex: Desenvolvimento de Web App" isTextArea />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Valor R$" type="number" value={contractForm.value} onChange={e => setContractForm({...contractForm, value: e.target.value})} />
                  <InputGroup label="Prazo (Dias)" type="number" value={contractForm.deadline} onChange={e => setContractForm({...contractForm, deadline: e.target.value})} />
                </div>
                <InputGroup label="Forma de Pagamento" value={contractForm.paymentMethod} onChange={e => setContractForm({...contractForm, paymentMethod: e.target.value})} placeholder="Ex: PIX ou Transferência" />
                
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Assinatura</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setContractForm({...contractForm, signatureType: 'physical'})} className={`py-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${contractForm.signatureType === 'physical' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-600'}`}>Física</button>
                    <button onClick={() => setContractForm({...contractForm, signatureType: 'digital'})} className={`py-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${contractForm.signatureType === 'digital' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-600'}`}>Digital</button>
                  </div>
                  <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed mt-2">
                    {contractForm.signatureType === 'digital' ? 'Selo de autenticidade será inserido no rodapé.' : 'Linhas para assinatura manual serão geradas.'}
                  </p>
                </div>
              </section>
              <button disabled={isEmitting} onClick={handleGenerateContract} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">{isEmitting ? 'Gerando...' : 'Gerar Contrato PDF'}</button>
           </aside>
           <main className="flex-1 bg-[#020617] p-10 flex justify-center items-start overflow-y-auto overflow-x-hidden scrollbar-hide">
              <div className="origin-top scale-[0.55] sm:scale-[0.75] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-100 transition-all duration-700">
                <ContractPreview 
                  content={parseContractTemplateText(CONTRACT_TEMPLATES.find(t => t.id === contractForm.templateId)?.content || '')}
                  provider={data.provider}
                  client={contractClient}
                  branding={data.branding}
                  signatureType={contractForm.signatureType}
                  docId={session.user.id}
                />
              </div>
           </main>
           <ClientSearchModal isOpen={isContractClientModalOpen} onClose={() => setIsContractClientModalOpen(false)} clients={savedClients} onSelect={c => { setContractClient(c); setIsContractClientModalOpen(false); }} onDelete={async tid => { await supabase.from('clients').delete().match({ user_id: session.user.id, tax_id: tid }); loadClients(); }} />
        </div>
      ) : view === 'financial-hub' ? (
        <div className="p-6 md:p-16 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
           <header className="flex justify-between items-end flex-wrap gap-6">
            <div>
              <button onClick={() => setView('landing')} className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">← Voltar</button>
              <h1 className="text-6xl font-black tracking-tighter text-white">Hub Financeiro</h1>
            </div>
            <div className="flex bg-white/5 p-2 rounded-3xl border border-white/10 shadow-lg overflow-x-auto">
               {(['das', 'expenses', 'analytics', 'crm'] as const).map(tab => (
                 <button key={tab} onClick={() => setFinancialTab(tab)} className={`px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap ${financialTab === tab ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
                   {tab === 'das' ? 'Monitor DAS' : tab === 'expenses' ? 'Despesas' : tab === 'analytics' ? 'Análise' : 'Relacionamento'}
                 </button>
               ))}
            </div>
          </header>

          <section>{renderFilterStatus()}</section>

          {financialTab === 'crm' ? (
            <div className="space-y-12 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] space-y-8 shadow-2xl">
                    <header>
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase">Top 5 Clientes</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ranking por Faturamento Bruto</p>
                    </header>
                    <div className="space-y-4">
                      {dashboardMetrics.crm.topClients.map((c, i) => (
                        <div key={c.name} className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs">#{i+1}</span>
                            <span className="font-bold text-white uppercase text-sm truncate max-w-[150px]">{c.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-white block">{formatCurrency(c.total)}</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase">{c.count} Documentos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-rose-500/5 border border-rose-500/10 p-10 rounded-[3.5rem] space-y-8 shadow-2xl">
                    <header>
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase">Clientes Sumidos</h3>
                      <p className="text-[10px] text-rose-500/60 font-bold uppercase tracking-widest mt-1">Inativos há mais de 60 dias</p>
                    </header>
                    <div className="space-y-4">
                      {dashboardMetrics.crm.inactiveClients.length === 0 ? (
                        <p className="text-slate-600 text-xs font-medium text-center py-20 uppercase tracking-widest">Todos os clientes estão ativos! 🎉</p>
                      ) : dashboardMetrics.crm.inactiveClients.map((c) => (
                        <div key={c.name} className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">💤</span>
                            <span className="font-bold text-white uppercase text-sm">{c.name}</span>
                          </div>
                          <button onClick={() => {
                            const phone = savedClients.find(sc => sc.name === c.name)?.whatsapp || '';
                            window.open(`https://api.whatsapp.com/send?phone=55${phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Olá ${c.name}! Tudo bem? Sentimos sua falta. Tem algum novo projeto que possamos ajudar?`)}`, '_blank');
                          }} className="px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">Reativar</button>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          ) : financialTab === 'das' ? (
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
                    <InputGroup label="O que adquiriu?" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                    <InputGroup label="Valor R$" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                    <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none">
                      {EXPENSE_CATEGORIES.map(c => <option key={c.name} value={c.name} className="bg-[#0f172a]">{c.name}</option>)}
                    </select>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status do Pagamento</label>
                      <div className="grid grid-cols-2 gap-3">
                         <button type="button" onClick={() => setExpenseForm(prev => ({ ...prev, status: 'paid' }))} className={`py-4 rounded-[1.5rem] border font-black text-[10px] uppercase tracking-widest transition-all ${expenseForm.status === 'paid' ? 'bg-emerald-600 border-emerald-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-600'}`}>Pago</button>
                         <button type="button" onClick={() => setExpenseForm(prev => ({ ...prev, status: 'pending' }))} className={`py-4 rounded-[1.5rem] border font-black text-[10px] uppercase tracking-widest transition-all ${expenseForm.status === 'pending' ? 'bg-rose-600 border-rose-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-600'}`}>Pendente</button>
                      </div>
                    </div>
                    <InputGroup label="Data" type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                    <button type="submit" className="w-full py-5 bg-emerald-600 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest">Adicionar Saída</button>
                 </form>
               </div>
               <div className="lg:col-span-2 space-y-4">
                 {filteredExpenses.map(e => (
                   <div key={e.id} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-between group">
                      <div className="flex items-center gap-6">
                        <span className="text-2xl">{EXPENSE_CATEGORIES.find(cat => cat.name === e.category)?.icon || "📎"}</span>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-black text-white text-lg uppercase leading-none">{e.description}</h4>
                            <button onClick={() => toggleExpenseStatus(e)} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-all ${e.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>{e.status === 'paid' ? 'Pago' : 'Pendente'}</button>
                          </div>
                          <p className="text-[9px] text-slate-500 uppercase mt-1">{formatDate(e.date)} • {e.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6"><span className="text-2xl font-black text-rose-500">{formatCurrency(e.amount)}</span><button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in slide-in-from-bottom-4">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-blue-600/10 border border-blue-500/20 p-10 rounded-[3.5rem] flex flex-col md:flex-row items-center gap-10">
                        <div className="space-y-4 flex-1">
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Previsão de Faturamento</h3>
                            <div className="flex items-end gap-3"><span className="text-5xl font-black text-white tracking-tighter">{formatCurrency(dashboardMetrics.forecasting.projectedYearEnd)}</span><span className="text-[10px] font-black text-blue-500 uppercase pb-2">Est. em Dez/31</span></div>
                            <p className="text-slate-400 text-xs font-medium">{dashboardMetrics.forecasting.projectedYearEnd > 81000 ? "⚠️ Risco crítico de ultrapassar o teto MEI." : "✅ Projeção segura dentro do teto MEI."}</p>
                        </div>
                        <div className="shrink-0 text-center space-y-2">
                            <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center ${dashboardMetrics.forecasting.projectedYearEnd > 81000 ? 'border-rose-500' : 'border-blue-500'} shadow-xl`}><span className="text-xl font-black text-white">{Math.round((dashboardMetrics.forecasting.projectedYearEnd / 81000) * 100)}%</span></div>
                            <span className="text-[8px] font-black text-slate-500 uppercase">Capacidade</span>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl">📦</div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Pack Contador</h3>
                        <div className="w-full space-y-4">
                            <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black outline-none text-center" />
                            <button onClick={handleExportPack} className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all">Baixar .TXT</button>
                        </div>
                    </div>
                </section>
                <section className="bg-white/5 border border-white/10 p-12 rounded-[4rem] space-y-12">
                    <header className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="space-y-1"><h3 className="text-3xl font-black uppercase text-white">Assistente DASN-SIMEI</h3><p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Fechamento Anual</p></div>
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">{[new Date().getFullYear()-1, new Date().getFullYear()].map(y => <button key={y} onClick={() => setAnalyticsYear(y)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${analyticsYear === y ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600'}`}>Ano {y}</button>)}</div>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="p-10 bg-white/[0.03] border border-white/5 rounded-[3rem] space-y-4">
                            <h4 className="text-xl font-black text-white uppercase tracking-tight">Prestação de Serviços</h4>
                            <p className="text-4xl font-black text-blue-500 tracking-tighter">{formatCurrency(dashboardMetrics.dasn.totalServicos)}</p>
                        </div>
                        <div className="p-10 bg-white/[0.03] border border-white/5 rounded-[3rem] space-y-4">
                            <h4 className="text-xl font-black text-white uppercase tracking-tight">Vendas / Comércio</h4>
                            <p className="text-4xl font-black text-emerald-500 tracking-tighter">{formatCurrency(dashboardMetrics.dasn.totalProdutos)}</p>
                        </div>
                    </div>
                </section>
                <section className="bg-white/5 border border-white/10 p-12 rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black uppercase text-white leading-none">Lucro Real Acumulado</h3>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Saldo líquido (Faturamento - Despesas Pagas)</p>
                    </div>
                    <div className="text-right">
                        <span className={`text-6xl font-black tracking-tighter ${dashboardMetrics.lucroReal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {formatCurrency(dashboardMetrics.lucroReal)}
                        </span>
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
              <button onClick={() => setEditorActiveTab('form')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${editorActiveTab === 'form' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Editor</button>
              <button onClick={() => setEditorActiveTab('preview')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${editorActiveTab === 'preview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Documento</button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 relative">
            <aside ref={sidebarRef} className={`w-full lg:w-[500px] bg-[#0f172a]/90 backdrop-blur-3xl border-r border-white/10 p-6 md:p-10 space-y-12 overflow-y-auto lg:h-screen no-print scrollbar-hide bg-[#0f172a] ${editorActiveTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
              <header className="hidden lg:flex justify-between items-center mb-6">
                 <button onClick={() => setView('landing')} className="text-3xl font-black text-blue-500 uppercase tracking-tighter">NovaInvoice</button>
                 <div className="flex gap-2">
                   <button onClick={() => setView('history')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                   <button onClick={() => setView('landing')} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                 </div>
              </header>

              <div className="space-y-12 pb-24">
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

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Observações</h3>
                   <InputGroup label="Informações Adicionais" value={data.notes} onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))} isTextArea />
                </section>

                <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Configurações de Envio</h3>
                   <div className="space-y-4">
                      <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mensagem WhatsApp</label>
                        <textarea ref={whatsappTextAreaRef} rows={4} value={data.whatsappMessage || ''} onChange={e => setData(prev => ({ ...prev, whatsappMessage: e.target.value }))} placeholder="Olá {{cliente}}..." className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 transition-all" />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {WHATSAPP_TAGS.map(item => (
                          <button key={item.tag} onClick={() => {
                            const textarea = whatsappTextAreaRef.current;
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const newText = (data.whatsappMessage || '').substring(0, start) + item.tag + (data.whatsappMessage || '').substring(end);
                            setData(prev => ({ ...prev, whatsappMessage: newText }));
                          }} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase text-blue-400 tracking-widest transition-all">{item.label}</button>
                        ))}
                      </div>
                   </div>
                </section>

                {/* Botão Subir ao Topo no final do fluxo do formulário */}
                <button 
                    onClick={scrollToTop}
                    className="w-full py-6 mt-4 text-slate-500 font-black uppercase text-[11px] tracking-[0.3em] hover:text-white transition-all flex items-center justify-center gap-3 bg-white/5 rounded-[2.5rem] border border-white/5 hover:border-white/20 shadow-xl"
                >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </div>
                    Subir ao Topo
                </button>

                <div className="sticky bottom-0 bg-[#0f172a]/95 pt-10 pb-16 border-t border-white/10 z-30 lg:block hidden">
                   <div className="flex flex-col gap-4">
                        <button 
                            disabled={!data.pdfUrl} 
                            onClick={() => setIsWhatsAppModalOpen(true)} 
                            className={`w-full py-5 rounded-[2.5rem] text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 ${!data.pdfUrl ? 'bg-slate-800 text-slate-600' : 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 active:scale-95'}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            {data.pdfUrl ? 'Enviar p/ WhatsApp' : 'Gere o PDF para Enviar'}
                        </button>
                        <button 
                            disabled={isEmitting} 
                            onClick={handlePrint} 
                            className={`w-full py-8 rounded-[3rem] text-white font-black uppercase text-[11px] tracking-[0.5em] shadow-2xl transition-all active:scale-95 ${isEmitting ? 'bg-blue-600/50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'}`}
                        >
                            {isEmitting ? 'Gerando...' : 'Gerar PDF Premium'}
                        </button>
                   </div>
                </div>
              </div>
            </aside>
            <main className={`flex-1 flex flex-col items-center lg:items-start p-4 sm:p-10 lg:p-12 overflow-y-auto lg:h-screen no-print scrollbar-hide bg-[#020617] ${editorActiveTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="w-full flex justify-center items-start lg:pt-10 py-10">
                <div className="relative w-[800px] origin-top scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.65] xl:scale-[0.85] 2xl:scale-100 transition-all duration-700 mx-auto">
                   <div ref={invoiceRef} className="shadow-[0_80px_160px_-40px_rgba(0,0,0,1)] bg-white"><InvoicePreview data={data} /></div>
                </div>
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
