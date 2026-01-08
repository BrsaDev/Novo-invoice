import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Tratamento de Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { priceId, userId, userEmail, returnUrl } = await req.json()

    if (!priceId || !userId) {
      throw new Error("Dados insuficientes para criar checkout (priceId ou userId ausentes).")
    }

    // Monta os parâmetros no formato application/x-www-form-urlencoded
    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('client_reference_id', String(userId))
    if (userEmail) params.append('customer_email', String(userEmail))
    params.append('success_url', `${returnUrl}?success=true`)
    params.append('cancel_url', `${returnUrl}?canceled=true`)
    params.append('line_items[0][price]', String(priceId))
    params.append('line_items[0][quantity]', '1')
    params.append('metadata[userId]', String(userId))

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY') ?? ''}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    const session = await res.json()
    if (!res.ok) {
      console.error('Stripe error creating checkout session:', session)
      throw new Error(session.error?.message || 'Erro ao criar sessão no Stripe')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('create-checkout-session error:', error)
    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})