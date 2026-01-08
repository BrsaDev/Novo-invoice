
# Guia de Funcionamento e Integrações - NovaInvoice

O **NovaInvoice** é uma plataforma "Premium Cloud" focada na profissionalização do faturamento para MEIs e Profissionais Liberais.

## 1. Fluxo de Experiência do Usuário (UX)

### Autenticação e Onboarding
1. O usuário acessa a Landing Page e realiza Login/Cadastro.
2. Ao entrar, um **Trigger no Banco de Dados** cria automaticamente um período de teste (Trial) de 30 dias na tabela `subscriptions`.
3. O Dashboard apresenta os 5 pilares: Emissão, Histórico, Financeiro, Contratos e Assinatura.

### Emissão de Documentos (O Coração do Sistema)
- **Editor em Tempo Real:** O usuário preenche os dados à esquerda e vê o PDF "Pixel Perfect" à direita.
- **Branding Dinâmico:** Cores, logos e templates (Classic/Modern/Minimal) alteram o CSS do PDF instantaneamente.
- **Emissão:** O sistema utiliza `html2canvas` + `jsPDF` para gerar o arquivo no browser, faz upload para o Supabase Storage e gera um link curto (via `spoo.me`) para o WhatsApp.

---

## 2. Integrações Estratégicas

### 💳 Monetização (Stripe)
- **Checkout:** Quando o trial expira ou o usuário clica em "Assinar", ele é levado ao Checkout seguro do Stripe.
- **Portal do Cliente:** O assinante Premium tem um card exclusivo na Home. Ao clicar, ele acessa o **Stripe Billing Portal**, onde pode atualizar cartão, ver faturas anteriores ou cancelar o plano sem intervenção humana.
- **Webhooks:** O Stripe comunica ao Supabase (via Edge Functions) quando um pagamento é confirmado, atualizando o status para `active` em tempo real.

### 📱 Comunicação (WhatsApp Business API)
- Integração via URL Protocol.
- Permite o envio do PDF já hospedado com uma mensagem personalizada: *"Olá [Cliente], segue o link do seu documento..."*.

### ⚖️ Jurídico (Contratos Inteligentes)
- Gerador dinâmico de cláusulas baseado em níveis de complexidade.
- **Validação Cloud:** Cada contrato gera um `contract_hash`. O rodapé contém um QR Code que aponta para o portal de validação do NovaInvoice, permitindo que o cliente final verifique a autenticidade do documento em nossos servidores.

### 📊 Inteligência Financeira (MEI Hub)
- **Radar DASN:** Monitoramento do faturamento acumulado contra o teto anual do MEI (R$ 81.000).
- **Projeção Tripartite:** Analytics que separa o que já foi **Pago**, o que é **Esperado** (pendente) e o que está **Projetado** (contratos recorrentes).
- **Exportação Pack Contador:** Gera um arquivo `.CSV` consolidado com todas as entradas e saídas do mês, pronto para o fechamento contábil.

---

## 3. Pilares Visuais
- **Estética Dark Mode:** Interface focada em reduzir a fadiga visual durante o faturamento.
- **Cards de Vidro (Glassmorphism):** Uso intenso de `backdrop-blur` e bordas semitransparentes.
- **Animações de Status:** O card de assinatura pulsa em violeta (`animate-pulse-glow`) quando o usuário é Premium, reforçando o valor do serviço.
