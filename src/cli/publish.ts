import { readFileSync, existsSync } from "fs";
import { ENV } from "../_core/env";
import { validateReportFile } from "../_core/report";

interface PublishOptions {
  json?: boolean;
}

export async function publishCommand(file: string, options: PublishOptions) {
  if (!existsSync(file)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  const { valid, errors } = validateReportFile(file);
  if (!valid) {
    console.error("Report validation failed:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  const apiKey = ENV.RENDER_API_KEY;
  const serviceId = ENV.RENDER_SERVICE_ID;

  if (!apiKey || !serviceId) {
    // Fallback: tell user how to view the report locally
    console.log(`Report saved at: ${file}`);
    console.log("Open in browser: file://" + file.replace(/\\/g, "/"));
    console.log("\nTo publish to a public URL:");
    console.log("  1. Set RENDER_API_KEY and RENDER_SERVICE_ID env vars");
    console.log("  2. Run: agentguard publish " + file);
    if (options?.json) {
      console.log(JSON.stringify({ url: null, file, note: "Set RENDER_API_KEY and RENDER_SERVICE_ID to publish" }));
    }
    return;
  }

  const html = readFileSync(file, "utf-8");

  try {
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceId,
        headers: { "Content-Type": "text/html" },
        body: html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Render API returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    const url = `https://${serviceId}.onrender.com`;

    if (options?.json) {
      console.log(JSON.stringify({ url, file }, null, 2));
    } else {
      console.log(`\nPublished: ${url}`);
    }
  } catch (err: any) {
    console.error(`Publish failed: ${err.message}`);
    process.exit(1);
  }
}
