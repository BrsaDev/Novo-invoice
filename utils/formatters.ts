
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
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export const getPixQrCodeUrl = (key: string, amount: number, name: string, city: string): string => {
  // Simplified static QR Code API for visual representation
  // In a real production environment, you'd use a BRCode payload generator
  const size = "150x150";
  const label = encodeURIComponent(`Pagamento ${formatCurrency(amount)}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(key)}&color=000000&bgcolor=ffffff`;
};
