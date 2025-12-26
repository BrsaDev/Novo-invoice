
export const CONTRACT_TEMPLATES = [
  {
    id: 'servicos-geral',
    title: 'Prestação de Serviços Geral',
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS

CONTRATADA: {{prestador_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{prestador_doc}}, residente e domiciliado(a) em {{prestador_endereco}}.

CONTRATANTE: {{cliente_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{cliente_doc}}, residente e domiciliado(a) em {{cliente_endereco}}.

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem como objeto a prestação de serviços de {{servico_descricao}} pela CONTRATADA à CONTRATANTE.

CLÁUSULA 2ª - DO VALOR E PAGAMENTO
Pela prestação dos serviços, a CONTRATANTE pagará à CONTRATADA o valor total de {{valor_total}}, a ser quitado via {{forma_pagamento}}.

CLÁUSULA 3ª - DO PRAZO
O prazo estimado para a execução dos serviços é de {{prazo}} dias, a contar da assinatura deste instrumento.

CLÁUSULA 4ª - DO FORO
As partes elegem o foro da comarca de {{cidade_foro}} para dirimir quaisquer dúvidas oriundas deste contrato.

Local e Data: {{data_hoje}}.

_________________________________
{{prestador_nome}} (CONTRATADA)

_________________________________
{{cliente_nome}} (CONTRATANTE)`
  },
  {
    id: 'consultoria',
    title: 'Consultoria Estratégica',
    content: `CONTRATO DE CONSULTORIA ESPECIALIZADA

Pelo presente instrumento particular, de um lado {{prestador_nome}} (CONSULTOR) e de outro {{cliente_nome}} (CLIENTE), resolvem celebrar o presente contrato:

1. ESCOPO DA CONSULTORIA
O CONSULTOR compromete-se a prestar auxílio técnico em {{servico_descricao}} através de reuniões e relatórios quinzenais.

2. HONORÁRIOS
O valor fixado é de {{valor_total}}, pagos conforme cronograma de entrega de marcos.

3. CONFIDENCIALIDADE
As partes comprometem-se a manter sigilo absoluto sobre informações comerciais compartilhadas durante a vigência deste contrato.

Assinado em {{data_hoje}}.`
  }
];
