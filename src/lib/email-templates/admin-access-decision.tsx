import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  approved?: boolean
  note?: string
}

const Email = ({ approved, note }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{approved ? 'Du wurdest als Admin freigeschaltet' : 'Deine Admin-Anfrage wurde abgelehnt'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {approved ? 'Admin-Zugriff freigeschaltet' : 'Admin-Anfrage abgelehnt'}
        </Heading>
        <Text style={p}>
          {approved
            ? 'Deine Anfrage wurde angenommen. Lade die Admin-Seite neu, um Zugriff auf das Dashboard zu erhalten.'
            : 'Deine Anfrage wurde leider abgelehnt.'}
        </Text>
        {note ? (
          <Section style={card}>
            <Text style={{ ...row, whiteSpace: 'pre-wrap' }}>{note}</Text>
          </Section>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.approved ? 'Du wurdest als Admin freigeschaltet' : 'Deine Admin-Anfrage wurde abgelehnt',
  displayName: 'Admin-Entscheidung (Anfragender)',
  previewData: { approved: true, note: '' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 22, color: '#b8945f', margin: '0 0 16px', fontWeight: 400 }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 18px' }
const card = { backgroundColor: '#faf7f2', border: '1px solid #ead9bf', padding: '18px 20px', borderRadius: 2 }
const row = { fontSize: 14, lineHeight: '22px', margin: '4px 0', color: '#2a2018' }
