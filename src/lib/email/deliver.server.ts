export interface DeliverEmailParams {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
}

export type DeliveryResult =
  | { configured: false }
  | { configured: true; success: true; provider: 'resend' | 'lovable'; providerMessageId: string | null }
  | { configured: true; success: false; provider: 'resend' | 'lovable'; reason: string }

/**
 * Sends transactional mail without depending on Lovable's queue worker.
 *
 * RESEND_API_KEY and EMAIL_FROM are runtime secrets/configuration. EMAIL_FROM
 * must use a sender/domain verified in Resend.
 */
export async function deliverEmailNow({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: DeliverEmailParams): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const lovableApiKey = process.env.LOVABLE_API_KEY?.trim()
  if (!apiKey && !lovableApiKey) return { configured: false }

  const from =
    process.env.EMAIL_FROM?.trim() ||
    'Lady Vanilla Ice <noreply@lady-vanillaice.com>'

  if (apiKey) try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    })

    const body = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null

    if (!response.ok) {
      const reason =
        body?.message || body?.name || `Resend returned HTTP ${response.status}`
      console.error('Direct email delivery failed', {
        provider: 'resend',
        status: response.status,
        reason,
      })
      return { configured: true, success: false, provider: 'resend', reason }
    }

    return {
      configured: true,
      success: true,
      provider: 'resend',
      providerMessageId: body?.id ?? null,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error('Direct email delivery failed', {
      provider: 'resend',
      reason,
    })
    return { configured: true, success: false, provider: 'resend', reason }
  }

  try {
    const { sendLovableEmail } = await import('@lovable.dev/email-js')
    await sendLovableEmail({
      to,
      from,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'transactional',
      idempotency_key: idempotencyKey,
    }, { apiKey: lovableApiKey!, sendUrl: process.env.LOVABLE_SEND_URL })
    return { configured: true, success: true, provider: 'lovable', providerMessageId: null }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error('Direct email delivery failed', { provider: 'lovable', reason })
    return { configured: true, success: false, provider: 'lovable', reason }
  }
}
