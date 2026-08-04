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

const PAYPAL_ADDRESS = 'info@herzblutmadl.com'

interface Props {
  guestName?: string
  wishDate?: string
  duration?: string
  totalAmount?: string
  depositAmount?: string
  restAmount?: string
  confirmationNote?: string
  depositPending?: boolean
  depositPaid?: boolean
  depositPartnerName?: string
  depositPartnerEmail?: string
  depositPartnerAmount?: string
  depositPartnerPayment?: string
}

const Email = ({ guestName, wishDate, duration, totalAmount, depositAmount, restAmount, confirmationNote, depositPending, depositPaid, depositPartnerName, depositPartnerEmail, depositPartnerAmount, depositPartnerPayment }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>
      {depositPending && !depositPaid
        ? 'Dein Termin ist reserviert – bitte Anzahlung überweisen.'
        : 'Dein Termin ist bestätigt.'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>
          {guestName ? `Hallo ${guestName},` : 'Hallo,'}
        </Text>

        <Section style={card}>
          {depositPending && !depositPaid ? (
            <>
              <Text style={highlight}>✔ Dein Termin ist für dich reserviert.</Text>
              <Text style={p}>
                <strong>Wichtig:</strong> Die Buchung ist erst final bestätigt, sobald deine Anzahlung
                {depositAmount ? ` in Höhe von ${depositAmount}` : ''} bei mir eingegangen ist.
                Bitte überweise meinen Anteil zeitnah via PayPal an <strong>{PAYPAL_ADDRESS}</strong>.
              </Text>
              <Text style={{ ...p, margin: '10px 0 0', color: '#8a2f2f', fontWeight: 600 as const }}>
                ⏳ Dein Termin ist maximal 24 Stunden für dich reserviert. Geht die Anzahlung in dieser Zeit nicht bei mir ein, wird der Zeitslot automatisch wieder freigegeben.
              </Text>
            </>

          ) : (
            <>
              <Text style={highlight}>✔ Dein Termin ist bestätigt.</Text>
              {depositPaid ? (
                <Text style={p}>
                  Deine Anzahlung ist bei mir eingegangen – dein Platz gehört dir. Vielen Dank!
                </Text>
              ) : (
                <Text style={p}>
                  Dein Platz bei mir gehört dir.
                </Text>
              )}
            </>
          )}
        </Section>

        {depositPaid ? (
          <Section style={barCard}>
            <Text style={barTitle}>💶 Restbetrag bar vor Ort</Text>
            <Text style={barText}>
              {restAmount
                ? `Bitte bringe zu unserem Termin ${restAmount} in bar mit.`
                : 'Bitte bringe den vereinbarten Restbetrag zu unserem Termin in bar mit.'}
            </Text>
            <Text style={barTextSmall}>
              (Kartenzahlung ist vor Ort nicht möglich.)
            </Text>
          </Section>
        ) : null}

        {depositPending && !depositPaid && (depositPartnerName || depositPartnerAmount || depositPartnerPayment || depositPartnerEmail) ? (
          <Section style={duoCard}>
            <Text style={duoTitle}>💎 Duo-Termin — Anzahlung geteilt</Text>
            <Text style={p}>
              Ein Teil der Anzahlung geht an {depositPartnerName || 'meine Kollegin'}.
            </Text>
            {depositPartnerAmount ? (
              <Text style={p}><strong>Anteil:</strong> {depositPartnerAmount}</Text>
            ) : null}
            {depositPartnerPayment || depositPartnerEmail ? (
              <Text style={p}>
                <strong>Zahlung:</strong> {depositPartnerPayment || depositPartnerEmail}
              </Text>
            ) : null}
          </Section>
        ) : null}




        <Hr style={hr} />

        <Heading as="h2" style={h2}>Deine Termindetails</Heading>
        <Section style={card}>
          {wishDate ? (
            <Text style={row}><strong style={label}>Datum & Uhrzeit:</strong> {wishDate}</Text>
          ) : null}
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

        <Hr style={hr} />

        <Section style={card}>
          <Text style={highlight}>⚠️ Bitte bestätige mir deinen Termin am Vortag einmal kurz.</Text>
        </Section>

        {confirmationNote ? (
          <>
            <Hr style={hr} />
            <Heading as="h2" style={h2}>Persönliche Nachricht</Heading>
            <Section style={card}>
              <Text style={{ ...p, whiteSpace: 'pre-wrap' }}>{confirmationNote}</Text>
            </Section>
          </>
        ) : null}

        <Text style={p}>
          Wenn du möchtest, kannst du mir vor unserer Session noch deine Vorlieben und Tabus dalassen.
        </Text>
        <Text style={p}>
          Sei pünktlich – aber nicht zu früh.
        </Text>
        <Text style={p}>
          Ich freue mich auf dich – und auf das, was zwischen uns entsteht.
        </Text>

        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Dein Termin ist bestätigt — Lady Vanilla Ice',
  displayName: 'Terminbestätigung (Gast)',
  previewData: {
    guestName: 'M.',
    wishDate: '2026-07-12 20:00',
    duration: '120 Minuten',
    totalAmount: '450 €',
    depositAmount: '150 €',
    restAmount: '300 €',
    confirmationNote: 'Ich freue mich auf dich!',
    depositPending: false,
    depositPaid: false,
  },
} satisfies TemplateEntry


const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 28, letterSpacing: 2, color: '#b8945f', textAlign: 'center' as const, margin: '0 0 24px', fontWeight: 400 }
const h2 = { fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#b8945f', margin: '24px 0 12px' }
const lead = { fontSize: 17, lineHeight: '26px', margin: '0 0 14px' }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 14px', color: '#2a2018' }
const highlight = { fontSize: 15, lineHeight: '24px', margin: '0 0 10px', color: '#2a2018', fontStyle: 'italic' as const }
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


