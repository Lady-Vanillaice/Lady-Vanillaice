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
  name?: string
  email?: string
  socialMedia?: string
  shootType?: string
  budgetType?: string
  message?: string
  requestId?: string
}

const Email = ({
  name,
  email,
  socialMedia,
  shootType,
  budgetType,
  message,
  requestId,
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Fotoshooting-Anfrage über die Website</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Neue Fotoshooting-Anfrage</Heading>
        <Text style={p}>
          Über die Website ist eine neue Fotoshooting-Anfrage eingegangen.
        </Text>

        <Section style={card}>
          <Text style={row}><strong style={label}>Name:</strong> {name ?? '—'}</Text>
          <Text style={row}>
            <strong style={label}>E-Mail:</strong>{' '}
            {email ? (
              <a href={`mailto:${email}`} style={link}>{email}</a>
            ) : '—'}
          </Text>
          <Text style={row}><strong style={label}>Budget:</strong> {budgetType ?? '—'}</Text>
          <Hr style={hrSmall} />
          <Text style={row}><strong style={label}>Shoot-Konzept:</strong> {shootType ?? '—'}</Text>
          {socialMedia && (
            <>
              <Hr style={hrSmall} />
              <Text style={{ ...row, marginBottom: 4 }}><strong style={label}>Social Media / Portfolio:</strong></Text>
              <Text style={{ ...row, whiteSpace: 'pre-wrap' }}>{socialMedia}</Text>
            </>
          )}
          {message && (
            <>
              <Hr style={hrSmall} />
              <Text style={{ ...row, marginBottom: 4 }}><strong style={label}>Nachricht:</strong></Text>
              <Text style={{ ...row, whiteSpace: 'pre-wrap' }}>{message}</Text>
            </>
          )}
          {requestId ? (
            <>
              <Hr style={hrSmall} />
              <Text style={{ ...row, color: '#7a5c33', fontSize: 12 }}>Anfrage-ID: {requestId}</Text>
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
    `Neue Fotoshooting-Anfrage${d.name ? ` von ${d.name}` : ''}`,
  displayName: 'Fotoshooting-Benachrichtigung (Admin)',
  previewData: {
    name: 'Max Mustermann',
    email: 'fotograf@example.com',
    socialMedia: 'Instagram: @maxfotos\nPortfolio: maxfotos.de',
    shootType: 'Boudoir-Shooting im Studio mit stimmungsvoller Beleuchtung',
    budgetType: 'TFP',
    message: 'Hallo, ich bin seit 5 Jahren Fotograf und würde mich freuen, mit dir ein kreatives Boudoir-Shooting zu machen.',
    requestId: 'ps-123...',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 22, color: '#b8945f', margin: '0 0 16px', fontWeight: 400 }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 18px' }
const card = { backgroundColor: '#faf7f2', border: '1px solid #ead9bf', padding: '18px 20px', borderRadius: 2 }
const row = { fontSize: 14, lineHeight: '22px', margin: '4px 0', color: '#2a2018' }
const label = { color: '#7a5c33', fontWeight: 600 as const }
const link = { color: '#b8945f' }
const hrSmall = { borderColor: '#ead9bf', margin: '14px 0' }
