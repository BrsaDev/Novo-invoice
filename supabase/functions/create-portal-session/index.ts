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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, returnUrl } = await req.json()
    if (!userId) throw new Error('userId obrigatório')

    // Busca customer id
    const { data: sub, error } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    const stripeCustomer = sub?.stripe_customer_id
    if (!stripeCustomer) throw new Error('stripe_customer_id não encontrado para o usuário')

    const params = new URLSearchParams()
    params.append('customer', stripeCustomer)
    if (returnUrl) params.append('return_url', returnUrl)

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY') ?? ''}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    const body = await res.json()
    if (!res.ok) {
      console.error('Stripe create portal session error', body)
      throw new Error(body.error?.message || 'Erro ao criar portal session')
    }

    return new Response(JSON.stringify({ url: body.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (err) {
    console.error('create-portal-session error', err)
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})