"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TestFeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cronKey, setCronKey] = useState(
    "cron-secret-key-2024-feedback-system-xyz123"
  );

  useEffect(() => {
    // Log the environment variable (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(
        "CRON Key available:",
        !!process.env.NEXT_PUBLIC_CRON_SECRET_KEY
      );
    }
  }, []);

  const testFeedbackEmails = async () => {
    try {
      if (!cronKey.trim()) {
        setError("Please enter the CRON Secret Key");
        return;
      }

      setLoading(true);
      setError(null);

      // First test the cron endpoint directly
      const cronUrl = `${window.location.origin}/api/cron/check-ended-activities`;
      console.log("Testing cron endpoint:", cronUrl);

      const cronResponse = await fetch(cronUrl, {
        headers: {
          Authorization: `Bearer ${cronKey}`,
          "Content-Type": "application/json",
        },
      });

      const cronData = await cronResponse.json();
      console.log("Cron response:", cronData);

      if (!cronResponse.ok) {
        throw new Error(cronData.error || "Failed to test feedback emails");
      }

      setResult({
        cronResponse: cronData,
        message: "Feedback emails processed successfully",
      });
    } catch (error) {
      console.error("Test error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Test Feedback Emails</h1>

      <Card className="p-6 mb-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cronKey">CRON Secret Key</Label>
            <Input
              id="cronKey"
              value={cronKey}
              onChange={(e) => setCronKey(e.target.value)}
              placeholder="Enter your CRON Secret Key"
              className="w-full"
            />
          </div>
          <p className="text-sm text-gray-600">
            This will trigger the feedback email system for activities that
            ended yesterday.
          </p>
          <Button
            onClick={testFeedbackEmails}
            disabled={loading}
            className="bg-[#1CAC78] text-white"
          >
            {loading ? "Testing..." : "Test Feedback Emails"}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-6 mb-4 bg-red-50">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-2 text-sm text-gray-600">
            <p>Please ensure:</p>
            <ul className="list-disc list-inside">
              <li>The CRON Secret Key matches the one in your .env file</li>
              <li>
                Your .env file contains both CRON_SECRET_KEY and
                NEXT_PUBLIC_CRON_SECRET_KEY
              </li>
              <li>
                You have restarted your Next.js server after updating .env
              </li>
            </ul>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
