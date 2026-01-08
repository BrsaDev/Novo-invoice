# 🚀 Instruções de Deploy - Edge Functions NovaInvoice

## 🔧 Problema Atual
A Edge Function `create-portal-session` não está registrando logs, o que indica que a versão corrigida ainda não foi deployada.

## 📋 Passos para Corrigir

### 1. Verificar Deploy Atual
1. Vá para **Supabase Dashboard** → **Edge Functions**
2. Clique em **`create-portal-session`**
3. Verifique o **status** do deploy:
   - 🟢 **Deployed** (verde) - OK
   - 🟡 **Deploying** (amarelo) - Aguarde
   - 🔴 **Failed** (vermelho) - Erro

### 2. Deploy da Versão Corrigida
1. Clique em **"Edit"**
2. **Copie todo o conteúdo** do arquivo `index-enhanced.ts`
3. **Cole no editor** (substitua TUDO)
4. Clique em **"Save"**
5. Clique em **"Deploy"**
6. **Aguarde o deploy** completar

### 3. Verificar Logs
1. Após o deploy, clique na aba **"Logs"**
2. Procure por logs recentes (últimos 5 minutos)
3. Deve aparecer:
   ```
   🚀 Enhanced portal session for user: [ID]
   📊 Subscription data: [dados]
   ✅ Found Stripe customer: [customer_id]
   📡 Final params: [parâmetros]
   ```

### 4. Testar Localmente
1. **Recarregue a página** do NovaInvoice (Ctrl+F5)
2. **Abra o console** (F12)
3. **Execute**: `debugPortalAvancado()`
4. **Tente cancelar** a assinatura
5. **Verifique os logs** no console e no Supabase

## 🎯 O que Deve Acontecer
- ✅ **Logs aparecem** no Supabase Dashboard
- ✅ **Cancelamento funciona** sem erro
- ✅ **Redirecionamento** para o portal do Stripe
- ✅ **Interface integrada** funciona perfeitamente

## 🚨 Se Persistir o Erro
1. **Verifique as variáveis de ambiente** na Edge Function:
   - `STRIPE_SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. **Teste manualmente** com curl:
   ```bash
   curl -X POST https://[SEU-PROJETO].supabase.co/functions/v1/create-portal-session \
     -H "Content-Type: application/json" \
     -d '{"userId":"[USER_ID]","flow":"cancel_subscription"}'
   ```

## 📞 Suporte
Se o problema persistir após seguir todos os passos:
1. **Capture prints** dos logs do Supabase
2. **Verifique o status** do deploy
3. **Confirme se as variáveis** estão configuradas
4. **Teste com diferentes usuários** se necessário

---
**Execute estes passos em ordem para resolver o problema dos logs!**
