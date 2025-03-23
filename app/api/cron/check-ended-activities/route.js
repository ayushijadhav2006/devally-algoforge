import { db } from "@/lib/firebase";
import { Resend } from "resend";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { ActivityFeedbackEmail } from "@/components/email/ActivityFeedbackEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req) {
  try {
    // Debug logging
    console.log("Checking authorization...");
    console.log("Environment check:", {
      hasCronKey: !!process.env.CRON_SECRET_KEY,
      cronKeyLength: process.env.CRON_SECRET_KEY?.length,
    });

    // Verify the request is from our cron job
    const authHeader = req.headers.get("authorization");
    console.log("Auth header:", authHeader);

    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No authorization header provided",
        }),
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    console.log("Received token length:", token?.length);

    if (!token) {
      console.error("Invalid authorization format");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid authorization format",
        }),
        { status: 401 }
      );
    }

    const expectedToken = process.env.CRON_SECRET_KEY;
    if (!expectedToken) {
      console.error("CRON_SECRET_KEY not set in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error",
        }),
        { status: 500 }
      );
    }

    console.log("Token comparison:", {
      receivedLength: token.length,
      expectedLength: expectedToken.length,
      match: token === expectedToken,
    });

    if (token !== expectedToken) {
      console.error("Invalid token provided");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid authorization token",
        }),
        { status: 401 }
      );
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    console.log("Checking for activities that:", {
      today: todayStr,
      conditions: "ended before today AND feedbackEmailsSent is false",
    });

    // Query for activities that have ended
    const activitiesRef = collection(db, "activities");
    const q = query(
      activitiesRef,
      where("eventDate", "<", todayStr),
      where("feedbackEmailsSent", "==", false)
    );

    const activitiesSnapshot = await getDocs(q);
    console.log(
      `Found ${activitiesSnapshot.size} activities that need feedback emails`
    );

    if (activitiesSnapshot.size === 0) {
      console.log("No activities found. This could mean:");
      console.log("1. No activities have ended yet");
      console.log("2. All ended activities have already sent feedback emails");
      console.log(
        "3. The eventDate format doesn't match the expected format (YYYY-MM-DD)"
      );
    }

    for (const activityDoc of activitiesSnapshot.docs) {
      const activity = activityDoc.data();
      const activityId = activityDoc.id;

      console.log("Processing activity:", {
        id: activityId,
        name: activity.eventName,
        date: activity.eventDate,
        feedbackEmailsSent: activity.feedbackEmailsSent,
      });

      // Get participants
      const participantsRef = collection(
        doc(db, "activities", activityId),
        "participants"
      );
      const participantsSnapshot = await getDocs(participantsRef);

      console.log(
        `Processing ${participantsSnapshot.size} participants for ${activity.eventName}`
      );

      // Send emails to participants
      for (const participantDoc of participantsSnapshot.docs) {
        const participant = participantDoc.data();

        try {
          // Generate feedback form URL
          const feedbackFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${activityId}`;

          // Send email using Resend
          await resend.emails.send({
            from: "Smile -Share <contact@aryanshinde.in>",
            to: participant.email,
            subject: `Share your feedback for ${activity.eventName}`,
            react: ActivityFeedbackEmail({
              eventName: activity.eventName,
              participantName: participant.name,
              featureImageUrl: activity.featuredImageUrl,
              feedbackFormUrl: feedbackFormUrl,
            }),
          });

          // Log successful email
          await addDoc(collection(db, "emailLogs"), {
            activityId,
            participantId: participantDoc.id,
            type: "feedback",
            status: "sent",
            timestamp: new Date(),
          });
        } catch (error) {
          console.error(`Error sending email to ${participant.email}:`, error);

          // Log failed email
          await addDoc(collection(db, "emailLogs"), {
            activityId,
            participantId: participantDoc.id,
            type: "feedback",
            status: "failed",
            error: error.message,
            timestamp: new Date(),
          });
        }
      }

      // Mark activity as processed
      await updateDoc(doc(db, "activities", activityId), {
        feedbackEmailsSent: true,
        feedbackEmailsSentAt: new Date(),
      });
    }

    return Response.json({
      success: true,
      message: `Processed ${activitiesSnapshot.size} activities`,
    });
  } catch (error) {
    console.error("Error in check-ended-activities:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
