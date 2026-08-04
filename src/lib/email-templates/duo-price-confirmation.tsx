import React from "react";
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
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  guestName?: string;
  wishDate?: string;
  duration?: string;
  message?: string;
  acceptUrl?: string;
  declineUrl?: string;
}

const Email = ({ guestName, wishDate, duration, message, acceptUrl, declineUrl }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Deine unverbindliche Duo-Anfrage ist eingegangen.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lady Vanilla Ice</Heading>
        <Text style={lead}>{guestName ? `Hallo ${guestName},` : "Hallo,"}</Text>
        <Text style={p}>
          Deine unverbindliche Anfrage für eine Duo-Session ist bei mir eingegangen.
        </Text>
        <Section style={priceCard}>
          <Text style={priceTitle}>Tribut für die Duo-Session</Text>
          <Text style={priceText}>
            Der Tribut beträgt <strong>300 € pro Domina und Stunde</strong>.
          </Text>
        </Section>
        <Text style={p}>
          Bitte teile mir über einen der beiden Buttons mit, ob Du damit einverstanden bist.
        </Text>
        {acceptUrl ? (
          <Section style={buttonSection}>
            <Button href={acceptUrl} style={acceptButton}>Ich bin damit einverstanden</Button>
          </Section>
        ) : null}
        {declineUrl ? (
          <Section style={buttonSection}>
            <Button href={declineUrl} style={declineButton}>Ich bin damit nicht einverstanden</Button>
          </Section>
        ) : null}
        <Hr style={hr} />
        <Heading as="h2" style={h2}>Deine Angaben</Heading>
        <Section style={card}>
          {wishDate ? <Text style={row}><strong>Wunschtermin:</strong> {wishDate}</Text> : null}
          {duration ? <Text style={row}><strong>Dauer:</strong> {duration}</Text> : null}
          {message ? <Text style={{ ...row, whiteSpace: "pre-wrap" }}><strong>Wünsche:</strong> {message}</Text> : null}
        </Section>
        <Text style={signature}>— Lady Vanilla Ice</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Bitte bestätige den Duo-Tribut — Lady Vanilla Ice",
  displayName: "Duo-Preisanfrage (Gast)",
  previewData: {
    guestName: "M.",
    wishDate: "Freitag, 21:00 Uhr",
    duration: "120 Minuten",
    message: "Ich freue mich auf eine Duo-Session.",
    acceptUrl: "https://www.lady-vanillaice.com",
    declineUrl: "https://www.lady-vanillaice.com",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: 'Georgia, "Times New Roman", serif', color: "#1a1410" };
const container = { padding: "32px 28px", maxWidth: 560, margin: "0 auto" };
const h1 = { fontSize: 28, letterSpacing: 2, color: "#b8945f", textAlign: "center" as const, margin: "0 0 24px", fontWeight: 400 };
const h2 = { fontSize: 14, letterSpacing: 2, textTransform: "uppercase" as const, color: "#b8945f", margin: "24px 0 12px" };
const lead = { fontSize: 17, lineHeight: "26px", margin: "0 0 14px" };
const p = { fontSize: 15, lineHeight: "24px", margin: "0 0 14px", color: "#2a2018" };
const priceCard = { backgroundColor: "#faf7f2", border: "1px solid #d8b676", padding: "20px", margin: "20px 0" };
const priceTitle = { fontSize: 13, letterSpacing: 2, textTransform: "uppercase" as const, color: "#7a5c33", margin: "0 0 8px" };
const priceText = { fontSize: 18, lineHeight: "28px", margin: 0, color: "#2a2018" };
const buttonSection = { textAlign: "center" as const, margin: "12px 0" };
const acceptButton = { backgroundColor: "#315f3d", color: "#ffffff", padding: "13px 20px", textDecoration: "none", borderRadius: 2 };
const declineButton = { backgroundColor: "#7b1f2d", color: "#ffffff", padding: "13px 20px", textDecoration: "none", borderRadius: 2 };
const card = { backgroundColor: "#faf7f2", border: "1px solid #ead9bf", padding: "18px 20px" };
const row = { fontSize: 14, lineHeight: "22px", margin: "4px 0", color: "#2a2018" };
const hr = { borderColor: "#ead9bf", margin: "28px 0" };
const signature = { fontSize: 14, fontStyle: "italic" as const, marginTop: 24, color: "#7a5c33" };

