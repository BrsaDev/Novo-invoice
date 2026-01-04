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

export const getQrCodeUrl = (data: string, size: string = "300x300"): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(data)}&color=000000&bgcolor=ffffff&margin=2&qzone=1`;
};

/**
 * Limpa strings para o padrão ASCII exigido pelo PIX (sem acentos ou caracteres especiais)
 */
const cleanString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "")   // Mantém apenas letras, números e espaços
    .toUpperCase()
    .trim();
};

/**
 * Algoritmo CRC16 oficial para padrão PIX (CCITT-FALSE / Polinômio 0x1021)
 */
const calculateCRC16 = (payload: string): string => {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    let b = payload.charCodeAt(i);
    crc ^= (b << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/**
 * Formata campo no padrão EMV (ID + Tamanho + Valor)
 */
const formatEMVField = (id: string, value: string): string => {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
};

export const getPixQrCodeUrl = (key: string, amount: number, name: string, city: string): string => {
  if (!key) return '';
  
  // 1. Limpeza e formatação da chave
  let cleanKey = key.replace(/\s/g, '');
  // Se for celular (ex: 11988887777), adiciona +55 se não tiver
  if (/^\d{10,11}$/.test(cleanKey)) {
    cleanKey = `+55${cleanKey}`;
  }

  // 2. Sanitização do Nome e Cidade
  const cleanName = cleanString(name || 'PRESTADOR').substring(0, 25);
  const cleanCity = cleanString(city || 'SAO PAULO').substring(0, 15);
  const strAmount = amount.toFixed(2);

  // 3. Montagem do Merchant Account Info (Tag 26)
  const gui = formatEMVField('00', 'br.gov.bcb.pix');
  const keyPart = formatEMVField('01', cleanKey);
  const merchantAccountInfo = formatEMVField('26', gui + keyPart);
  
  // 4. Montagem dos campos obrigatórios
  const parts = [
    '000201', // Payload Format Indicator
    merchantAccountInfo,
    '52040000', // Merchant Category Code
    '5303986', // Currency Code (986 = BRL)
    formatEMVField('54', strAmount),
    '5802BR', // Country Code
    formatEMVField('59', cleanName),
    formatEMVField('60', cleanCity),
    '62070503***', // Additional Data (Tag 62, TXID *** para estático)
    '6304' // CRC16 Indicator (o valor do CRC vem após esses 4 dígitos)
  ];

  const payloadBase = parts.join('');
  const finalCrc = calculateCRC16(payloadBase);
  
  return getQrCodeUrl(payloadBase + finalCrc);
};

export const getContractValidationUrl = (hash: string): string => {
  if (!hash || hash === 'S/N' || hash === 'PENDENTE') return '';
  try {
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}?v=${hash}`;
  } catch (e) {
    return `/?v=${hash}`;
  }
};