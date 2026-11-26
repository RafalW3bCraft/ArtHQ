import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { defaultSettings } from "../../shared/business";
import { showcase } from "../../shared/showcase";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/site", (route) =>
    route.fulfill({
      json: {
        ...defaultSettings,
        socials: defaultSettings.socials.filter((s) => s.enabled),
        checkoutAvailable: false,
        assistantAvailable: true,
      },
    }),
  );
  await page.route("**/api/content", (route) =>
    route.fulfill({ json: showcase }),
  );
  await page.route("**/api/content/*", (route) => {
    const slug = route.request().url().split("/").pop();
    const project = showcase.find((p) => p.slug === slug);
    return route.fulfill({
      status: project ? 200 : 404,
      json: project || { error: "Not found" },
    });
  });
  await page.route("**/api/messages?*", (route) => route.fulfill({ json: [] }));
});
test("home communicates services and has no horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your next idea/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Learn about Websites", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("service details open accessibly, close with Escape, and link to Geraki", async ({
  page,
}) => {
  await page.goto("/services");
  const button = page.getByRole("button", {
    name: "Learn about Bots & automation",
  });
  await button.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Bots & automation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole("link", { name: "Discuss your idea" }).click();
  await expect(page).toHaveURL(/\/start\?service=bots/);
});
test("Geraki responds, preserves conversation on navigation, and can be cleared", async ({
  page,
}) => {
  await page.route("**/api/geraki/chat", (route) =>
    route.fulfill({
      json: {
        content: "What should your website help customers do?",
        model: "MiniMaxAI/MiniMax-M3",
      },
    }),
  );
  await page.goto("/start");
  await page
    .getByLabel("Your message to Geraki")
    .fill("I need a business website.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "What should your website help customers do?",
  );
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "I need a business website.",
  );
  await page.getByRole("button", { name: "Clear conversation" }).click();
  await expect(page.getByRole("log")).not.toContainText(
    "I need a business website.",
  );
});
test("Geraki provider failure offers contact without claiming success", async ({
  page,
}) => {
  await page.route("**/api/geraki/chat", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Geraki is temporarily unavailable." },
    }),
  );
  await page.goto("/start");
  await page.getByLabel("Your message to Geraki").fill("Hello");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(
    page.getByRole("alert").getByRole("link", { name: "Contact the team" }),
  ).toBeVisible();
});
test("contact submits business requirements and shows confirmation", async ({
  page,
}) => {
  let submitted: any;
  await page.route("**/api/contact", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { id: "test", message: "Received" },
    });
  });
  await page.goto("/contact");
  await page.getByLabel("Your name", { exact: true }).fill("Test customer");
  await page.getByLabel("Email address").fill("client@example.test");
  await page.getByLabel("What can we help with?").selectOption("apps");
  await page.getByLabel("Your idea").fill("A booking app for my business");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send your message" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your message is with the team",
  );
  expect(submitted.serviceId).toBe("apps");
  expect(submitted.consent).toBe(true);
});
test("portfolio uses verified sources without inventing live demo links", async ({
  page,
}) => {
  await page.goto("/projects/sofer");
  await expect(
    page.getByRole("heading", { name: "A little help. A new language." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View project source" }),
  ).toHaveAttribute("href", "https://github.com/RafalW3bCraft/sofer");
  await expect(page.getByRole("link", { name: "Visit live site" })).toHaveCount(
    0,
  );
});
test("all retained public pages render, private areas require sign-in", async ({
  page,
}) => {
  for (const url of [
    "/services",
    "/projects",
    "/process",
    "/blog",
    "/contact",
    "/community",
    "/privacy",
    "/terms",
    "/refunds",
    "/orders",
    "/login",
    "/admin",
    "/not-a-page",
  ]) {
    await page.goto(url);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "This space is for the team." }),
  ).toBeVisible();
});
test("blog filters explain empty results and distinguish failures from missing pages", async ({
  page,
}) => {
  const article = {
    ...showcase[0],
    id: "article",
    slug: "test-article",
    kind: "article",
    title: "A useful article",
    body: "Article body",
    published: true,
  };
  await page.route("**/api/content", (route) =>
    route.fulfill({ json: [article] }),
  );
  await page.goto("/blog");
  await expect(
    page.getByRole("heading", { name: "A useful article" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(page.getByText("No reports published yet.")).toBeVisible();
  await page.route("**/api/content/test-article", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Articles are temporarily unavailable." },
    }),
  );
  await page.goto("/blog/test-article");
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await page.route("**/api/content/test-article", (route) =>
    route.fulfill({ json: article }),
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "A useful article" }),
  ).toBeVisible();
  await expect(page.getByText("Article body", { exact: true })).toBeVisible();
});
test("homepage, service dialogs, and contact meet automated accessibility checks", async ({
  page,
}) => {
  for (const url of ["/", "/services", "/contact", "/start"]) {
    await page.goto(url);
    await page.locator("main h1").waitFor();
    if (url === "/services")
      await page
        .getByRole("button", { name: "Learn about Websites", exact: true })
        .click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

// These browser tests simulate identity and API responses. Server authorization and
// payment verification are separately covered by business.test.ts.
async function signIn(page: import("@playwright/test").Page, admin = false) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "browser-user",
    user_id: "browser-user",
    email: "client@example.test",
    email_verified: true,
    admin,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    aud: "demo-rafal",
    iss: "https://securetoken.google.com/demo-rafal",
    firebase: { sign_in_provider: "password", identities: {} },
  };
  const token = `${Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.test`;
  await page.route("https://identitytoolkit.googleapis.com/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("accounts:lookup")
        ? {
            users: [
              {
                localId: "browser-user",
                email: payload.email,
                emailVerified: true,
                displayName: "Test client",
                providerUserInfo: [
                  {
                    providerId: "password",
                    email: payload.email,
                    federatedId: payload.email,
                  },
                ],
              },
            ],
          }
        : {
            idToken: token,
            refreshToken: "test-refresh",
            expiresIn: "3600",
            localId: "browser-user",
            email: payload.email,
            registered: true,
          },
    }),
  );
  await page.goto(`/login?next=${admin ? "/admin" : "/orders"}`);
  await page.getByLabel("Email", { exact: true }).fill(payload.email);
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("admin can edit packages without changing their identity and save a report draft", async ({
  page,
}) => {
  const packageItem = {
    id: "business-site",
    name: "Business website",
    serviceId: "websites",
    description: "A simple business website.",
    includes: ["Five pages"],
    priceINR: 10000,
    published: true,
  };
  const overview = {
    settings: { ...defaultSettings, packages: [packageItem] },
    content: [] as any[],
    orders: [],
    inquiries: [],
    messages: [],
    reports: [],
    readiness: {},
  };
  await page.route("**/api/admin/overview", (route) =>
    route.fulfill({ json: overview }),
  );
  await page.route("**/api/admin/settings", (route) => {
    overview.settings = route.request().postDataJSON();
    return route.fulfill({ json: overview.settings });
  });
  await page.route("**/api/admin/content", (route) => {
    const item = { ...route.request().postDataJSON(), id: "report-test" };
    overview.content.push(item);
    return route.fulfill({ status: 201, json: item });
  });
  await signIn(page, true);
  await expect(
    page.getByRole("heading", { name: "Your studio, at a glance." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Packages", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Business website", exact: true })
    .click();
  await page
    .getByLabel("Name", { exact: true })
    .fill("Updated website package");
  await expect(page.getByLabel("Package ID", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save package", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Updated website package/ }),
  ).toBeVisible();
  expect(overview.settings.packages).toHaveLength(1);
  expect(overview.settings.packages[0].id).toBe("business-site");
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page.getByRole("button", { name: "New content", exact: true }).click();
  await page.getByLabel("Content type").selectOption("report");
  await page.getByLabel("Title", { exact: true }).fill("A useful report");
  await page.getByLabel("Page address").fill("useful-report");
  await page.getByLabel("Short description").fill("Useful business insights.");
  await page
    .getByLabel("Article / report / project story")
    .fill("A plain-language report for business owners.");
  await page.getByRole("button", { name: "Save content", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A useful report", exact: true }),
  ).toBeVisible();
  expect(overview.content[0].published).toBe(false);
  expect(overview.content[0].kind).toBe("report");
});

test("signed-in client reviews a package, saves a brief, and sees the booking amount", async ({
  page,
}) => {
  const orders: any[] = [];
  const packageItem = {
    id: "website",
    name: "Business website",
    serviceId: "websites",
    description: "A website for your business.",
    includes: ["Five pages"],
    priceINR: 10000,
    published: true,
  };
  await page.route("**/api/site", (route) =>
    route.fulfill({
      json: {
        ...defaultSettings,
        packages: [packageItem],
        checkoutAvailable: true,
        assistantAvailable: true,
        refundPolicy: "Test refund terms.",
      },
    }),
  );
  await page.route("**/api/orders", (route) => {
    if (route.request().method() === "POST")
      orders.push({
        id: "browser-order",
        clientId: "browser-user",
        brief: route.request().postDataJSON(),
        packageName: packageItem.name,
        status: "booking",
        bookingCredited: true,
        refundPolicy: "Test refund terms.",
        payments: { booking: { amount: 50000, state: "ready" } },
      });
    return route.fulfill({
      status: route.request().method() === "POST" ? 201 : 200,
      json: route.request().method() === "POST" ? orders[0] : orders,
    });
  });
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Good things in progress." }),
  ).toBeVisible();
  await page.goto("/start");
  await page
    .getByRole("button", { name: "Prepare my brief", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Test client");
  await page
    .getByLabel("Package discussed with Geraki")
    .selectOption("website");
  await page
    .getByLabel("Your requirements")
    .fill("A five-page website for a local shop.");
  await page.getByLabel("Budget", { exact: true }).fill("₹10,000");
  await page.getByLabel("Preferred timeline").fill("Four weeks");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save brief & continue to booking" })
    .click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(
    page.getByRole("heading", { name: "₹500.00", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review & pay" }),
  ).toBeVisible();
  expect(orders[0].brief.packageId).toBe("website");
  expect(orders[0].brief.consent).toBe(true);
});

test("compact chat opens in place, traps focus, retries once, and continues on the full page", async ({ page }, testInfo) => {
  const requests: any[] = [];
  await page.route("**/api/geraki/chat", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill(requests.length === 1
      ? { status: 503, json: { error: "Geraki is temporarily unavailable." } }
      : { json: { content: "Let’s plan your shop website.", model: "MiniMaxAI/MiniMax-M3" } });
  });
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Discuss your project with Geraki" });
  await launcher.click();
  const dialog = page.getByRole("dialog", { name: "Chat with Geraki" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog.getByLabel("Your message to Geraki")).toBeFocused();
  await dialog.getByLabel("Your message to Geraki").fill("A shop website, please.");
  await dialog.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("temporarily unavailable");
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("log")).toContainText("Let’s plan your shop website.");
  expect(requests[1]).toEqual(requests[0]);
  await expect(dialog.getByText("A shop website, please.", { exact: true })).toHaveCount(1);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("chat-popup.png") });
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await launcher.click();
  await dialog.getByRole("link", { name: "Open full conversation" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole("log")).toContainText("Let’s plan your shop website.");
  await page.getByRole("button", { name: "Clear conversation" }).click();
  await expect(page.getByRole("log")).not.toContainText("shop website");
});

test("chat repairs corrupt saved history and stays within the API context limit", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("geraki-chat", "[null]"));
  await page.goto("/start");
  await expect(page.getByRole("log")).toContainText("Hi, I’m Geraki");
  let payload: any;
  await page.route("**/api/geraki/chat", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { content: "A short reply.", model: "MiniMaxAI/MiniMax-M3" } });
  });
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Your message to Geraki").fill("a".repeat(4000));
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("log").getByText("A short reply.", { exact: true })).toHaveCount(i + 1);
  }
  expect(payload.messages.reduce((sum: number, m: any) => sum + m.content.length, 0)).toBeLessThanOrEqual(18000);
  expect(payload.messages.at(-1).role).toBe("user");
});

test("each blog entry opens, search and kind filters combine, and wrong-section links redirect", async ({ page }) => {
  const articles = ["article", "report"].map((kind, i) => ({
    ...showcase[0], id: `post-${i}`, slug: `insight-${i}`, kind,
    title: i ? "Automation report" : "Planning a website",
    excerpt: i ? "Automation observations" : "A project checklist",
    body: `## Useful insight ${i}\n\nA readable article with [contact](/contact).`,
    sourceUrl: "https://example.com/source",
  }));
  await page.route("**/api/content", (route) => route.fulfill({ json: articles }));
  await page.route("**/api/content/insight-*", (route) => route.fulfill({ json: articles.find((a) => route.request().url().endsWith(a.slug)) }));
  await page.goto("/blog");
  await page.getByLabel("Search articles and reports").fill("website");
  await expect(page.getByRole("heading", { name: "Planning a website" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Automation report" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No insights match");
  await page.getByLabel("Search articles and reports").fill("");
  await expect(page.getByRole("button", { name: "Reports", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Automation report" })).toBeVisible();
  for (const article of articles) {
    await page.goto("/blog");
    await page.getByRole("link", { name: article.title, exact: true }).click();
    await expect(page.getByRole("heading", { name: article.title, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View source", exact: true })).toHaveAttribute("href", article.sourceUrl);
    await expect(page.getByRole("link", { name: /Back to insights/ })).toBeVisible();
  }
  await page.goto("/projects/insight-0");
  await expect(page).toHaveURL(/\/blog\/insight-0$/);
  await page.goto("/blog/sofer");
  await expect(page).toHaveURL(/\/projects\/sofer$/);
});

test("all service dialogs and portfolio entries work and remain usable at three widths", async ({ page }, testInfo) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/services");
    for (const button of await page.getByRole("button", { name: /^Learn about/ }).all()) {
      await button.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("link", { name: "Discuss your idea" })).toHaveAttribute("href", /\/start\?service=/);
      await page.keyboard.press("Escape");
    }
    for (const item of showcase) {
      await page.goto(`/projects/${item.slug}`);
      await expect(page.getByRole("heading", { name: item.title, exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "View project source" })).toHaveAttribute("href", item.sourceUrl);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto("/");
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
  }
});

test("navigation works by click and mobile menu closes with Escape", async ({ page, isMobile }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, url] of [["Services", "/services"], ["Work", "/projects"], ["How it works", "/process"], ["Insights", "/blog"]]) {
    if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${url}$`));
    await expect(nav.getByRole("link", { name: label, exact: true, includeHidden: true })).toHaveAttribute("aria-current", "page");
  }
  if (isMobile) {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    await nav.getByRole("link", { name: "Services", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  }
});

test("admin publishes an article, reads it from Insights, then removes it from publication", async ({ page }) => {
  const overview = {
    settings: defaultSettings, content: [] as any[], orders: [], inquiries: [], messages: [], reports: [], readiness: {},
  };
  await page.route("**/api/admin/overview", (route) => route.fulfill({ json: overview }));
  await page.route("**/api/admin/content", (route) => {
    const article = { ...route.request().postDataJSON(), id: "browser-article", createdAt: "2026-11-19T00:00:00Z", updatedAt: "2026-11-19T00:00:00Z" };
    overview.content.push(article);
    return route.fulfill({ status: 201, json: article });
  });
  await page.route("**/api/admin/content/browser-article", (route) => {
    overview.content[0] = { ...overview.content[0], ...route.request().postDataJSON() };
    return route.fulfill({ json: overview.content[0] });
  });
  await page.route("**/api/content", (route) => route.fulfill({ json: overview.content.filter((c) => c.published) }));
  await page.route("**/api/content/browser-article", (route) => route.fulfill({ status: overview.content[0]?.published ? 200 : 404, json: overview.content[0]?.published ? overview.content[0] : { error: "Not found" } }));
  await signIn(page, true);
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page.getByRole("button", { name: "New content", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("A published studio article");
  await page.getByLabel("Page address").fill("browser-article");
  await page.getByLabel("Short description").fill("A useful introduction.");
  await page.getByLabel("Article / report / project story").fill("## Getting started\n\nDefine your project goal.");
  await page.getByLabel("Publish on website").check();
  await page.getByRole("button", { name: "Save content", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A published studio article", exact: true })).toBeVisible();
  await page.goto("/blog");
  await page.getByRole("link", { name: "A published studio article", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Getting started", exact: true })).toBeVisible();
  await page.goto("/admin");
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page.getByRole("button", { name: "Edit A published studio article", exact: true }).click();
  await page.getByLabel("Publish on website").uncheck();
  await page.getByRole("button", { name: "Save content", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/blog/browser-article");
  await expect(page.locator("main")).not.toContainText("Define your project goal");
  await expect(page.getByRole("heading", { name: /page/i }).first()).toBeVisible();
});

test("contact failure keeps the draft and can be retried", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/contact", (route) => route.fulfill(++attempts === 1
    ? { status: 503, json: { error: "Please try again shortly." } }
    : { status: 201, json: { id: "test" } }));
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send your message" }).click();
  expect(attempts).toBe(0);
  await page.getByLabel("Your name", { exact: true }).fill("Test customer");
  await page.getByLabel("Email address").fill("client@example.test");
  await page.getByLabel("Your idea").fill("A simple website for my business.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send your message" }).click();
  await expect(page.getByRole("alert")).toContainText("try again");
  await expect(page.getByLabel("Your idea")).toHaveValue("A simple website for my business.");
  await page.getByRole("button", { name: "Send your message" }).click();
  await expect(page.getByRole("status")).toContainText("Your message is with the team");
});
