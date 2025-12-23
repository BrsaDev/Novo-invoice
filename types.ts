
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
  template?: 'classic' | 'modern' | 'minimal';
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
}

export interface InvoiceHistoryItem {
  id: string;
  timestamp: number;
  data: InvoiceData;
  totalValue: number;
  clientName: string;
}
