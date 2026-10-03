// Emails de confirmación con Resend. Si no hay RESEND_API_KEY no se envía nada.
import { formatOrderNumber } from './orders.js'

const esc = (text) =>
  String(text ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
const money = (value) => `$${new Intl.NumberFormat('es-AR').format(value)}`

export const emailEnabled = (config) => Boolean(config.resendApiKey && config.emailFrom)

function itemsHtml(order) {
  return order.items
    .map(
      (item) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e4dccb"><strong>Promo ${esc(item.promo_title)}</strong><br>` +
        `<span style="color:#5b564f">${item.perfumes.map((p) => esc(p.name)).join(' · ')}</span></td>` +
        `<td style="padding:10px 0;border-bottom:1px solid #e4dccb;text-align:right;white-space:nowrap">${money(item.unit_price)}</td></tr>`,
    )
    .join('')
}

function layout(title, intro, order, extra = '') {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#14120f;line-height:1.5">
<p style="font-family:Georgia,serif;font-size:26px;letter-spacing:1px;margin:0 0 24px">GIORGIO <span style="font-size:11px;letter-spacing:4px">PERFUMERÍA</span></p>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 8px">${title}</h1>
<p style="margin:0 0 20px">${intro}</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${itemsHtml(order)}
<tr><td style="padding:10px 0">Envío a domicilio</td><td style="padding:10px 0;text-align:right">${money(order.shipping_cost)}</td></tr>
<tr><td style="padding:10px 0;border-top:2px solid #14120f"><strong>Total</strong></td><td style="padding:10px 0;border-top:2px solid #14120f;text-align:right"><strong>${money(order.total)}</strong></td></tr></table>
<p style="margin:20px 0 0"><strong>Entrega:</strong> ${esc(order.address)}${order.address_notes ? ` (${esc(order.address_notes)})` : ''}, ${esc(order.city)}</p>${extra}
</div>`
}

/** Envía la confirmación al cliente y el aviso al local. No lanza error si un envío falla. */
export async function sendOrderEmails(order, config, fetchImpl = fetch) {
  if (!emailEnabled(config)) return false
  const number = formatOrderNumber(order.number)

  const messages = [
    {
      to: order.customer_email,
      subject: `Recibimos tu pedido ${number}`,
      html: layout(
        '¡Gracias por tu compra!',
        `Hola ${esc(order.customer_name)}, tu pago se acreditó y tu pedido <strong>${number}</strong> ya está confirmado.`,
        order,
        '<p style="margin:20px 0 0;color:#5b564f">Te avisamos cuando salga para tu domicilio.</p>',
      ),
    },
    ...(config.shopEmail
      ? [
          {
            to: config.shopEmail,
            subject: `Nuevo pedido ${number} · ${money(order.total)}`,
            html: layout(
              `Nuevo pedido ${number}`,
              `Pago acreditado. Cliente: <strong>${esc(order.customer_name)}</strong> · ${esc(order.customer_phone)} · ${esc(order.customer_email)}`,
              order,
            ),
          },
        ]
      : []),
  ]

  const results = await Promise.allSettled(
    messages.map((message) =>
      fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${config.resendApiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: config.emailFrom, ...message }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Resend respondió ${response.status}`)
      }),
    ),
  )
  results.filter((r) => r.status === 'rejected').forEach((r) => console.error('[email]', r.reason?.message))
  return results.some((r) => r.status === 'fulfilled')
}
