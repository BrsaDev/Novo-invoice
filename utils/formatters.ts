
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatTaxId = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const getQrCodeUrl = (data: string, size: string = "150x150"): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(data)}&color=000000&bgcolor=ffffff`;
};

export const getPixQrCodeUrl = (key: string, amount: number, name: string, city: string): string => {
  return getQrCodeUrl(key);
};

export const getContractValidationUrl = (hash: string): string => {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?v=${hash}`;
};
