
export type InvoiceCategory = 'service' | 'product';
export type PaymentStatus = 'pending' | 'paid';
export type SignatureType = 'physical' | 'digital';
export type ContractStatus = 'active' | 'finished' | 'canceled';
export type ContractPeriodicity = 'one-time' | 'monthly' | 'periodic';
export type ContractComplexity = 'basic' | 'intermediate' | 'advanced';

export type ViewState = 'landing' | 'editor' | 'history' | 'financial-hub' | 'contracts' | 'validator' | 'subscriptions';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'none';

export interface UserSubscription {
  status: SubscriptionStatus;
  trial_ends_at: string;
  price_id?: string;
  is_founder?: boolean;
}

export interface ContractClauses {
  fines: boolean;
  resignation: boolean;
  confidentiality: boolean;
  intellectualProperty: boolean;
  lgpd: boolean;
  liabilityLimit: boolean;
}

export interface Entity {
  name: string;
  tradingName?: string;
  taxId: string;
  im?: string;
  ie?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  uf: string;
  email: string;
  phone: string;
  whatsapp?: string;
  pixKey?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitValue: number;
  unit?: string;
}

export interface Taxes {
  inss: number;
  ir: number;
  pis: number;
  cofins: number;
  csll: number;
  others: number;
}

export interface Branding {
  primaryColor: string;
  secondaryColor: string;
  logoLetter: string;
  logoImage?: string;
  template: 'classic' | 'modern' | 'minimal';
}

export interface InvoiceLabels {
  documentTitle: string;
  documentSubtitle: string;
  providerSection: string;
  clientSection: string;
  itemsSection: string;
  notesLabel: string;
  serviceCodeLabel: string;
  cnaeLabel: string;
  signatureLabel: string;
  totalLabel: string;
}

export interface InvoiceData {
  category: InvoiceCategory;
  invoiceNumber: string;
  serie: string;
  issueDate: string;
  competency: string;
  provider: Entity;
  client: Entity;
  items: InvoiceItem[];
  notes: string;
  serviceCode: string;
  cnae: string;
  taxRate: number;
  taxes: Taxes;
  discount: number;
  labels: InvoiceLabels;
  branding: Branding;
  pdfUrl?: string;
  whatsappMessage?: string;
  status?: PaymentStatus;
  contractRef?: string;
}

export interface InvoiceHistoryItem {
  id: string;
  timestamp: number;
  category: InvoiceCategory;
  data: InvoiceData;
  totalValue: number;
  clientName: string;
  pdfUrl?: string;
  status: PaymentStatus;
}

export interface ContractHistoryItem {
  id: string;
  clientName: string;
  value: number;
  templateId: string;
  signatureType: SignatureType;
  pdfUrl: string;
  createdAt: string;
  status: ContractStatus;
  periodicity: ContractPeriodicity;
  contractHash: string;
  fullData: any;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: PaymentStatus;
}

export interface DasPayment {
  id?: string;
  year: number;
  month: number;
  isPaid: boolean;
}

export interface ContractTemplate {
  id: string;
  title: string;
  content: string;
}
