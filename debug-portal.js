// Script para diagnosticar problemas com o portal de assinatura
// Execute no console do navegador

async function debugPortalSession() {
  console.log('🔍 DIAGNÓSTICO DO PORTAL DE ASSINATURA');
  console.log('==========================================');

  // 1. Verificar se o usuário está logado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('👤 Usuário logado:', user ? 'SIM' : 'NÃO');
  if (userError) console.error('❌ Erro ao obter usuário:', userError);
  if (user) console.log('📧 Email:', user.email, '🆔 ID:', user.id);

  // 2. Verificar dados da assinatura
  if (user) {
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('\n📊 Dados da assinatura:');
    console.log('🔍 Query executada:', `SELECT * FROM subscriptions WHERE user_id = '${user.id}'`);
    console.log('📋 Resultado:', subData);
    console.log('❌ Erro:', subError);

    if (subData) {
      console.log('\n✅ Dados encontrados:');
      console.log('🔑 stripe_customer_id:', subData.stripe_customer_id);
      console.log('📋 stripe_subscription_id:', subData.stripe_subscription_id);
      console.log('📊 status:', subData.status);
      console.log('💰 price_id:', subData.price_id);
    } else {
      console.log('\n❌ Nenhuma assinatura encontrada para este usuário');
    }
  }

  // 3. Verificar variáveis de ambiente do frontend
  console.log('\n🌍 Variáveis de ambiente (Frontend):');
  console.log('🔗 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('🔑 Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO');

  // 4. Testar chamada manual à função
  if (user) {
    console.log('\n🧪 Testando chamada manual à função create-portal-session...');
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { 
          userId: user.id, 
          returnUrl: window.location.origin 
        }
      });
      
      console.log('📡 Resposta da função:');
      console.log('📄 Data:', data);
      console.log('❌ Error:', error);
      
      if (error) {
        console.log('\n🔍 Análise do erro:');
        console.log('Mensagem:', error.message);
        console.log('Tipo:', typeof error);
        console.log('Objeto completo:', JSON.stringify(error, null, 2));
      }
      
    } catch (err) {
      console.error('\n💥 Erro na chamada:', err);
    }
  }

  // 5. Verificar logs recentes (simulação)
  console.log('\n📋 Para verificar logs completos:');
  console.log('1. Vá para Supabase Dashboard → Edge Functions → create-portal-session');
  console.log('2. Clique na aba "Logs"');
  console.log('3. Procure por erros recentes');
  console.log('4. Verifique se as variáveis de ambiente estão configuradas:');
  console.log('   - STRIPE_SECRET_KEY');
  console.log('   - SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');

  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('1. Verifique se você tem uma assinatura ativa');
  console.log('2. Confirme se o stripe_customer_id está preenchido');
  console.log('3. Teste a função create-portal-session manualmente');
  console.log('4. Verifique os logs da Edge Function');
}

// Execute: debugPortalSession();
console.log('📋 Para executar o diagnóstico, chame: debugPortalSession()');
