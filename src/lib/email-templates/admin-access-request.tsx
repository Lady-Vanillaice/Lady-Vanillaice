import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  requesterEmail?: string
  requesterUserId?: string
  message?: string
}

const Email = ({ requesterEmail, requesterUserId, message }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Admin-Freischaltungsanfrage</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Admin-Freischaltung angefragt</Heading>
        <Text style={p}>
          Jemand möchte für deinen Admin-Bereich freigeschaltet werden. Du
          kannst die Anfrage im Admin-Dashboard annehmen oder ablehnen.
        </Text>
        <Section style={card}>
          <Text style={row}><strong style={label}>E-Mail:</strong> {requesterEmail ?? '—'}</Text>
          <Text style={row}><strong style={label}>User-ID:</strong> {requesterUserId ?? '—'}</Text>
          <Text style={{ ...row, marginTop: 12 }}><strong style={label}>Nachricht:</strong></Text>
          <Text style={{ ...row, whiteSpace: 'pre-wrap' }}>{message?.trim() || '—'}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Admin-Freischaltung angefragt${d.requesterEmail ? ` von ${d.requesterEmail}` : ''}`,
  displayName: 'Admin-Freischaltung (Benachrichtigung)',
  previewData: {
    requesterEmail: 'neu@example.com',
    requesterUserId: 'abcd-1234',
    message: 'Hallo, ich bin deine Assistentin und brauche Zugriff.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 22, color: '#b8945f', margin: '0 0 16px', fontWeight: 400 }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 18px' }
const card = { backgroundColor: '#faf7f2', border: '1px solid #ead9bf', padding: '18px 20px', borderRadius: 2 }
const row = { fontSize: 14, lineHeight: '22px', margin: '4px 0', color: '#2a2018' }
const label = { color: '#7a5c33', fontWeight: 600 as const }
