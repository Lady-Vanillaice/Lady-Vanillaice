import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const SITE_NAME = 'Lady Vanilla Ice'
const SENDER_DOMAIN = 'notify.lady-vanillaice.com'
const FROM_DOMAIN = 'lady-vanillaice.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface EnqueueParams {
  templateName: string
  recipientEmail?: string
  templateData?: Record<string, any>
  idempotencyKey?: string
  /** Optional extra metadata (e.g. { booking_id }) stored on the email_send_log row. */
  metadata?: Record<string, any>
}

/**
 * Server-side helper to render a registered template and push it onto the
 * transactional_emails queue. Use for sends triggered by public/unauthenticated
 * flows (the /lovable/email/transactional/send route requires a user JWT).
 */
export async function enqueueTransactionalEmail({
  templateName,
  recipientEmail,
  templateData = {},
  idempotencyKey,
  metadata,
}: EnqueueParams): Promise<{ success: boolean; reason?: string }> {
  const template = TEMPLATES[templateName]
  if (!template) {
    console.error('Template not found', { templateName })
    return { success: false, reason: 'template_not_found' }
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) {
    return { success: false, reason: 'missing_recipient' }
  }

  const normalizedEmail = effectiveRecipient.toLowerCase()
  const messageId = crypto.randomUUID()
  const idem = idempotencyKey || messageId

  // Merge template_data + subject into metadata so the admin UI can re-render
  // the exact preview later, plus any custom metadata (e.g. booking_id).
  const logMetadata: Record<string, any> = {
    ...(metadata ?? {}),
    template_data: templateData,
  }

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressed) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      metadata: logMetadata,
    })
    return { success: false, reason: 'email_suppressed' }
  }

  // Get or create unsubscribe token
  let unsubscribeToken: string
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else {
    unsubscribeToken = generateToken()
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    const { data: stored } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (stored?.token) unsubscribeToken = stored.token
  }

  // Render
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const plainText = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
    metadata: { ...logMetadata, subject },
  })

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idem,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue email', { error: enqueueError, templateName })
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
      metadata: logMetadata,
    })
    return { success: false, reason: 'enqueue_failed' }
  }

  return { success: true }
}

