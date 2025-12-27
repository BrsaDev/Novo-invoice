
import { ContractComplexity, ContractClauses } from '../types';

export const CLAUSES_LIBRARY = {
  fines: {
    title: 'CLÁUSULA - DA MULTA POR ATRASO',
    content: 'O atraso no pagamento de qualquer parcela acarretará na incidência de multa moratória de 2% (dois por cento) sobre o valor devido, acrescido de juros de mora de 1% (um por cento) ao mês.'
  },
  resignation: {
    title: 'CLÁUSULA - DA RESCISÃO E AVISO PRÉVIO',
    content: 'Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias. O descumprimento do aviso prévio acarretará em multa equivalente a um mês de honorários.'
  },
  confidentiality: {
    title: 'CLÁUSULA - DA CONFIDENCIALIDADE',
    content: 'As partes comprometem-se a manter sigilo absoluto sobre todas as informações, documentos e dados técnicos trocados durante a execução deste contrato, sob pena de responder por perdas e danos.'
  },
  intellectualProperty: {
    title: 'CLÁUSULA - DA PROPRIEDADE INTELECTUAL',
    content: 'A propriedade intelectual e os direitos autorais sobre os produtos e materiais resultantes deste contrato pertencerão exclusivamente à CONTRATANTE após a quitação integral dos valores aqui acordados.'
  },
  lgpd: {
    title: 'CLÁUSULA - DA PROTEÇÃO DE DADOS (LGPD)',
    content: 'As partes declaram estar em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/18), comprometendo-se a coletar e tratar dados pessoais apenas para as finalidades estritas deste contrato.'
  },
  liabilityLimit: {
    title: 'CLÁUSULA - DA LIMITAÇÃO DE RESPONSABILIDADE',
    content: 'A responsabilidade civil da CONTRATADA por danos diretos resultantes de erro técnico fica limitada ao valor total efetivamente pago pela CONTRATANTE no âmbito deste contrato.'
  }
};

export const generateContractContent = (
  complexity: ContractComplexity,
  customClauses: ContractClauses,
  serviceDesc: string
): string => {
  let content = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS\n\n`;
  
  content += `CONTRATADA: {{prestador_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{prestador_doc}}, com sede em {{prestador_endereco}}.\n\n`;
  content += `CONTRATANTE: {{cliente_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente_doc}}, com sede em {{cliente_endereco}}.\n\n`;
  
  content += `CLÁUSULA 1ª - DO OBJETO\n`;
  content += `O presente contrato tem como objeto a prestação de serviços de ${serviceDesc || '{{servico_descricao}}'} pela CONTRATADA à CONTRATANTE.\n\n`;
  
  content += `CLÁUSULA 2ª - DO VALOR E PAGAMENTO\n`;
  content += `Pela prestação dos serviços, a CONTRATANTE pagará à CONTRATADA o valor total de {{valor_total}}, a ser quitado via {{forma_pagamento}}.\n\n`;
  
  content += `CLÁUSULA 3ª - DO PRAZO\n`;
  content += `O prazo estimado para a execução total dos serviços é de {{prazo}} dias, conforme cronograma acordado entre as partes.\n\n`;

  // Injeção de cláusulas baseada em complexidade e toggles
  if (customClauses.fines) {
    content += `${CLAUSES_LIBRARY.fines.title}\n${CLAUSES_LIBRARY.fines.content}\n\n`;
  }
  
  if (customClauses.resignation) {
    content += `${CLAUSES_LIBRARY.resignation.title}\n${CLAUSES_LIBRARY.resignation.content}\n\n`;
  }

  if (customClauses.confidentiality || complexity === 'advanced') {
    content += `${CLAUSES_LIBRARY.confidentiality.title}\n${CLAUSES_LIBRARY.confidentiality.content}\n\n`;
  }

  if (complexity !== 'basic') {
    if (customClauses.intellectualProperty || complexity === 'advanced') {
       content += `${CLAUSES_LIBRARY.intellectualProperty.title}\n${CLAUSES_LIBRARY.intellectualProperty.content}\n\n`;
    }
    if (customClauses.lgpd || complexity === 'advanced') {
       content += `${CLAUSES_LIBRARY.lgpd.title}\n${CLAUSES_LIBRARY.lgpd.content}\n\n`;
    }
  }

  if (customClauses.liabilityLimit && complexity === 'advanced') {
     content += `${CLAUSES_LIBRARY.liabilityLimit.title}\n${CLAUSES_LIBRARY.liabilityLimit.content}\n\n`;
  }

  content += `CLÁUSULA FINAL - DO FORO\n`;
  content += `As partes elegem o foro da comarca de {{cidade_foro}} para dirimir quaisquer dúvidas oriundas deste instrumento.\n\n`;
  
  content += `Local e Data: {{data_hoje}}.\n\n`;
  content += `_________________________________\n{{prestador_nome}} (CONTRATADA)\n\n`;
  content += `_________________________________\n{{cliente_nome}} (CONTRATANTE)`;

  return content;
};

export const CONTRACT_TEMPLATES = [
  {
    id: 'dinamico',
    title: 'Contrato Inteligente (Dinâmico)',
    content: '' // Gerado via função
  }
];
