// Script para debugar chamada à Edge Function
// Execute no console do navegador

async function debugFunctionCall() {
  console.log('🔍 DEBUG DA CHAMADA À EDGE FUNCTION');
  console.log('====================================');

  // 1. Verificar se usuário está logado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('❌ Usuário não está logado:', userError);
    return;
  }

  console.log('✅ Usuário logado:', user.email);
  console.log('🆔 User ID:', user.id);

  // 2. Verificar URL da função
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session-enhanced`;
  console.log('📡 URL da função:', functionUrl);
  
  // 3. Testar chamada direta com fetch
  console.log('\n🧪 TESTE 1: Chamada direta com fetch...');
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        userId: user.id,
        flow: 'cancel_subscription',
        returnUrl: window.location.origin
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Corpo da resposta:', responseText);
    
    if (response.ok) {
      console.log('✅ Chamada bem-sucedida!');
      const data = JSON.parse(responseText);
      if (data.url) {
        console.log('🔗 URL do portal:', data.url);
        console.log('🚀 Redirecionando...');
        // window.location.href = data.url; // Descomente para redirecionar
      }
    } else {
      console.error('❌ Erro na resposta:', response.status, responseText);
    }
    
  } catch (fetchError) {
    console.error('❌ Erro no fetch:', fetchError);
  }

  // 4. Testar com supabase.functions.invoke
  console.log('\n🧪 TESTE 2: Chamada com supabase.functions.invoke...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session-enhanced', {
      body: {
        userId: user.id,
        flow: 'cancel_subscription',
        returnUrl: window.location.origin
      }
    });

    console.log('📊 Resposta do invoke:', { data, error });
    
    if (error) {
      console.error('❌ Erro no invoke:', error);
    } else {
      console.log('✅ Invoke bem-sucedido!');
      if (data?.url) {
        console.log('🔗 URL do portal:', data.url);
      }
    }
    
  } catch (invokeError) {
    console.error('❌ Erro no invoke:', invokeError);
  }

  // 5. Testar função original (sem -enhanced)
  console.log('\n🧪 TESTE 3: Chamada à função original...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        userId: user.id,
        flow: 'cancel_subscription',
        returnUrl: window.location.origin
      }
    });

    console.log('📊 Resposta da função original:', { data, error });
    
    if (error) {
      console.error('❌ Erro na função original:', error);
    } else {
      console.log('✅ Função original funciona!');
      if (data?.url) {
        console.log('🔗 URL do portal:', data.url);
      }
    }
    
  } catch (originalError) {
    console.error('❌ Erro na função original:', originalError);
  }

  // 6. Verificar variáveis de ambiente
  console.log('\n🌍 VARIÁVEIS DE AMBIENTE:');
  console.log('• VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  console.log('• VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO');

  console.log('\n🎯 ANÁLISE FINAL:');
  console.log('1. Se TESTE 1 funcionou = Edge Function está OK, problema é no supabase.functions.invoke');
  console.log('2. Se TESTE 2 funcionou = Hook está OK');
  console.log('3. Se TESTE 3 funcionou = Use a função original');
  console.log('4. Se nenhum funcionou = Problema na Edge Function ou rede');
}

// Execute: debugFunctionCall();
console.log('📋 Para executar o debug, chame: debugFunctionCall()');
