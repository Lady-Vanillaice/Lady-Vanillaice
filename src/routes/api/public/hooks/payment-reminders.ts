import { createFileRoute } from '@tanstack/react-router'

// Runs on a schedule (pg_cron). Sends a one-time payment reminder for
// confirmed bookings where the 50% deposit is still open 24h after the
// request came in. Idempotent: skips bookings that already received a
// payment-reminder email.
export const Route = createFileRoute('/api/public/hooks/payment-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require the service-role bearer token — matches the email queue
        // processor and prevents anonymous callers from spamming reminders.
        const authHeader = request.headers.get('authorization') ?? ''
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        const expected = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
        if (!token || !expected || token !== expected) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { enqueueTransactionalEmail } = await import('@/lib/email/enqueue.server')

        const now = Date.now()
        const cutoffOldest = new Date(now - 1000 * 60 * 60 * 24 * 14).toISOString() // 14 days back
        const cutoffNewest = new Date(now - 1000 * 60 * 60 * 24).toISOString() // 24h ago

        const { data: bookings, error } = await supabaseAdmin
          .from('bookings')
          .select('id, guest_name, guest_email, duration, requested_start, anzahlung, anzahlung_paid, status, created_at, availability_slots(starts_at)')
          .eq('status', 'confirmed')
          .eq('anzahlung_paid', false)
          .gt('anzahlung', 0)
          .gte('created_at', cutoffOldest)
          .lte('created_at', cutoffNewest)

        if (error) {
          console.error('payment-reminders: query failed', error)
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }

        let sent = 0
        let skipped = 0
        const errors: Array<{ id: string; reason: string }> = []

        for (const b of bookings ?? []) {
          if (!b.guest_email) {
            skipped++
            continue
          }

          // Skip if a reminder was already logged for this recipient after the booking was created.
          const { data: prior } = await supabaseAdmin
            .from('email_send_log')
            .select('id')
            .eq('template_name', 'payment-reminder')
            .eq('recipient_email', b.guest_email)
            .gte('created_at', b.created_at)
            .limit(1)
            .maybeSingle()

          if (prior) {
            skipped++
            continue
          }

          const slot = b.availability_slots as { starts_at?: string } | null
          const startIso = b.requested_start ?? slot?.starts_at ?? null
          const wishDate = startIso
            ? new Date(startIso).toLocaleString('de-DE', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: 'Europe/Berlin',
              })
            : undefined

          const anzahlungNum = Number(b.anzahlung) || 0
          const depositAmount = anzahlungNum > 0
            ? `${anzahlungNum.toLocaleString('de-DE')} €`
            : undefined

          try {
            const result = await enqueueTransactionalEmail({
              templateName: 'payment-reminder',
              recipientEmail: b.guest_email,
              templateData: {
                guestName: b.guest_name ?? undefined,
                wishDate,
                duration: b.duration ?? undefined,
                depositAmount,
              },
              idempotencyKey: `payment-reminder-auto-${b.id}`,
            })
            if (result.success) {
              sent++
            } else {
              skipped++
              errors.push({ id: b.id, reason: result.reason ?? 'unknown' })
            }
          } catch (err) {
            errors.push({ id: b.id, reason: (err as Error).message })
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            scanned: bookings?.length ?? 0,
            sent,
            skipped,
            errors,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        )
      },
    },
  },
})
