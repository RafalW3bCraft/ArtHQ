import { config } from "dotenv";
import { models } from "../shared/business";

// This command never writes data or prints credential values.
const args = new Set(process.argv.slice(2));
const results: Record<string, unknown> = {};
let failed = false;
const environment = config({ quiet: true });
if (environment.error && (environment.error as NodeJS.ErrnoException).code !== "ENOENT") {
  failed = true;
  results.environment = {
    loaded: false,
    code: (environment.error as NodeJS.ErrnoException).code,
    action: "The current OS user cannot read .env. Grant that user read access or supply the variables through the process environment. Do not make secrets world-readable.",
  };
}
async function timed<T>(
  operation: Promise<T>,
  milliseconds = 15000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(Object.assign(new Error("timeout"), { code: "timeout" })),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
try {
  const { adminDb, adminAuth } = await import("../server/firebase-admin");
  for (const [name, check] of Object.entries({
    firestore: async () => {
      const settings = await adminDb.doc("business_settings/public").get();
      const [content, legacy] = await Promise.all([
        adminDb.collection("content").count().get(),
        adminDb.collection("blog_posts").count().get(),
      ]);
      return {
        reachable: true,
        settingsExist: settings.exists,
        contentCount: content.data().count,
        legacyArticleCount: legacy.data().count,
      };
    },
    auth: async () => {
      await adminAuth.listUsers(1);
      return { reachable: true };
    },
  })) {
    try {
      results[name] = await timed(check());
    } catch (error: any) {
      failed = true;
      results[name] = {
        reachable: false,
        code: error.code || "connection_failed",
        action:
          "Check the project ID, credential validity and service-account permissions.",
      };
    }
  }
} catch {
  failed = true;
  results.firebase = {
    initialized: false,
    action:
      "Use GOOGLE_APPLICATION_CREDENTIALS for a file path; FIREBASE_SERVICE_ACCOUNT_KEY accepts JSON or base64 JSON only.",
  };
}
const webKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];
const missing = webKeys.filter((key) => !process.env[key]?.trim());
const projectMatches =
  !!process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID === process.env.VITE_FIREBASE_PROJECT_ID;
results.web = { configured: missing.length === 0, missing, projectMatches };
if (missing.length || !projectMatches) failed = true;
results.ai = { configured: !!process.env.FEATHERLESS_API_KEY, probed: false };
if (args.has("--probe-ai") || args.has("--require-ai")) {
  let available = false;
  for (const model of Object.values(models)) {
    if (!process.env.FEATHERLESS_API_KEY) {
      results[model] = { configured: false };
      continue;
    }
    try {
      const response = await fetch(
        "https://api.featherless.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "user", content: "Reply with a short greeting." },
            ],
            max_tokens: 1600,
            chat_template_kwargs: { enable_thinking: false },
            stream: false,
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      const data = response.ok ? await response.json() : null;
      const replied =
        typeof data?.choices?.[0]?.message?.content === "string" &&
        !!data.choices[0].message.content
          .replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "")
          .trim();
      results[model] = { status: response.status, replied };
      available ||= replied;
    } catch {
      results[model] = { reachable: false };
    }
  }
  results.ai = {
    configured: !!process.env.FEATHERLESS_API_KEY,
    probed: true,
    available,
  };
  if (!available) failed = true;
}
const payments = !!(
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAY_WEBHOOK_SECRET
);
results.razorpay = { configured: payments, verified: false };
if (args.has("--require-payments") && !payments) failed = true;
if (process.env.SITE_URL) {
  for (const path of ["/api/site", "/api/content"]) {
    try {
      const response = await fetch(new URL(path, process.env.SITE_URL), {
        signal: AbortSignal.timeout(15000),
      });
      const json =
        response.headers.get("content-type")?.includes("application/json") ===
        true;
      results[path] = { status: response.status, json };
      if (!response.ok || !json) failed = true;
    } catch {
      results[path] = { reachable: false };
      failed = true;
    }
  }
}
console.log(JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
