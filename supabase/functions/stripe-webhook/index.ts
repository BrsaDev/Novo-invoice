import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string // Chave secreta para ignorar RLS
)

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY') as string
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

async function computeHmacSHA256(secret: string, payload: string) {
  const enc = new TextEncoder()
  const keyData = enc.encode(secret)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

async function verifyStripeSignature(payload: string, header: string | null, secret: string, tolerance = 300) {
  if (!header) return false
  const parts = header.split(',').map(p => p.split('='))
  const dict: Record<string, string> = {}
  for (const [k, v] of parts) dict[k] = v
  const t = Number(dict['t'])
  const v1 = dict['v1']
  if (!t || !v1) return false
  // check timestamp tolerance
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - t) > tolerance) return false
  const signedPayload = `${t}.${payload}`
  const computed = await computeHmacSHA256(secret, signedPayload)
  return secureCompare(computed, v1)
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
    },
  })
  if (!res.ok) throw new Error(`Stripe GET ${path} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

serve(async (req) => {
  try {
    const body = await req.text()
    const sigHeader = req.headers.get('stripe-signature')

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_WEBHOOK_SECRET')
      return new Response('Webhook misconfigured', { status: 500 })
    }

    const valid = await verifyStripeSignature(body, sigHeader, STRIPE_WEBHOOK_SECRET)
    if (!valid) return new Response('Invalid signature', { status: 400 })

    const event = JSON.parse(body)

    console.log('Received Stripe event', event.type)

    // Helper to locate user_id from subscription/customer identifiers
    async function findUserIdByStripeIds(stripeSubscriptionId?: string | null, stripeCustomerId?: string | null) {
      if (stripeSubscriptionId) {
        const { data, error } = await supabaseAdmin.from('subscriptions').select('user_id').eq('stripe_subscription_id', stripeSubscriptionId).maybeSingle()
        if (error) throw error
        if (data?.user_id) return data.user_id
      }
      if (stripeCustomerId) {
        const { data, error } = await supabaseAdmin.from('subscriptions').select('user_id').eq('stripe_customer_id', stripeCustomerId).maybeSingle()
        if (error) throw error
        if (data?.user_id) return data.user_id
      }
      return null
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const userId = session.client_reference_id
        const subscriptionId = session.subscription
        const stripeCustomerId = session.customer

        // If we have a subscription ID, fetch subscription for canonical data
        let subscriptionData: any = null
        if (subscriptionId) {
          subscriptionData = await stripeGet(`subscriptions/${subscriptionId}?expand[]=items.data.price`)
        }

        const priceId = subscriptionData?.items?.data?.[0]?.price?.id ?? null
        const currentPeriodEnd = subscriptionData?.current_period_end ? new Date(subscriptionData.current_period_end * 1000).toISOString() : null
        const status = subscriptionData?.status ?? 'active'

        // Update db using userId from checkout
        if (userId) {
          const updates: Record<string, any> = {
            status,
            price_id: priceId,
            updated_at: new Date().toISOString(),
          }
          if (subscriptionId) updates.stripe_subscription_id = subscriptionId
          if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId
          if (currentPeriodEnd) updates.current_period_end = currentPeriodEnd

          const { error } = await supabaseAdmin.from('subscriptions').upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
          if (error) throw error
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        const stripeInvoiceId = invoice.id
        const subscriptionId = invoice.subscription
        const stripeCustomerId = invoice.customer
        const amountPaid = invoice.amount_paid
        const currency = invoice.currency
        const status = invoice.status
        const invoicePdf = invoice.invoice_pdf

        const userId = await findUserIdByStripeIds(subscriptionId, stripeCustomerId)

        // Insert or upsert billing invoice
        const { error: invoiceError } = await supabaseAdmin.from('billing_invoices').upsert({
          stripe_invoice_id: stripeInvoiceId,
          user_id: userId,
          amount_paid: amountPaid,
          currency,
          status,
          full_data: invoice,
        }, { onConflict: 'stripe_invoice_id' })
        if (invoiceError) throw invoiceError

        // Optionally record a payment entry
        const paymentIntentId = invoice.payment_intent
        if (paymentIntentId) {
          const { error: payErr } = await supabaseAdmin.from('billing_payments').upsert({
            stripe_payment_intent: paymentIntentId,
            user_id: userId,
            amount: amountPaid,
            currency,
            status: 'succeeded',
            invoice_id: stripeInvoiceId,
            full_data: invoice,
          }, { onConflict: 'stripe_payment_intent' })
          if (payErr) throw payErr
        }

        // Update subscription status in DB if available
        if (subscriptionId) {
          const sub = await stripeGet(`subscriptions/${subscriptionId}?expand[]=items.data.price`)
          const priceId = sub?.items?.data?.[0]?.price?.id ?? null
          const currentPeriodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
          const status = sub?.status
          const userIdFromSub = await findUserIdByStripeIds(subscriptionId, stripeCustomerId)
          if (userIdFromSub) {
            const { error: uErr } = await supabaseAdmin.from('subscriptions').update({
              status,
              price_id: priceId,
              current_period_end: currentPeriodEnd,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            }).eq('user_id', userIdFromSub)
            if (uErr) throw uErr
          }
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const subscriptionId = invoice.subscription
        const stripeCustomerId = invoice.customer
        const userId = await findUserIdByStripeIds(subscriptionId, stripeCustomerId)

        // update subscription to past_due/unpaid
        if (userId) {
          const { error } = await supabaseAdmin.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('user_id', userId)
          if (error) throw error
        }

        // upsert invoice record as failed
        const { error: invoiceErr } = await supabaseAdmin.from('billing_invoices').upsert({
          stripe_invoice_id: invoice.id,
          user_id: userId,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          full_data: invoice,
        }, { onConflict: 'stripe_invoice_id' })
        if (invoiceErr) throw invoiceErr

        break
      }

      case 'customer.subscription.updated': {
        const subObj = event.data.object as any
        const subscriptionId = subObj.id
        const stripeCustomerId = subObj.customer
        const priceId = subObj.items?.data?.[0]?.price?.id ?? null
        const currentPeriodEnd = subObj.current_period_end ? new Date(subObj.current_period_end * 1000).toISOString() : null
        const status = subObj.status

        const userId = await findUserIdByStripeIds(subscriptionId, stripeCustomerId)
        if (userId) {
          const { error } = await supabaseAdmin.from('subscriptions').update({
            status,
            price_id: priceId,
            current_period_end: currentPeriodEnd,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId)
          if (error) throw error
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subObj = event.data.object as any
        const subscriptionId = subObj.id
        const stripeCustomerId = subObj.customer
        const userId = await findUserIdByStripeIds(subscriptionId, stripeCustomerId)
        if (userId) {
          const { error } = await supabaseAdmin.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', userId)
          if (error) throw error
        }
        break
      }

      default:
        console.log('Unhandled event type', event.type)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error('Webhook handler error', err)
    return new Response(`Webhook Error: ${err?.message ?? String(err)}`, { status: 400 })
  }
})