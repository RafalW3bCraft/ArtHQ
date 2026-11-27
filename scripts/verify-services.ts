import { config } from "dotenv";
import { models } from "../shared/business";

// This command never writes data or prints credential values.
const args = new Set(process.argv.slice(2));
const results: Record<string, unknown> = {};
let failed = false;
const environment = config({ quiet: true });
if (
  environment.error &&
  (environment.error as NodeJS.ErrnoException).code !== "ENOENT"
) {
  failed = true;
  results.environment = {
    loaded: false,
    code: (environment.error as NodeJS.ErrnoException).code,
    action:
      "The current OS user cannot read .env. Grant that user read access or supply the variables through the process environment. Do not make secrets world-readable.",
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
const siteOnly = args.has("--site-only");
if (args.has("--probe-google") || args.has("--require-google")) {
  let configured = false;
  try {
    const key = process.env.VITE_FIREBASE_API_KEY;
    const domain = process.env.VITE_FIREBASE_AUTH_DOMAIN;
    if (!key || !domain) throw new Error("missing_web_configuration");
    const continueUri = new URL(
      "/login",
      process.env.SITE_URL || `https://${domain}`,
    ).href;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: "google.com", continueUri }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await response.json();
    const uri = response.ok && data.authUri ? new URL(data.authUri) : null;
    configured =
      uri?.protocol === "https:" &&
      uri.hostname === "accounts.google.com" &&
      uri.searchParams.get("client_id")?.endsWith(".apps.googleusercontent.com") === true;
    // The URI contains an authentication session. Never log it or credentials.
    results.google = {
      status: response.status,
      configured,
      popupLoginVerified: false,
      ...(!configured ? {
        action: "Configure the project-owned Google OAuth web client in Firebase Authentication and authorize the site domain before enabling VITE_FIREBASE_GOOGLE_ENABLED.",
      } : {}),
    };
  } catch {
    results.google = { configured: false, reachable: false, popupLoginVerified: false };
  }
  if (args.has("--require-google") && !configured) failed = true;
}
if (!siteOnly) {
  try {
    const { databaseConfigured } = await import("../server/business-store");
    if (!databaseConfigured()) throw new Error("missing_credentials");
    const { adminDb, adminAuth } = await import("../server/firebase-admin");
    // Resolve credentials before constructing Firestore RPCs. The gRPC transport can
    // otherwise reject an internal promise outside the caller's catch handler.
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      const credential = adminAuth.app.options.credential;
      if (!credential) throw new Error("missing_credentials");
      await timed(credential.getAccessToken());
    }
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
    !!process.env.VITE_FIREBASE_PROJECT_ID &&
    (process.env.FIREBASE_PROJECT_ID ||
      process.env.VITE_FIREBASE_PROJECT_ID) ===
      process.env.VITE_FIREBASE_PROJECT_ID;
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
}
if (siteOnly && !process.env.SITE_URL) {
  failed = true;
  results.site = {
    configured: false,
    action: "Set SITE_URL for --site-only verification.",
  };
}
if (process.env.SITE_URL) {
  for (const path of [
    "/api/health",
    "/api/readiness",
    "/api/site",
    "/api/content",
  ]) {
    try {
      const response = await fetch(new URL(path, process.env.SITE_URL), {
        signal: AbortSignal.timeout(15000),
      });
      const json =
        response.headers.get("content-type")?.includes("application/json") ===
        true;
      const body = json ? await response.json().catch(() => null) : null;
      const valid =
        path === "/api/content"
          ? Array.isArray(body)
          : path === "/api/site"
            ? Array.isArray(body?.packages) &&
              typeof body?.assistantAvailable === "boolean"
            : body?.status === (path === "/api/readiness" ? "ready" : "ok");
      results[path] = { status: response.status, json, valid };
      if (!response.ok || !json || !valid) failed = true;
    } catch {
      results[path] = { reachable: false };
      failed = true;
    }
  }
}
console.log(JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
