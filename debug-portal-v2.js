// Script avançado para diagnosticar problemas com o portal de assinatura
// Execute no console do navegador

async function debugPortalAvancado() {
  console.log('🔍 DIAGNÓSTICO AVANÇADO DO PORTAL - NovaInvoice');
  console.log('======================================================');

  // 1. Verificar estado completo da assinatura
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('\n👤 AUTENTICAÇÃO:');
  console.log('Usuário logado:', user ? 'SIM' : 'NÃO');
  if (userError) console.error('❌ Erro auth:', userError);
  if (user) {
    console.log('📧 Email:', user.email);
    console.log('🆔 User ID:', user.id);
  }

  // 2. Buscar dados COMPLETOS da assinatura
  if (user) {
    console.log('\n📊 BUSCANDO DADOS COMPLETOS DA ASSINATURA...');
    
    try {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 Query executada:', `SELECT * FROM subscriptions WHERE user_id = '${user.id}'`);
      
      if (subError) {
        console.error('❌ Erro na query:', subError);
        console.log('Detalhes do erro:', JSON.stringify(subError, null, 2));
      } else {
        console.log('✅ Dados encontrados:');
        console.log('📋 Registro completo:', JSON.stringify(subData, null, 2));
        
        if (subData) {
          console.log('\n🔑 ANÁLISE DOS CAMPOS:');
          console.log('• user_id:', subData.user_id);
          console.log('• status:', subData.status);
          console.log('• price_id:', subData.price_id);
          console.log('• stripe_customer_id:', subData.stripe_customer_id);
          console.log('• stripe_subscription_id:', subData.stripe_subscription_id);
          console.log('• trial_ends_at:', subData.trial_ends_at);
          console.log('• updated_at:', subData.updated_at);
          
          console.log('\n🎯 ANÁLISE LÓGICA:');
          console.log('• Tem stripe_customer_id?', !!subData.stripe_customer_id);
          console.log('• Status é "active"?', subData.status === 'active');
          console.log('• Deveria mostrar botão?', !!subData.stripe_customer_id && subData.status === 'active');
        } else {
          console.log('❌ NENHUMA ASSINATURA ENCONTRADA!');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao buscar assinatura:', err);
    }
  }

  // 3. Testar chamada à função com timeout e retry
  if (user) {
    console.log('\n🧪 TESTANDO CHAMADA À FUNÇÃO...');
    
    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { 
          userId: user.id, 
          returnUrl: window.location.origin 
        }
      });
      
      const endTime = Date.now();
      console.log(`⏱️ Tempo de resposta: ${endTime - startTime}ms`);
      
      console.log('📡 RESPOSTA DA FUNÇÃO:');
      console.log('• Data:', data);
      console.log('• Error:', error);
      
      if (error) {
        console.log('\n🔍 ANÁLISE DO ERRO:');
        console.log('• Tipo:', typeof error);
        console.log('• Mensagem:', error.message);
        console.log('• Objeto completo:', JSON.stringify(error, null, 2));
        
        // Verificar se é erro de rede vs erro de backend
        if (error.message?.includes('Failed to fetch')) {
          console.log('🌐 PROVÁVEL ERRO DE REDE/FETCH');
          console.log('Sugestão: Verifique conexão, CORS, ou se a função está ativa');
        } else if (error.message?.includes('stripe_customer_id')) {
          console.log('🗄️ ERRO DE BACKEND - DADOS NÃO ENCONTRADOS');
          console.log('Sugestão: Verifique se a assinatura foi salva no banco');
        }
      }
      
    } catch (fetchErr) {
      console.error('❌ ERRO DE FETCH/REDE:', fetchErr);
      console.log('Sugestão: Verifique conexão com a internet');
    }
  }

  // 4. Verificar variáveis de ambiente do frontend
  console.log('\n🌍 VARIÁVEIS DE AMBIENTE (FRONTEND):');
  console.log('• VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  console.log('• VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO');

  // 5. Verificar se a URL da função está correta
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`;
  console.log('\n📡 URL DA FUNÇÃO:');
  console.log('• URL completa:', functionUrl);
  console.log('• Teste manual:', `curl -X POST ${functionUrl} -H "Content-Type: application/json" -d '{"userId":"${user?.id}","returnUrl":"${window.location.origin}"}'`);

  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('1. Verifique se os dados da assinatura estão corretos no banco');
  console.log('2. Confirme se a Edge Function está deployada e ativa');
  console.log('3. Verifique as variáveis de ambiente na Edge Function');
  console.log('4. Teste a chamada manualmente com o curl acima');
  console.log('5. Verifique os logs da Edge Function no Supabase Dashboard');

  console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
}

// Execute: debugPortalAvancado();
console.log('📋 Para executar o diagnóstico avançado, chame: debugPortalAvancado()');
