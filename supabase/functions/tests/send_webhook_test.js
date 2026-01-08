// Usage: node send_webhook_test.js <FUNCTION_URL> <PATH_TO_PAYLOAD_JSON> <STRIPE_WEBHOOK_SECRET>
import crypto from 'crypto';
import fs from 'fs';
// Node 18+ has global fetch; no need to import 'node-fetch'

async function main() {
  const [,, url, payloadPath, secret] = process.argv
  if (!url || !payloadPath || !secret) {
    console.error('Usage: node send_webhook_test.js <FUNCTION_URL> <PATH_TO_PAYLOAD_JSON> <STRIPE_WEBHOOK_SECRET>')
    process.exit(1)
  }
  const body = fs.readFileSync(payloadPath, 'utf8')
  const t = Math.floor(Date.now() / 1000)
  const signedPayload = `${t}.${body}`
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  const sig = `t=${t},v1=${hmac}`

  // If testing create-portal-session, we don't need the Stripe-Signature header; reuse for convenience
  const headers = { 'Content-Type': 'application/json' }
  if (payloadPath.includes('invoice') || payloadPath.includes('checkout')) headers['Stripe-Signature'] = sig

  const res = await fetch(url, { method: 'POST', headers, body })
  console.log('status', res.status)
  console.log(await res.text())
}

main().catch(err => { console.error(err); process.exit(1) })