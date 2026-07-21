import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  type?: string
  guestName?: string
  guestEmail?: string
  wishDate?: string
  duration?: string
  message?: string
  bookingId?: string
}

const Email = ({
  type,
  guestName,
  guestEmail,
  wishDate,
  duration,
  message,
  bookingId,
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue {type ?? 'Termin'}anfrage über die Website</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={typeBanner}>
          <Text style={typeText}>{type ?? 'ANFRAGE'}</Text>
        </Section>

        <Heading style={h1}>Neue {type ?? 'Termin'}anfrage</Heading>
        <Text style={p}>
          Über die Website ist eine neue Anfrage eingegangen.
        </Text>

        <Section style={card}>
          <Text style={row}><strong style={label}>Name / Pseudonym:</strong> {guestName ?? '—'}</Text>
          <Text style={row}>
            <strong style={label}>E-Mail:</strong>{' '}
            {guestEmail ? (
              <a href={`mailto:${guestEmail}`} style={link}>{guestEmail}</a>
            ) : '—'}
          </Text>
          <Text style={row}><strong style={label}>Wunschtermin:</strong> {wishDate ?? '—'}</Text>
          <Text style={row}><strong style={label}>Dauer:</strong> {duration ?? '—'}</Text>
          <Hr style={hrSmall} />
          <Text style={{ ...row, marginBottom: 4 }}><strong style={label}>Wünsche / Nachricht:</strong></Text>
          <Text style={{ ...row, whiteSpace: 'pre-wrap' }}>{message ?? '—'}</Text>
          {bookingId ? (
            <>
              <Hr style={hrSmall} />
              <Text style={{ ...row, color: '#7a5c33', fontSize: 12 }}>Booking-ID: {bookingId}</Text>
            </>
          ) : null}
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Neue ${d.type ?? 'Termin'}anfrage${d.guestName ? ` von ${d.guestName}` : ''}`,
  displayName: 'Buchungsbenachrichtigung (Admin)',
  previewData: {
    type: 'Session',
    guestName: 'M.',
    guestEmail: 'gast@example.com',
    wishDate: '2026-07-12 20:00',
    duration: '120 Minuten',
    message: 'Würde mich sehr über ein erstes Treffen freuen.',
    bookingId: 'b1f3...',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const typeBanner = { backgroundColor: '#7a1e1e', padding: '18px 20px', borderRadius: '2px', marginBottom: '24px', textAlign: 'center' as const }
const typeText = { fontSize: 28, fontWeight: 700, color: '#ffffff', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' as const }
const h1 = { fontSize: 22, color: '#b8945f', margin: '0 0 16px', fontWeight: 400 }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 18px' }
const card = { backgroundColor: '#faf7f2', border: '1px solid #ead9bf', padding: '18px 20px', borderRadius: 2 }
const row = { fontSize: 14, lineHeight: '22px', margin: '4px 0', color: '#2a2018' }
const label = { color: '#7a5c33', fontWeight: 600 as const }
const link = { color: '#b8945f' }
const hrSmall = { borderColor: '#ead9bf', margin: '14px 0' }
