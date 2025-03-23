import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export const ActivityFeedbackEmail = ({
  eventName,
  participantName,
  featureImageUrl,
  feedbackFormUrl,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Share your feedback for {eventName} | NGO Connect</Preview>
      <Body style={main}>
        <Container>
          <Section style={content}>
            <Row style={{ ...boxInfos, paddingBottom: "0" }}>
              <Column>
                <Heading
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Hi {participantName},
                </Heading>
                <Heading
                  as="h2"
                  style={{
                    fontSize: 26,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Thank you for participating in {eventName}
                </Heading>
                <Section style={containerImageFooter}>
                  <Img style={image} width={620} src={featureImageUrl} />
                </Section>
                <Text style={paragraph}>
                  We hope you had a great experience at our event. Your feedback
                  is valuable to us and will help us improve future events.
                </Text>
                <Section style={containerButton}>
                  <Button style={button} href={feedbackFormUrl}>
                    Share Your Feedback
                  </Button>
                </Section>
              </Column>
            </Row>
          </Section>

          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "rgb(0,0,0, 0.7)",
            }}
          >
            © {new Date().getFullYear()} | NGO Connect | Feedback Request
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#fff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const paragraph = {
  fontSize: 16,
};

const containerButton = {
  display: "flex",
  justifyContent: "center",
  width: "100%",
  padding: "20px 0",
};

const button = {
  backgroundColor: "#1CAC78",
  borderRadius: 3,
  color: "#FFF",
  fontWeight: "bold",
  border: "1px solid rgb(0,0,0, 0.1)",
  cursor: "pointer",
  padding: "12px 30px",
  textDecoration: "none",
};

const content = {
  border: "1px solid rgb(0,0,0, 0.1)",
  borderRadius: "3px",
  overflow: "hidden",
};

const image = {
  maxWidth: "100%",
};

const boxInfos = {
  padding: "20px",
};

const containerImageFooter = {
  padding: "45px 0 0 0",
};
