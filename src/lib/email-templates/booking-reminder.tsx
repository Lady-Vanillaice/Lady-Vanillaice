import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  guestName?: string
  wishDate?: string
  duration?: string
  studio?: string
  studioAddress?: string
  session?: string
}

const Email = ({ guestName, wishDate, duration, studio, studioAddress, session }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Erinnerung an deinen Termin morgen bei Lady Vanilla Ice.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>{guestName ? `Hallo ${guestName},` : 'Hallo,'}</Text>
        <Text style={p}>eine kurze Erinnerung an unseren Termin morgen. Ich freue mich auf unsere gemeinsame Zeit.</Text>
        <Hr style={hr} />
        <Heading as="h2" style={h2}>Dein Termin</Heading>
        <Section style={card}>
          {wishDate ? <Text style={row}><strong style={label}>Termin:</strong> {wishDate}</Text> : null}
          {duration ? <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text> : null}
          {studio ? <Text style={row}><strong style={label}>Ort:</strong> {studio}</Text> : null}
          {studioAddress ? <Text style={row}><strong style={label}>Adresse:</strong> {studioAddress}</Text> : null}
          {session ? <Text style={row}><strong style={label}>Session:</strong> {session}</Text> : null}
        </Section>
        <Text style={p}>Bitte sei pünktlich, aber nicht zu früh. Falls sich bei deiner Anreise etwas ändert, gib mir bitte kurz Bescheid.</Text>
        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Erinnerung an deinen Termin morgen — Lady Vanilla Ice',
  displayName: 'Automatische Terminerinnerung',
  previewData: {
    guestName: 'M.',
    wishDate: 'Samstag, 22.08.2026 um 18:00 Uhr',
    duration: '120 Minuten (2 Std.)',
    studio: 'Studio60',
    studioAddress: 'Musterstraße 1, München',
    session: 'Single Session',
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
