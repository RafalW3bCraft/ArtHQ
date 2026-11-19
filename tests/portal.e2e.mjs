import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { chromium } from "playwright-core";
import { build, preview } from "vite";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

// This test only uses the loopback emulators and generates a disposable production build.
Object.assign(process.env, {
  VITE_FIREBASE_API_KEY: "demo-arthq-key",
  VITE_FIREBASE_PROJECT_ID: "demo-arthq",
  VITE_FIREBASE_APP_ID: "1:123:web:abc",
  VITE_USE_EMULATORS: "true",
});
const emulators = await (await fetch("http://127.0.0.1:4400/emulators")).json();
assert.equal(emulators.firestore.port, 8080);
assert.equal(emulators.auth.port, 9099);
const directory = await mkdtemp(path.join(tmpdir(), "arthq-browser-"));
let server, browser, rules;
const run = Date.now().toString(36);
const pass = "Local-test-only-42";
const email = (name) => name.toLowerCase() + "." + run + "@example.test";
const browserErrors = [];
const evidenceDirectory = path.resolve(".agents/evidence/studio-refresh");

function monitorBrowser(page) {
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push("console: " + message.text());
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    if (reason === "net::ERR_ABORTED" && request.url().includes("/google.firestore.v1.Firestore/")) return;
    browserErrors.push("request: " + request.url() + " " + reason);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(page.url()).origin)
      browserErrors.push("http " + response.status() + ": " + response.url());
  });
}

async function captureFullPage(page, filename) {
  const reveals = page.locator("[data-reveal]");
  for (let index = 0; index < await reveals.count(); index++) {
    await reveals.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
  }
  assert.equal(
    await reveals.evaluateAll((elements) => elements.every((element) => element.classList.contains("is-visible"))),
    true,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(evidenceDirectory, filename), fullPage: true });
}

try {
  await build({ build: { outDir: directory }, logLevel: "error" });
  server = await preview({
    build: { outDir: directory },
    preview: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  const base = "http://127.0.0.1:" + server.httpServer.address().port;
  rules = await initializeTestEnvironment({
    projectId: "demo-arthq",
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_BIN,
    headless: true,
  });
  async function register(name) {
    const page = await browser.newPage();
    monitorBrowser(page);
    await page.goto(base + "/auth?mode=new");
    await page.getByLabel("Email", { exact: true }).fill(email(name));
    await page.getByLabel("Company or name").fill(name);
    await page.getByLabel("Phone number").fill("5550100");
    await page.getByLabel("Password", { exact: true }).fill(pass);
    await page.getByLabel("Confirm password").fill(pass);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByRole("heading", { name, exact: true }).waitFor();
    return page;
  }
  async function createAuthOnlyAccount(name) {
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-arthq-key",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email(name),
          password: pass,
          returnSecureToken: true,
        }),
      },
    );
    assert.equal(response.status, 200, "Auth emulator should create the profile recovery account");
  }
  const visitor = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  monitorBrowser(visitor);
  await visitor.goto(base);
  await visitor.getByRole("heading", { level: 1 }).waitFor();
  await mkdir(evidenceDirectory, { recursive: true });
  assert.equal(
    await visitor.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await visitor.getByRole("heading", { name: "Hall of Achievement." }).waitFor();
  assert.equal(await visitor.title(), "ArtHQ | Websites, Apps & Digital Products");
  assert.equal(await visitor.locator('link[rel="canonical"]').getAttribute("href"), "https://arthq.tech/");
  assert.equal(await visitor.locator('meta[property="og:site_name"]').getAttribute("content"), "ArtHQ");
  const structuredData = await visitor.locator('script[type="application/ld+json"]').textContent();
  assert.equal(JSON.parse(structuredData).name, "ArtHQ");
  assert.equal(JSON.parse(structuredData).parentOrganization.name, "RafalW3bCraft");
  assert.equal((await fetch(base + "/sitemap.xml")).status, 200);
  assert.match(await (await fetch(base + "/robots.txt")).text(), /Sitemap: https:\/\/arthq\.tech\/sitemap\.xml/);
  assert.equal(await visitor.getByRole("heading", { name: /websites & apps/i }).count(), 1);
  assert.equal(await visitor.getByRole("heading", { name: "Websites", exact: true }).count(), 1);
  assert.equal(await visitor.locator("[data-carousel-slide]").count(), 6);
  await captureFullPage(visitor, "mobile.png");
  const carousel = visitor.locator("#achievement");
  await carousel.scrollIntoViewIfNeeded();
  await visitor.getByRole("button", { name: "Pause project carousel" }).click();
  const waitForSlide = (number) => visitor.waitForFunction(
    (expected) => document.querySelector(".gallery-count")?.textContent?.trim().startsWith(expected),
    String(number).padStart(2, "0"),
  );
  await waitForSlide(1);
  const rail = visitor.getByLabel("Project slides. Use the left and right arrow keys to navigate.");
  await rail.focus();
  await visitor.keyboard.press("ArrowRight");
  await waitForSlide(2);
  await visitor.getByRole("button", { name: "Next project" }).click();
  await waitForSlide(3);
  await visitor.getByRole("button", { name: "Previous project" }).click();
  await waitForSlide(2);
  assert.equal(await visitor.getByRole("button", { name: "Play project carousel" }).getAttribute("aria-pressed"), "true");
  await visitor.getByRole("button", { name: "Play project carousel" }).click();
  await visitor.waitForFunction(
    () => document.querySelector(".gallery-count")?.textContent?.trim().startsWith("03"),
    null,
    { timeout: 8000 },
  );
  await visitor.getByRole("button", { name: "Pause project carousel" }).click();
  const menuButton = visitor.getByRole("button", { name: "Open navigation menu" });
  await menuButton.click();
  const hallLink = visitor.getByRole("link", { name: "Hall of Achievement" });
  await hallLink.waitFor();
  assert.equal(await visitor.getByRole("link", { name: "Services", exact: true }).getAttribute("href"), "/#services");
  await hallLink.focus();
  await visitor.keyboard.press("Escape");
  assert.equal(await visitor.getByRole("button", { name: "Open navigation menu" }).getAttribute("aria-expanded"), "false");
  assert.equal(await menuButton.evaluate((button) => button === document.activeElement), true);
  for (const domain of [
    "rafalwebcraft.online",
    "the4amsociety.com",
    "ribison.com",
    "creativelaser-art.web.app",
  ])
    assert.ok(
      await visitor.locator('a[href="https://' + domain + '/"]').count(),
    );
  for (const bot of [
    ["FinServiceBot", "https://t.me/FinServiceBot"],
    ["Smart Growly Bot", "https://t.me/Smart_Growly_Bot"],
  ]) {
    assert.equal(await visitor.getByRole("link", { name: bot[0], exact: true }).getAttribute("href"), bot[1]);
  }
  assert.equal(await visitor.locator("video, audio").count(), 0);
  assert.equal(await visitor.getByRole("heading", { name: "Creative Laser Art", exact: true }).count(), 1);
  await visitor.setViewportSize({ width: 768, height: 1024 });
  assert.equal(await visitor.evaluate(() => document.documentElement.scrollWidth), 768);
  await captureFullPage(visitor, "tablet.png");
  await visitor.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await visitor.evaluate(() => document.documentElement.scrollWidth), 1440);
  await captureFullPage(visitor, "desktop.png");
  await visitor.getByLabel("Name", { exact: true }).fill("Visitor " + run);
  await visitor.getByLabel("Email", { exact: true }).fill(email("visitor"));
  await visitor
    .getByLabel("Enquiry")
    .fill("We would like to discuss a website brief.");
  await visitor.getByRole("button", { name: "Send enquiry" }).click();
  await visitor.getByText("Your enquiry has been sent to ArtHQ.").waitFor();
  await visitor.evaluate(() => Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true }));
  await visitor.getByLabel("Name", { exact: true }).fill("Offline visitor " + run);
  await visitor.getByLabel("Email", { exact: true }).fill(email("offline-visitor"));
  await visitor.getByLabel("Enquiry").fill("Please handle this temporary service failure.");
  await visitor.getByRole("button", { name: "Send enquiry" }).click();
  await visitor.getByText("We couldn’t send your enquiry. Check your connection and try again.").waitFor();
  assert.deepEqual(await (await fetch(base + "/api/health")).json(), {
    status: "ok",
    service: "ArtHQ",
  });
  console.log(
    "PASS: public links, responsive layouts, accessible carousel, SEO metadata, no demo media, enquiry and health",
  );

  const reducedMotionContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const reducedMotionPage = await reducedMotionContext.newPage();
  monitorBrowser(reducedMotionPage);
  await reducedMotionPage.goto(base);
  await reducedMotionPage.locator("#achievement").scrollIntoViewIfNeeded();
  const motionControl = reducedMotionPage.getByRole("button", {
    name: "Autoplay disabled by reduced-motion preference",
  });
  await motionControl.waitFor();
  assert.equal(await motionControl.isDisabled(), true);
  await reducedMotionPage.getByRole("button", { name: "Next project" }).click();
  assert.equal(
    await reducedMotionPage.locator("[data-reveal]").first().evaluate((node) => getComputedStyle(node).opacity),
    "1",
  );
  await reducedMotionContext.close();
  console.log("PASS: reduced-motion disables autoplay and keeps content visible");

  const recoveryAccount = "Recovery";
  const recoveryName = "Profile Recovery";
  await createAuthOnlyAccount(recoveryAccount);
  const recovery = await browser.newPage();
  monitorBrowser(recovery);
  await recovery.goto(base + "/auth");
  await recovery.getByLabel("Email", { exact: true }).fill(email(recoveryAccount));
  await recovery.getByLabel("Password", { exact: true }).fill(pass);
  await recovery.getByRole("button", { name: "Sign in", exact: true }).click();
  await recovery.getByRole("heading", { name: "Complete your profile" }).waitFor();
  await recovery.getByLabel("Company or name").fill(recoveryName);
  await recovery.getByLabel("Phone number").fill("5550101");
  await recovery.getByRole("button", { name: "Save profile" }).click();
  await recovery.getByRole("heading", { name: recoveryName, exact: true }).waitFor();
  await recovery.getByRole("button", { name: "Sign out" }).click();
  await recovery.getByRole("heading", { name: "Client sign in" }).waitFor();
  await recovery.close();
  console.log("PASS: incomplete Firebase account can finish its profile and sign out");

  const alice = await register("Alice");
  const project = "Website brief " + run;
  const subject = "Delivery date " + run;
  await alice.getByLabel("Project name").fill(project);
  await alice.getByLabel("Service", { exact: true }).selectOption("website");
  await alice
    .getByLabel("Project brief")
    .fill("Please build a new portfolio website for our studio.");
  await alice.getByRole("button", { name: "Submit brief" }).click();
  await alice.getByRole("heading", { name: project }).waitFor();
  await alice.getByRole("button", { name: "Support", exact: true }).click();
  await alice.getByLabel("Subject").fill(subject);
  await alice
    .getByLabel("Message")
    .fill("Please confirm the delivery date for our brief.");
  await alice.getByRole("button", { name: "Submit ticket" }).click();
  await alice.getByRole("heading", { name: subject }).waitFor();
  const bob = await register("Bob");
  await bob.getByText("You haven’t submitted a project brief yet.").waitFor();
  await bob.getByRole("button", { name: "Support", exact: true }).click();
  await bob.getByText("You haven’t submitted a support ticket yet.").waitFor();
  await bob.goto(base + "/admin");
  await bob.getByRole("heading", { name: "Admin access required" }).waitFor();
  assert.equal(await bob.title(), "Admin workspace | ArtHQ");
  console.log(
    "PASS: signup details, client briefs, standalone tickets and a second isolated client",
  );

  const staff = await register("Staff");
  await rules.withSecurityRulesDisabled(async (context) => {
    const users = await getDocs(
      query(
        collection(context.firestore(), "users"),
        where("email", "==", email("Staff")),
      ),
    );
    assert.equal(users.size, 1);
    await updateDoc(users.docs[0].ref, { role: "admin" });
  });
  await staff.getByRole("link", { name: "Admin workspace" }).click();
  await staff.getByRole("heading", { name: "Admin workspace" }).waitFor();
  assert.equal(await staff.title(), "Admin workspace | ArtHQ");
  const record = (page, heading) =>
    page
      .locator("li")
      .filter({
        has: page.getByRole("heading", { name: heading, exact: true }),
      });
  await record(staff, project)
    .getByRole("button", { name: "Start project" })
    .click();
  await record(staff, project)
    .getByText("In progress", { exact: true })
    .waitFor();
  await staff.getByRole("button", { name: "Support", exact: true }).click();
  const ticket = record(staff, subject);
  const ticketReplyUrl = new URL(await ticket.getByRole("link", { name: "Reply to Alice by email" }).getAttribute("href"));
  assert.equal(ticketReplyUrl.protocol, "mailto:");
  assert.equal(ticketReplyUrl.pathname, email("Alice"));
  assert.equal(ticketReplyUrl.searchParams.get("subject"), `Re: ${subject}`);
  await staff.screenshot({ path: path.join(evidenceDirectory, "admin-support.png"), fullPage: true });
  await ticket
    .getByRole("button", { name: "Start ticket" })
    .click();
  await ticket
    .getByRole("button", { name: "Resolve ticket" })
    .click();
  await record(alice, subject).getByText("Resolved", { exact: true }).waitFor();
  await staff.getByRole("button", { name: "Enquiries" }).click();
  const enquiry = record(staff, "Visitor " + run);
  const replyUrl = new URL(await enquiry.getByRole("link", { name: `Reply to Visitor ${run} by email` }).getAttribute("href"));
  assert.equal(replyUrl.protocol, "mailto:");
  assert.equal(replyUrl.pathname, email("visitor"));
  assert.equal(replyUrl.searchParams.get("subject"), "Re: Your ArtHQ enquiry");
  assert.match(replyUrl.searchParams.get("body"), new RegExp(`Hi Visitor ${run},`));
  await staff.screenshot({ path: path.join(evidenceDirectory, "admin-enquiries.png"), fullPage: true });
  await enquiry.getByRole("button", { name: "Mark as read" }).click();
  await enquiry.getByRole("button", { name: "Mark as responded" }).click();
  await enquiry.getByText("Responded", { exact: true }).waitFor();
  await alice.getByRole("button", { name: "Sign out" }).click();
  await alice.getByRole("heading", { name: "Client sign in" }).waitFor();
  await alice.getByLabel("Email", { exact: true }).fill(email("Alice"));
  await alice.getByLabel("Password", { exact: true }).fill("incorrect-local-test-password");
  await alice.getByRole("button", { name: "Sign in", exact: true }).click();
  await alice.getByRole("alert").getByText("Check your email and password and try again.").waitFor();
  await alice.getByLabel("Password", { exact: true }).fill(pass);
  await alice.getByRole("button", { name: "Sign in", exact: true }).click();
  await record(alice, project)
    .getByText("In progress", { exact: true })
    .waitFor();
  await alice.reload();
  await alice.getByRole("button", { name: "Support", exact: true }).click();
  await record(alice, subject).getByText("Resolved", { exact: true }).waitFor();
  assert.deepEqual(
    browserErrors.filter(
      (error) => error !== "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
    ),
    [],
    "unexpected browser errors (the emulator's 400 response for the deliberate bad-password check is expected)",
  );
  console.log(
    "PASS: staff actions, live client updates, enquiries, sign-out, failed/successful sign-in and deep refresh",
  );
} finally {
  await browser?.close();
  await rules?.cleanup();
  if (server) {
    const closed = once(server.httpServer, "close");
    server.httpServer.close();
    server.httpServer.closeAllConnections();
    await closed;
  }
  await rm(directory, { recursive: true, force: true });
}
