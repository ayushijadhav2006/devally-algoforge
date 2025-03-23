import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export async function GET(req) {
  try {
    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return Response.json(
        { success: false, error: "No authorization header provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return Response.json(
        { success: false, error: "Invalid authorization format" },
        { status: 401 }
      );
    }

    if (token !== process.env.CRON_SECRET_KEY) {
      return Response.json(
        { success: false, error: "Invalid authorization token" },
        { status: 401 }
      );
    }

    // Create a test activity that ended "yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Trigger the actual cron endpoint
    const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/check-ended-activities`;
    console.log("Triggering cron endpoint:", cronUrl);

    const cronResponse = await fetch(cronUrl, {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!cronResponse.ok) {
      throw new Error(
        `Cron endpoint failed with status ${cronResponse.status}: ${await cronResponse.text()}`
      );
    }

    const cronData = await cronResponse.json();
    console.log("Cron response:", cronData);

    // Check if emails were sent
    const emailLogsRef = collection(db, "emailLogs");
    const q = query(emailLogsRef, where("type", "==", "feedback"));
    const emailLogs = await getDocs(q);

    return Response.json({
      success: true,
      message: "Test completed successfully",
      cronResponse: cronData,
      emailsSent: emailLogs.size,
      emailLogs: emailLogs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    });
  } catch (error) {
    console.error("Error in test cron:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
