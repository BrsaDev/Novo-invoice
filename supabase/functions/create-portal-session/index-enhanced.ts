import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, returnUrl, cancel_at_period_end, flow } = await req.json()
    console.log('🚀 Enhanced portal session for user:', userId, { flow, cancel_at_period_end })
    
    if (!userId) {
      throw new Error('userId obrigatório')
    }

    // Busca customer id com tratamento robusto
    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, status, price_id')
      .eq('user_id', userId)
      .maybeSingle()
    
    console.log('📊 Subscription data:', sub)
    
    if (error) {
      console.error('❌ Database error:', error)
      throw new Error('Erro ao buscar assinatura no banco de dados')
    }
    
    if (!sub) {
      console.error('❌ No subscription found for user:', userId)
      throw new Error('Nenhuma assinatura encontrada. Faça uma assinatura para acessar o portal.')
    }
    
    const stripeCustomer = sub.stripe_customer_id
    if (!stripeCustomer) {
      console.error('❌ No stripe_customer_id for user:', userId)
      throw new Error('ID do cliente Stripe não encontrado. Verifique se seu pagamento foi processado.')
    }

    console.log('✅ Found Stripe customer:', stripeCustomer)

    // Parâmetros adicionais para debug
    console.log('🔍 Request parameters:', {
      cancel_at_period_end,
      flow,
      has_customer_id: !!stripeCustomer,
      has_subscription_id: !!sub.stripe_subscription_id,
      subscription_status: sub.status,
      price_id: sub.price_id
    })

    // Criar portal session via API REST com FormData correto
    const params = new URLSearchParams()
    params.append('customer', stripeCustomer)
    
    if (returnUrl) {
      params.append('return_url', returnUrl)
    }
    
    // Parâmetros específicos para diferentes fluxos
    if (cancel_at_period_end) {
      params.append('cancel_at_period_end', 'true')
      console.log('🔍 Setting cancel_at_period_end = true')
    }
    
    if (flow === 'manage_payment_methods') {
      params.append('flow', 'manage_payment_methods')
      console.log('🔍 Setting flow = manage_payment_methods')
    }
    
    if (flow === 'update_subscription') {
      params.append('flow', 'update_subscription')
      console.log('🔍 Setting flow = update_subscription')
    }
    
    if (flow === 'cancel_subscription') {
      params.append('flow', 'cancel_subscription')
      console.log('� Setting flow = cancel_subscription')
    }

    console.log('📡 Final params:', Object.fromEntries(params))
    console.log('📡 Calling Stripe API with params:', params.toString())

    const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16'
      },
      body: params.toString()
    })

    console.log('📡 Stripe response status:', stripeResponse.status)

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text()
      console.error('❌ Stripe API error:', errorBody)
      throw new Error(`Erro na API do Stripe (${stripeResponse.status}): ${errorBody}`)
    }

    const sessionData = await stripeResponse.json()
    console.log('✅ Portal session created:', sessionData.id)

    return new Response(
      JSON.stringify({ 
        url: sessionData.url,
        flow: flow,
        cancel_at_period_end: cancel_at_period_end
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 200 
      }
    )
  } catch (err: any) {
    console.error('❌ create-portal-session error:', err)
    return new Response(
      JSON.stringify({ 
        error: err?.message || String(err) 
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 400 
      }
    )
  }
})
