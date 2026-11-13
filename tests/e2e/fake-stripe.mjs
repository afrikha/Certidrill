// A tiny stand-in for Stripe, for the end-to-end tests (no network, no key).
// It answers the two API calls Certidrill makes (customers, Checkout
// sessions), serves a payment page, and on "Pay" sends the webhook signed
// with the test secret, as Stripe does: after the redirect, so the return
// page has to wait for it, then a second time, as Stripe may.
//   FAKE_STRIPE_PORT=12111 APP_URL=http://localhost:3100 STRIPE_WEBHOOK_SECRET=whsec_… node tests/e2e/fake-stripe.mjs
import { createServer } from "node:http";
import Stripe from "stripe";

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 12111);
const APP_URL = process.env.APP_URL ?? "http://localhost:3100";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e";
const AMOUNT = 1900;
const sessions = new Map();
let counter = 0;

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json", "request-id": `req_${++counter}` });
  res.end(JSON.stringify(body));
};

async function readForm(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return new URLSearchParams(body);
}

async function sendWebhook(session) {
  const payload = JSON.stringify({
    id: `evt_fake_${session.id}`,
    object: "event",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: session.id,
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        client_reference_id: session.clientReferenceId,
        metadata: session.metadata,
        amount_total: AMOUNT,
        currency: "eur",
        total_details: { amount_tax: 317 },
        payment_intent: `pi_fake_${session.id}`,
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  const res = await fetch(`${APP_URL}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body: payload });
  console.log(`[fake-stripe] webhook ${session.id}: ${res.status}`);
}

const page = (session) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fake Stripe Checkout</title></head>
<body><main><h1>Fake Stripe Checkout</h1><p>Amount: ${(AMOUNT / 100).toFixed(2)} EUR</p>
<form method="post" action="/pay/${session.id}"><button type="submit">Pay</button></form>
<p><a href="${session.cancelUrl}">Cancel</a></p></main></body></html>`;

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.method === "POST" && url.pathname === "/v1/customers") {
    await readForm(req);
    return json(res, 200, { id: `cus_fake_${++counter}`, object: "customer" });
  }
  if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
    const form = await readForm(req);
    const id = `cs_fake_${++counter}`;
    const metadata = {};
    for (const [k, v] of form) {
      const m = /^metadata\[(.+)\]$/.exec(k);
      if (m) metadata[m[1]] = v;
    }
    sessions.set(id, { id, metadata, clientReferenceId: form.get("client_reference_id"), successUrl: form.get("success_url"), cancelUrl: form.get("cancel_url") });
    return json(res, 200, { id, object: "checkout.session", url: `http://localhost:${PORT}/pay/${id}` });
  }
  const pay = /^\/pay\/([\w-]+)$/.exec(url.pathname);
  const session = pay && sessions.get(pay[1]);
  if (session && req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(page(session));
  }
  if (session && req.method === "POST") {
    res.writeHead(303, { location: session.successUrl.replace("{CHECKOUT_SESSION_ID}", session.id) });
    res.end();
    setTimeout(() => void sendWebhook(session).then(() => sendWebhook(session)).catch((err) => console.error("[fake-stripe]", err)), 1500);
    return;
  }
  if (url.pathname === "/health") return json(res, 200, { ok: true });
  return json(res, 404, { error: { message: `fake Stripe: no route ${req.method} ${url.pathname}` } });
}).listen(PORT, () => console.log(`[fake-stripe] listening on ${PORT}`));
