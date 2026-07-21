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
  reasonText?: string
}

const Email = ({ guestName, reasonText }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Deine Anfrage — eine kurze Rückmeldung.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>{guestName ? `Hallo ${guestName},` : 'Hallo,'}</Text>

        <Text style={p}>
          vielen Dank für deine Anfrage. Leider kann ich diese nicht annehmen.
        </Text>

        <Section style={card}>
          <Text style={highlight}>{reasonText}</Text>
        </Section>

        <Hr style={hr} />

        <Text style={p}>
          Ich wünsche dir trotzdem alles Gute — und freue mich, falls wir an
          anderer Stelle zueinander finden.
        </Text>

        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Deine Anfrage — Rückmeldung von Lady Vanilla Ice',
  displayName: 'Buchung abgelehnt (Gast)',
  previewData: {
    guestName: 'M.',
    reasonText:
      'Diese Leistungen biete ich nicht an — bitte suche dir hierfür eine andere Domina.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 28, letterSpacing: 2, color: '#b8945f', textAlign: 'center' as const, margin: '0 0 24px', fontWeight: 400 }
const lead = { fontSize: 17, lineHeight: '26px', margin: '0 0 14px' }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 14px', color: '#2a2018' }
const highlight = { fontSize: 15, lineHeight: '24px', margin: '0', color: '#2a2018', fontStyle: 'italic' as const }
const card = { backgroundColor: '#faf7f2', border: '1px solid #ead9bf', padding: '18px 20px', borderRadius: 2 }
const hr = { borderColor: '#ead9bf', margin: '28px 0' }
const signature = { fontSize: 14, fontStyle: 'italic' as const, marginTop: 24, color: '#7a5c33' }
