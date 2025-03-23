"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TestPage() {
  const [emailResult, setEmailResult] = useState(null);
  const [cronResult, setCronResult] = useState(null);
  const [loading, setLoading] = useState({ email: false, cron: false });
  const [cronKey, setCronKey] = useState("");

  const testEmail = async () => {
    setLoading((prev) => ({ ...prev, email: true }));
    try {
      const response = await fetch("/api/test/email");
      const data = await response.json();
      setEmailResult(data);
    } catch (error) {
      setEmailResult({ success: false, error: error.message });
    }
    setLoading((prev) => ({ ...prev, email: false }));
  };

  const testCron = async () => {
    if (!cronKey) {
      setCronResult({
        success: false,
        error: "Please enter the CRON_SECRET_KEY",
      });
      return;
    }

    setLoading((prev) => ({ ...prev, cron: true }));
    try {
      const response = await fetch("/api/test/cron", {
        headers: {
          Authorization: `Bearer ${cronKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCronResult(data);
    } catch (error) {
      setCronResult({ success: false, error: error.message });
    }
    setLoading((prev) => ({ ...prev, cron: false }));
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Test Feedback Email System</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Email Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email Sending</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={testEmail}
              disabled={loading.email}
              className="w-full"
            >
              {loading.email ? "Sending..." : "Send Test Email"}
            </Button>
            {emailResult && (
              <div className="mt-4">
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(emailResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Cron Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Cron Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">CRON_SECRET_KEY</label>
              <Input
                type="password"
                value={cronKey}
                onChange={(e) => setCronKey(e.target.value)}
                placeholder="Enter your CRON_SECRET_KEY"
              />
            </div>
            <Button
              onClick={testCron}
              disabled={loading.cron}
              className="w-full"
            >
              {loading.cron ? "Testing..." : "Test Cron Job"}
            </Button>
            {cronResult && (
              <div className="mt-4">
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(cronResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
