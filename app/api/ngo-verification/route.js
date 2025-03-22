import { Resend } from "resend";
import { NextResponse } from "next/server";
import NGOVerificationEmail from "@/components/email/NGOVerificationEmail";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    // Extract data from request body
    const {
      ngoName,
      ngoId,
      ngoEmail,
      ngoPhone,
      ngoType,
      adminEmail,
      senderEmail,
    } = await request.json();

    // Validate required fields
    if (!ngoId || !adminEmail || !senderEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send email notification to admin
    const { data, error } = await resend.emails.send({
      from: `NGO Verification <${senderEmail}>`,
      to: adminEmail,
      subject: `NGO Verification Request: ${ngoName || "New NGO"}`,
      react: NGOVerificationEmail({
        ngoName,
        ngoId,
        ngoEmail,
        ngoPhone,
        ngoType,
        adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/verify/${ngoId}`,
      }),
    });

    if (error) {
      console.error("Failed to send verification email:", error);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error in NGO verification email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
