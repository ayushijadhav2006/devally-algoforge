import { Resend } from "resend";
import { ActivityFeedbackEmail } from "@/components/email/ActivityFeedbackEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const {
      eventName,
      participantName,
      participantEmail,
      featureImageUrl,
      activityId,
    } = await req.json();

    // Generate a unique feedback form URL
    const feedbackFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${activityId}`;

    const data = await resend.emails.send({
      from: "NGO Connect <feedback@ngoconnect.com>",
      to: participantEmail,
      subject: `Share your feedback for ${eventName}`,
      react: ActivityFeedbackEmail({
        eventName,
        participantName,
        featureImageUrl,
        feedbackFormUrl,
      }),
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
