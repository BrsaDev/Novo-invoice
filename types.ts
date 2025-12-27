
export type InvoiceCategory = 'service' | 'product';
export type PaymentStatus = 'pending' | 'paid';
export type SignatureType = 'physical' | 'digital';

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
