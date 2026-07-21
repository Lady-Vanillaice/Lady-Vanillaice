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
  guestName?: string
  wishDate?: string
  duration?: string
  message?: string
}

const HOURLY_RATE = 300

function parseDurationMinutes(duration?: string | null): number | null {
  if (!duration) return null
  const match = duration.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  return Math.round(parseFloat(match[1]))
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('de-DE')} €`
}

const Email = ({ guestName, wishDate, duration, message }: Props) => {
  const minutes = parseDurationMinutes(duration)
  const total = minutes ? Math.round((minutes / 60) * HOURLY_RATE) : null
  const deposit = total ? Math.round(total * 0.5) : null

  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>Deine Terminanfrage ist bei mir eingegangen.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Lady Vanilla Ice</Heading>
          <Text style={lead}>
            {guestName ? `Hallo ${guestName},` : 'Hallo,'}
          </Text>
          <Text style={p}>
            Sobald die Anzahlung bei mir eingegangen ist, melde ich mich bei Dir,
            um die Details zu besprechen.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Deine Angaben</Heading>
          <Section style={card}>
            {wishDate ? (
              <Text style={row}><strong style={label}>Wunschtermin:</strong> {wishDate}</Text>
            ) : null}
            {duration ? (
              <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>
            ) : null}
            {message ? (
              <>
                <Text style={{ ...row, marginBottom: 4 }}><strong style={label}>Deine Wünsche:</strong></Text>
                <Text style={{ ...row, whiteSpace: 'pre-wrap' }}>{message}</Text>
              </>
            ) : null}
          </Section>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Anzahlung</Heading>
          <Text style={p}>
            Sende mir die Anzahlung in Höhe von <strong>50% der Session</strong>{' '}
            {deposit ? `(${formatCurrency(deposit)})` : null} via PayPal an{' '}
            <a href="mailto:Lady-vanillaice@gmx.net" style={link}>Lady-vanillaice@gmx.net</a>.
          </Text>

          <Text style={p}>
            Wenn Deine Anzahlung bei mir eingegangen ist, gehört der Termin Dir und Du erhältst eine Bestätigung von mir.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Absagebedingungen</Heading>
          <Section style={card}>
            <Text style={row}>♦️ Bis 48 Stunden vor Termin: Anzahlung bleibt erhalten und kann einmalig angerechnet werden.</Text>
            <Text style={row}>♦️ Bei Absagen unter 48 Stunden, bei Nichterscheinen oder Verspätung ab 20 Minuten: Anzahlung verfällt.</Text>
            <Text style={row}>♦️ Eine Rückerstattung ist ausgeschlossen.</Text>
          </Section>

          <Hr style={hr} />

          <Text style={p}>
            Bei dringenden Fragen erreichst Du mich jederzeit unter{' '}
            <a href="mailto:Lady-vanillaice@gmx.net" style={link}>
              Lady-vanillaice@gmx.net
            </a>{' '}
            oder WhatsApp:{' '}
            <a href="https://wa.me/4915170568230" style={link}>
              +4915170568230
            </a>{' '}
            (bitte schreiben, nicht anrufen).
          </Text>
          <Text style={signature}>— Lady Vanilla Ice</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Deine Anfrage ist bei mir eingegangen — Lady Vanilla Ice',
  displayName: 'Buchungsbestätigung (Gast)',
  previewData: {
    guestName: 'M.',
    wishDate: '2026-07-12 20:00',
    duration: '120 Minuten',
    message: 'Würde mich sehr über ein erstes Treffen freuen.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 28, letterSpacing: 2, color: '#b8945f', textAlign: 'center' as const, margin: '0 0 24px', fontWeight: 400 }
const h2 = { fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#b8945f', margin: '24px 0 12px' }
const lead = { fontSize: 17, lineHeight: '26px', margin: '0 0 14px' }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 14px', color: '#2a2018' }
const card = { backgroundColor: '#faf7f2', border: '1px solid #ead9bf', padding: '18px 20px', borderRadius: 2 }
const row = { fontSize: 14, lineHeight: '22px', margin: '4px 0', color: '#2a2018' }
const label = { color: '#7a5c33', fontWeight: 600 as const }
const hr = { borderColor: '#ead9bf', margin: '28px 0' }
const link = { color: '#b8945f' }
const signature = { fontSize: 14, fontStyle: 'italic' as const, marginTop: 24, color: '#7a5c33' }
