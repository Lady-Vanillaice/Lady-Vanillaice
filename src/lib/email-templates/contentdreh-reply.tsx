import React from 'react'
import {
  Body,
  Button,
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
  proposedDate?: string
  price?: string
  depositAmount?: string
  message?: string
}

const EMAIL_ADDRESS = 'Lady-vanillaice@gmx.net'
const WHATSAPP_NUMBER = '+4915170568230'
const WHATSAPP_LINK = 'https://wa.me/4915170568230'

const Email = ({ guestName, proposedDate, price, depositAmount, message }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Antwort auf deine Content-Dreh-Anfrage.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>{guestName ? `Hallo ${guestName},` : 'Hallo,'}</Text>

        <Text style={p}>
          vielen Dank für deine Content-Dreh-Anfrage. Hier mein Vorschlag:
        </Text>

        <Section style={card}>
          {proposedDate ? (
            <Text style={row}><strong style={label}>Terminvorschlag:</strong> {proposedDate}</Text>
          ) : null}
          {price ? (
            <Text style={row}><strong style={label}>Preis:</strong> {price}</Text>
          ) : null}
          {depositAmount ? (
            <Text style={row}><strong style={label}>Anzahlung (50 %):</strong> {depositAmount}</Text>
          ) : null}
        </Section>

        {message ? (
          <>
            <Hr style={hr} />
            <Heading as="h2" style={h2}>Persönliche Nachricht</Heading>
            <Section style={card}>
              <Text style={{ ...p, whiteSpace: 'pre-wrap', margin: 0 }}>{message}</Text>
            </Section>
          </>
        ) : null}

        <Hr style={hr} />

        <Heading as="h2" style={h2}>So geht es weiter</Heading>
        <Text style={p}>
          Damit der Termin für dich verbindlich reserviert wird, bitte ich um eine{' '}
          <strong>Anzahlung von 50 %</strong>
          {depositAmount ? ` (${depositAmount})` : ''} via PayPal.
        </Text>

        <Text style={p}>
          Bei Rückfragen oder wenn du den Vorschlag anpassen möchtest, erreichst du mich hier:
        </Text>

        <Section style={{ textAlign: 'center' as const, margin: '18px 0 8px' }}>
          <Button href={`mailto:${EMAIL_ADDRESS}`} style={btn}>
            ✉ {EMAIL_ADDRESS}
          </Button>
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 18px' }}>
          <Button href={WHATSAPP_LINK} style={btnOutline}>
            WhatsApp: {WHATSAPP_NUMBER}
          </Button>
        </Section>

        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Dein Content-Dreh – Terminvorschlag von Lady Vanilla Ice',
  displayName: 'Content-Dreh Antwort (Gast)',
  previewData: {
    guestName: 'M.',
    proposedDate: 'Freitag, 24.07.2026, 15:00 Uhr',
    price: '500 €',
    depositAmount: '250 €',
    message: 'Freue mich, mit dir zu drehen!',
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
const signature = { fontSize: 14, fontStyle: 'italic' as const, marginTop: 24, color: '#7a5c33' }
const btn = {
  backgroundColor: '#b8945f',
  color: '#ffffff',
  padding: '12px 22px',
  fontSize: 14,
  letterSpacing: 1,
  textDecoration: 'none',
  borderRadius: 2,
  display: 'inline-block',
}
const btnOutline = {
  backgroundColor: '#ffffff',
  color: '#7a5c33',
  padding: '12px 22px',
  fontSize: 14,
  letterSpacing: 1,
  textDecoration: 'none',
  border: '1px solid #b8945f',
  borderRadius: 2,
  display: 'inline-block',
}
