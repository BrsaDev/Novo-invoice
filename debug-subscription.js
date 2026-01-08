// Script de diagnóstico para problemas de assinatura
// Execute no console do navegador na página de assinaturas

(async function debugSubscription() {
  console.log('🔍 DIAGNÓSTICO DE ASSINATURA - NovaInvoice');
  console.log('==========================================');
  
  // 1. Verificar se o usuário está logado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('👤 Usuário logado:', user ? 'SIM' : 'NÃO');
  if (userError) console.error('❌ Erro ao obter usuário:', userError);
  if (user) console.log('📧 Email:', user.email, '🆔 ID:', user.id);
  
  // 2. Verificar dados brutos da tabela subscriptions
  if (user) {
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    console.log('\n📊 Dados brutos da assinatura:');
    console.log('🔍 Query executada:', `SELECT * FROM subscriptions WHERE user_id = '${user.id}'`);
    console.log('📋 Resultado:', subData);
    console.log('❌ Erro:', subError);
    
    // 3. Verificar se há registros na tabela
    const { data: allSubs, error: allSubsError } = await supabase
      .from('subscriptions')
      .select('*');
    
    console.log('\n📋 Todas as assinaturas no banco:');
    console.log('📊 Total de registros:', allSubs?.length || 0);
    console.log('📄 Dados:', allSubs);
    console.log('❌ Erro:', allSubsError);
  }
  
  // 4. Verificar variáveis de ambiente do frontend
  console.log('\n🌍 Variáveis de ambiente (Frontend):');
  console.log('🔗 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('🔑 Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  console.log('💳 Stripe Price Founder:', import.meta.env.VITE_STRIPE_PRICE_FOUNDER);
  console.log('💳 Stripe Price Regular:', import.meta.env.VITE_STRIPE_PRICE_REGULAR);
  
  // 5. Testar chamada ao webhook manualmente
  console.log('\n🔧 Teste de webhook (simulação):');
  console.log('📡 Endpoint webhook:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`);
  console.log('⚠️  Para testar webhook: Configure no Stripe Dashboard para apontar para este endpoint');
  
  // 6. Verificar estado atual do hook useSubscription
  console.log('\n🎣 Estado do hook useSubscription:');
  console.log('⚠️  Verifique se o hook está sendo chamado e atualizando corretamente');
  
  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('1. Verifique se o webhook está configurado no Stripe Dashboard');
  console.log('2. Verifique se as variáveis de ambiente estão configuradas no Supabase');
  console.log('3. Verifique se a tabela subscriptions existe e tem dados');
  console.log('4. Teste o webhook com o Stripe CLI: stripe listen --forward-to localhost:3005');
})();
