// Script para verificar se as variáveis de ambiente estão configuradas
// Execute no console do navegador

function checkEnvironment() {
  console.log('🌍 Verificando variáveis de ambiente...');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PRICE_FOUNDER',
    'VITE_STRIPE_PRICE_REGULAR'
  ];
  
  const status = {};
  
  requiredVars.forEach(varName => {
    const value = import.meta.env[varName];
    status[varName] = {
      exists: !!value,
      value: value ? (varName.includes('KEY') ? 'CONFIGURADO' : value) : 'NÃO CONFIGURADO'
    };
  });
  
  console.table(status);
  
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;
  console.log('📡 URL do Webhook:', webhookUrl);
  
  // Verificar se a URL é válida
  if (import.meta.env.VITE_SUPABASE_URL) {
    console.log('✅ URL base do Supabase configurada');
    console.log('🔗 Webhook completo:', webhookUrl);
  } else {
    console.log('❌ URL base do Supabase não configurada');
  }
  
  console.log('\n🔧 Variáveis de ambiente necessárias no Supabase (Edge Functions):');
  console.log('- STRIPE_SECRET_KEY');
  console.log('- STRIPE_WEBHOOK_SECRET');
  console.log('\n📍 Configure em: Supabase Dashboard → Settings → Edge Functions');
}

// Execute: checkEnvironment();
checkEnvironment();
