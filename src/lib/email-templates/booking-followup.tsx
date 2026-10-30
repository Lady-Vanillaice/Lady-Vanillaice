import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  guestName?: string
  reviewUrl?: string
}

const Email = ({ guestName, reviewUrl = 'https://www.lady-vanillaice.com/erfahrungsberichte' }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Eine kleine Aufgabe nach unserer gemeinsamen Zeit.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        
        <Text style={p}>Ich gehe davon aus, dass unsere gemeinsame Zeit einen bleibenden Eindruck hinterlassen hat.</Text>
        <Text style={p}>Jetzt erfüllst du noch eine kleine Aufgabe für mich: Verfasse einen ehrlichen und ausführlichen Erfahrungsbericht über deine Session. Beschreibe, wie du sie erlebt hast, welche Momente dich besonders beeindruckt haben und was dir in Erinnerung geblieben ist.</Text>
        <Text style={p}>Deinen Bericht hinterlässt du hier:</Text>
        <Text style={p}><a href={reviewUrl}>{reviewUrl}</a></Text>
        <Text style={p}>Nimm dir dafür ein paar Minuten Zeit. Ich lese jeden einzelnen Bericht persönlich.</Text>
        <Text style={p}>Ich erwarte deinen Bericht. 🖤</Text>
        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Deine Aufgabe nach unserer Session — Lady Vanilla Ice',
  displayName: 'Automatisches Danke danach',
  previewData: {
    guestName: 'M.',
    reviewUrl: 'https://www.lady-vanillaice.com/erfahrungsberichte',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1410' }
const container = { padding: '32px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 28, letterSpacing: 2, color: '#b8945f', textAlign: 'center' as const, margin: '0 0 24px', fontWeight: 400 }
const lead = { fontSize: 17, lineHeight: '26px', margin: '0 0 14px' }
const p = { fontSize: 15, lineHeight: '24px', margin: '0 0 14px', color: '#2a2018' }
const button = { backgroundColor: '#b8945f', color: '#ffffff', padding: '12px 20px', fontSize: 14, letterSpacing: 1, textDecoration: 'none', borderRadius: 2, display: 'inline-block', margin: '8px 0 18px' }
const signature = { fontSize: 14, fontStyle: 'italic' as const, marginTop: 24, color: '#7a5c33' }
