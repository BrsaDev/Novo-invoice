// Script para testar manualmente a Edge Function stripe-webhook
// Execute no console do navegador

async function testWebhook() {
  console.log('🧪 Testando Edge Function stripe-webhook...');
  
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;
  
  // Simulação de um evento checkout.session.completed
  const mockEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        client_reference_id: 'USER_ID_AQUI', // Substitua pelo ID real do usuário
        subscription: 'sub_test_123',
        customer: 'cus_test_123'
      }
    }
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Nota: Sem assinatura real, vai dar erro mas vamos ver se a função responde
      },
      body: JSON.stringify(mockEvent)
    });
    
    const result = await response.text();
    console.log('📡 Status:', response.status);
    console.log('📄 Resposta:', result);
    
    if (response.status === 400 && result.includes('Invalid signature')) {
      console.log('✅ Função está ativa, mas precisa de assinatura válida');
    } else if (response.status === 500) {
      console.log('❌ Erro interno na função');
    } else {
      console.log('🤔 Resposta inesperada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
  }
}

// Execute: testWebhook();
console.log('📋 Para executar o teste, chame: testWebhook()');
console.log('🔧 Não se esqueça de substituir USER_ID_AQUI pelo ID real do usuário');
