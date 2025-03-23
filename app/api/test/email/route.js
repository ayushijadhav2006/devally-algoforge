import { Resend } from "resend";
import { ActivityFeedbackEmail } from "@/components/email/ActivityFeedbackEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req) {
  try {
    // Test data
    const testData = {
      eventName: "Test Event",
      participantName: "Test User",
      featureImageUrl: "https://picsum.photos/600/400", // placeholder image
      feedbackFormUrl: `${process.env.NEXT_PUBLIC_APP_URL}/feedback/test`,
    };

    const data = await resend.emails.send({
      from: "Smile -Share <contact@aryanshinde.in>",
      to: "yashnimse92@gmail.com", // Replace with your email for testing
      subject: `Test Feedback Email for ${testData.eventName}`,
      react: ActivityFeedbackEmail(testData),
    });

    return Response.json({
      success: true,
      message: "Test email sent successfully",
      data,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
