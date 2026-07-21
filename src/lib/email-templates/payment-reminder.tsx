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
  depositAmount?: string
}

const Email = ({ guestName, wishDate, duration, depositAmount }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Erinnerung: Deine Anzahlung steht noch aus.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>
          {guestName ? `Hallo ${guestName},` : 'Hallo,'}
        </Text>
        <Text style={p}>
          Deine Anzahlung ist bei mir noch nicht eingegangen. Ohne Anzahlung
          kann ich Deinen Termin leider <strong>nicht fixieren</strong> und
          muss ihn andernfalls wieder freigeben.
        </Text>

        {(wishDate || duration) && (
          <>
            <Hr style={hr} />
            <Heading as="h2" style={h2}>Dein Termin</Heading>
            <Section style={card}>
              {wishDate ? (
                <Text style={row}><strong style={label}>Termin:</strong> {wishDate}</Text>
              ) : null}
              {duration ? (
                <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>
              ) : null}
            </Section>
          </>
        )}

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Anzahlung</Heading>
        <Text style={p}>
          Bitte überweise die Anzahlung{' '}
          {depositAmount ? <>in Höhe von <strong>{depositAmount}</strong>{' '}</> : null}
          zeitnah via PayPal an{' '}
          <a href="mailto:Lady-vanillaice@gmx.net" style={link}>Lady-vanillaice@gmx.net</a>.
        </Text>

        <Text style={p}>
          Sobald die Zahlung bei mir eingegangen ist, gehört der Termin Dir und
          Du erhältst die finale Bestätigung.
        </Text>

        <Hr style={hr} />

        <Text style={p}>
          Bei Fragen erreichst Du mich jederzeit unter{' '}
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

export const template = {
  component: Email,
  subject: 'Erinnerung: Anzahlung noch offen — Lady Vanilla Ice',
  displayName: 'Zahlungserinnerung',
  previewData: {
    guestName: 'M.',
    wishDate: '2026-07-29 10:00',
    duration: '120 Minuten',
    depositAmount: '300 €',
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
