import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { format } from "date-fns";

export default function NGOVerificationEmail({
  ngoName = "NGO Organization",
  ngoId = "123456",
  ngoEmail = "ngo@example.com",
  ngoPhone = "+91 1234567890",
  ngoType = "Not specified",
  adminDashboardUrl = "https://example.com/admin",
}) {
  const currentDate = format(new Date(), "MMMM dd, yyyy");

  return (
    <Html>
      <Head />
      <Preview>New NGO Verification Request: {ngoName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>NGO Verification Request</Heading>
          <Text style={paragraph}>
            A new NGO has requested verification on {currentDate}.
          </Text>

          <Section style={detailsSection}>
            <Heading as="h2" style={subheading}>
              NGO Details
            </Heading>

            <Text style={detailRow}>
              <strong>NGO Name:</strong> {ngoName}
            </Text>
            <Text style={detailRow}>
              <strong>NGO ID:</strong> {ngoId}
            </Text>
            <Text style={detailRow}>
              <strong>Email:</strong> {ngoEmail}
            </Text>
            <Text style={detailRow}>
              <strong>Phone:</strong> {ngoPhone}
            </Text>
            <Text style={detailRow}>
              <strong>NGO Type:</strong> {ngoType}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            Please review and verify this NGO on the admin dashboard. This
            verification will allow the NGO to accept donations and be listed on
            the public directory.
          </Text>

          <Section style={buttonContainer}>
            <Button pX={20} pY={12} style={button} href={adminDashboardUrl}>
              Review NGO
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated message from the NGO Management Platform.
            Please do not reply to this email.
          </Text>

          <Text style={footer}>
            &copy; {new Date().getFullYear()} NGO Management Platform. All
            rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  marginTop: "16px",
  marginBottom: "20px",
  color: "#1CAC78",
};

const subheading = {
  fontSize: "20px",
  fontWeight: "bold",
  margin: "16px 0",
  color: "#333",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#333",
  margin: "16px 0",
};

const detailsSection = {
  backgroundColor: "#f9f9f9",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const detailRow = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#333",
  margin: "8px 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const buttonContainer = {
  textAlign: "center",
  margin: "24px 0",
};

const button = {
  backgroundColor: "#1CAC78",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
};

const footer = {
  fontSize: "14px",
  color: "#666",
  margin: "8px 0",
  textAlign: "center",
};
