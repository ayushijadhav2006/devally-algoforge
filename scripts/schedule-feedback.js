import { Client } from "@upstash/qstash";

const client = new Client({
  token: process.env.QSTASH_TOKEN,
});

async function scheduleJob() {
  try {
    const response = await client.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/check-ended-activities`,
      body: {},
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET_KEY}`,
      },
      cron: "0 1 * * *", // Run at 1 AM daily
    });

    console.log("Job scheduled successfully:", response);
  } catch (error) {
    console.error("Error scheduling job:", error);
  }
}

scheduleJob();
