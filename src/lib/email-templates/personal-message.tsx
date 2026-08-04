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
  message?: string
  depositAmount?: string
  totalAmount?: string
  restAmount?: string
  duration?: string
  depositPartnerName?: string
  depositPartnerEmail?: string
  depositPartnerAmount?: string
  depositPartnerPayment?: string
  includeDepositInfo?: boolean
}

const EMAIL_ADDRESS = 'Lady-vanillaice@gmx.net'
const PAYPAL_ADDRESS = 'info@herzblutmadl.com'
const WHATSAPP_NUMBER = '+4915170568230'
const WHATSAPP_LINK = 'https://wa.me/4915170568230'

const Email = ({ guestName, message, depositAmount, totalAmount, restAmount, duration, depositPartnerName, depositPartnerEmail, depositPartnerAmount, depositPartnerPayment, includeDepositInfo = false }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Eine persönliche Nachricht von Lady Vanilla Ice.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>{guestName ? `Hallo ${guestName},` : 'Hallo,'}</Text>

        {message ? (
          <>
            <Heading as="h2" style={h2}>Meine Nachricht an dich</Heading>
            {message.split(/\n{2,}/).map((para, i) => (
              <Text key={i} style={{ ...p, whiteSpace: 'pre-wrap' }}>{para}</Text>
            ))}
          </>
        ) : null}

        <Hr style={hr} />

        <Heading as="h2" style={h2}>So geht es weiter</Heading>
        <Text style={p}>
          Wenn du Rückfragen hast oder etwas besprechen möchtest, melde dich gerne direkt bei mir –
          per E-Mail oder WhatsApp:
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

        {includeDepositInfo ? (
          <>
        <Hr style={hr} />

        <Heading as="h2" style={h2}>Anzahlung – Termin fixieren</Heading>
        <Text style={p}>
          Wenn du mit dem einverstanden bist, was ich dir geschrieben habe, leiste bitte eine
          Anzahlung von <strong>50 %</strong> des vereinbarten Betrags – erst dann ist dein Termin
          verbindlich für dich reserviert.
        </Text>
        <Text style={p}>
          Meine PayPal-Adresse für meinen Anteil lautet: <strong>{PAYPAL_ADDRESS}</strong>.
        </Text>

        {depositAmount || totalAmount || duration || restAmount ? (
          <Section style={card}>
            {duration ? (
              <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>
            ) : null}
            {totalAmount ? (
              <Text style={row}><strong style={label}>Gesamtpreis:</strong> {totalAmount}</Text>
            ) : null}
            {depositAmount ? (
              <Text style={row}><strong style={label}>Anzahlung:</strong> {depositAmount}</Text>
            ) : null}
            {restAmount ? (
              <Text style={row}><strong style={label}>Restbetrag (bar vor Ort):</strong> {restAmount}</Text>
            ) : null}
          </Section>
        ) : (
          <Text style={{ ...p, fontStyle: 'italic' }}>
            Die genaue Höhe der Anzahlung richtet sich nach der gewünschten Dauer der Session.
            Sobald wir uns über die Stundenzahl einig sind, teile ich dir den exakten Betrag mit.
          </Text>
        )}

        {restAmount ? (
          <Section style={barCard}>
            <Text style={barTitle}>💶 Restbetrag bar vor Ort</Text>
            <Text style={barText}>
              Nach Eingang der Anzahlung bringst du bitte <strong>{restAmount}</strong> in bar zu unserem Termin mit.
            </Text>
            <Text style={barTextSmall}>(Kartenzahlung ist vor Ort nicht möglich.)</Text>
          </Section>
        ) : null}




        {depositPartnerName || depositPartnerAmount || depositPartnerPayment || depositPartnerEmail ? (
          <Section style={duoCard}>
            <Text style={duoTitle}>💎 Duo-Termin — Anzahlung geteilt</Text>
            <Text style={barText}>
              Ein Teil der Anzahlung geht an {depositPartnerName || 'meine Kollegin'}.
            </Text>
            {depositPartnerAmount ? (
              <Text style={barText}><strong>Anteil:</strong> {depositPartnerAmount}</Text>
            ) : null}
            {depositPartnerPayment || depositPartnerEmail ? (
              <Text style={barText}>
                <strong>Zahlung:</strong> {depositPartnerPayment || depositPartnerEmail}
              </Text>
            ) : null}
          </Section>
        ) : null}
          </>
        ) : null}

        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Persönliche Nachricht von Lady Vanilla Ice',
  displayName: 'Persönliche Nachricht (Gast)',
  previewData: {
    guestName: 'M.',
    message: 'Danke für deine Anfrage – ich habe mir kurz Zeit genommen, dir persönlich zu antworten.',
    duration: '120 Minuten',
    totalAmount: '600 €',
    depositAmount: '300 €',
    restAmount: '300 €',
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
const barCard = { backgroundColor: '#fff6e0', border: '2px solid #b8945f', padding: '18px 20px', borderRadius: 2, margin: '16px 0' }
const barTitle = { fontSize: 16, fontWeight: 700 as const, color: '#7a5c33', margin: '0 0 8px' }
const barText = { fontSize: 15, lineHeight: '24px', margin: '0 0 6px', color: '#2a2018' }
const barTextSmall = { fontSize: 12, lineHeight: '18px', margin: 0, color: '#7a5c33', fontStyle: 'italic' as const }
const duoCard = { backgroundColor: '#f5ecd8', border: '2px dashed #b8945f', padding: '18px 20px', borderRadius: 2, margin: '16px 0' }
const duoTitle = { fontSize: 16, fontWeight: 700 as const, color: '#7a5c33', margin: '0 0 8px' }

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

