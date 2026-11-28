// Run inside the production image: docker run --rm IMAGE scripts/smoke-image.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

assert.notEqual(process.getuid?.(), 0, "The runtime must use a non-root user.");
const child = spawn(process.execPath, ["dist/index.js"], {
  env: { NODE_ENV: "production", PORT: "8088", FIREBASE_PROJECT_ID: "demo-arthq-image" },
  stdio: ["ignore", "inherit", "inherit"],
});
try {
  let healthy = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:8088/api/health", {
        signal: AbortSignal.timeout(500),
      });
      healthy = response.ok && (await response.json()).status === "ok";
      if (healthy) break;
    } catch { /* The server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(healthy, "The container did not become healthy.");
  const denied = await fetch("http://127.0.0.1:8088/api/admin/overview");
  assert.equal(denied.status, 401);
  assert.match(denied.headers.get("content-type"), /application\/json/);
  const page = await fetch("http://127.0.0.1:8088/login");
  assert(page.ok && (await page.text()).includes('id="root"'));
  // Prove the minimal runtime retains working TLS and certificate roots.
  const tls = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    signal: AbortSignal.timeout(15000),
  });
  assert(tls.ok && Array.isArray((await tls.json()).keys));
  console.log(JSON.stringify({
    runtimeSmoke: "passed", node: process.version, uid: process.getuid?.(),
    health: true, adminDenied: true, frontend: true, tls: true,
  }));
} finally {
  child.kill("SIGTERM");
}
