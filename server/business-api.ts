import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { adminAuth } from "./firebase-admin";
import {
  businessStore,
  databaseConfigured,
  type BusinessStore,
  type RecordData,
} from "./business-store";
import { askGeraki } from "./geraki";
import {
  paymentsConfigured,
  razorpay,
  validSignature,
  recordPayment,
  recordRefund,
} from "./payments";
import {
  settingsSchema,
  defaultSettings,
  contentSchema,
  inquirySchema,
  briefSchema,
  milestoneAmounts,
  models,
  type BusinessSettings,
  type Content,
  type ProjectOrder,
  type PaymentStage,
} from "../shared/business";
import { showcase } from "../shared/showcase";

type Identity = {
  uid: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
  admin?: boolean;
  role?: string;
};
type Dependencies = {
  store?: BusinessStore;
  verify?: (token: string) => Promise<Identity>;
  ai?: typeof askGeraki;
  provider?: typeof razorpay;
  storageReady?: () => boolean;
  paymentReady?: () => boolean;
};
const fail = (status: number, message: string): never => {
  throw Object.assign(new Error(message), { status });
};
const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const stages = ["booking", "approval", "progress", "delivery"] as const;
const time = () => new Date().toISOString();

export function createApplication(dependencies: Dependencies = {}) {
  const store = dependencies.store || businessStore;
  const verify =
    dependencies.verify || ((token) => adminAuth.verifyIdToken(token, true));
  const ai = dependencies.ai || askGeraki;
  const provider = dependencies.provider || razorpay;
  const storageReady = dependencies.storageReady || databaseConfigured;
  const paymentReady = dependencies.paymentReady || paymentsConfigured;
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://checkout.razorpay.com",
            "https://apis.google.com",
            ...(process.env.NODE_ENV === "production"
              ? []
              : ["'unsafe-inline'"]),
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          connectSrc: [
            "'self'",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
            "https://*.firebaseapp.com",
            "https://*.razorpay.com",
            ...(process.env.NODE_ENV === "production"
              ? []
              : [
                  "ws://localhost:*",
                  "ws://127.0.0.1:*",
                  "http://127.0.0.1:*",
                  "http://localhost:*",
                ]),
          ],
          frameSrc: ["https://*.firebaseapp.com", "https://*.razorpay.com"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests:
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
    }),
  );
  app.get(["/health", "/api/health"], (_req, res) =>
    res.json({ status: "ok" }),
  );
  app.get("/readiness", async (_req, res) => {
    try {
      await store.get("business_settings", "public");
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "not_ready", dependency: "storage" });
    }
  });
  // Razorpay signatures require the exact bytes, before JSON parsing or any transformation.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.get("x-razorpay-signature") || "";
      if (
        !secret ||
        !Buffer.isBuffer(req.body) ||
        !validSignature(req.body.toString("utf8"), signature, secret)
      )
        return res.status(400).json({ error: "Invalid webhook signature" });
      let event;
      try {
        event = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ error: "Invalid event" });
      }
      if (event.event === "payment.captured")
        await recordPayment(store, event.payload.payment.entity);
      if (event.event === "refund.processed") {
        const refund = event.payload.refund.entity;
        const payment = await provider(
          `payments/${encodeURIComponent(refund.payment_id)}`,
        );
        await recordRefund(store, payment);
      }
      res.json({ received: true });
    },
  );
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );
  const chatLimit = rateLimit({
    windowMs: 60000,
    limit: 12,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Please wait a minute before sending another message." },
  });
  const writeLimit = rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Please wait a minute and try again." },
  });
  app.use("/api", async (req, res, next) => {
    if (!req.headers.authorization) return next();
    const match = /^Bearer (.+)$/.exec(req.headers.authorization);
    if (!match) return res.status(401).json({ error: "Please sign in again." });
    try {
      res.locals.identity = await verify(match[1]);
      next();
    } catch {
      res
        .status(401)
        .json({ error: "Your session expired. Please sign in again." });
    }
  });
  const authenticated = (_req: Request, res: Response, next: NextFunction) =>
    res.locals.identity
      ? next()
      : res.status(401).json({ error: "Please sign in to continue." });
  const admin = (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.identity as Identity | undefined;
    return user?.admin === true || user?.role === "admin"
      ? next()
      : res
          .status(user ? 403 : 401)
          .json({ error: "Administrator access required." });
  };
  const identity = (res: Response) => res.locals.identity as Identity;
  const getSettings = async (): Promise<BusinessSettings> => {
    if (!storageReady()) return structuredClone(defaultSettings);
    const saved = await store.get("business_settings", "public");
    return settingsSchema.parse({ ...defaultSettings, ...saved });
  };
  const canPay = (settings: BusinessSettings) =>
    storageReady() &&
    paymentReady() &&
    settings.termsApproved &&
    !!settings.refundPolicy.trim() &&
    !!settings.businessAddress.trim();
  const ownedOrder = async (id: string, res: Response) => {
    const order = await store.get<ProjectOrder>("orders", idSchema.parse(id));
    if (!order || order.clientId !== identity(res).uid)
      return fail(404, "Order not found");
    return order;
  };
  app.get("/api/site", async (_req, res) => {
    const settings = await getSettings();
    res.json({
      ...settings,
      packages: settings.packages.filter((p) => p.published),
      socials: settings.socials.filter((s) => s.enabled),
      checkoutAvailable: canPay(settings),
      assistantAvailable: !!process.env.FEATHERLESS_API_KEY,
      bookingAmount: 50000,
      currency: "INR",
      models,
    });
  });
  app.get("/api/content", async (_req, res) => {
    const content = storageReady()
      ? await store.list<Content>("content", "published", true)
      : showcase;
    res.json(
      content.sort(
        (a, b) => a.order - b.order || b.createdAt.localeCompare(a.createdAt),
      ),
    );
  });
  app.get("/api/content/:slug", async (req, res) => {
    const slug = idSchema.parse(req.params.slug);
    const data = storageReady()
      ? await store.list<Content>("content", "slug", slug)
      : showcase.filter((p) => p.slug === slug);
    const item = data.find((p) => p.published);
    if (!item)
      return res.status(404).json({ error: "This page is not available." });
    res.json(item);
  });
  app.post("/api/contact", writeLimit, async (req, res) => {
    const data = inquirySchema.parse(req.body);
    const id = randomUUID();
    await store.put("inquiries", id, {
      id,
      ...data,
      createdAt: time(),
      status: "new",
    });
    res
      .status(201)
      .json({ id, message: "Thanks. Your message is with the team." });
  });
  app.post("/api/geraki/chat", chatLimit, async (req, res) => {
    const { messages } = z
      .object({
        messages: z
          .array(
            z
              .object({
                role: z.enum(["user", "assistant"]),
                content: z.string().trim().min(1).max(4000),
              })
              .strict(),
          )
          .min(1)
          .max(20),
      })
      .strict()
      .parse(req.body);
    if (
      messages.at(-1)?.role !== "user" ||
      messages.reduce((n, m) => n + m.content.length, 0) > 18000
    )
      return fail(400, "Please start a new conversation.");
    res.set("Cache-Control", "no-store");
    res.json(await ai(messages, await getSettings()));
  });
  app.get("/api/orders", authenticated, async (_req, res) =>
    res.json(
      await store.list<ProjectOrder>("orders", "clientId", identity(res).uid),
    ),
  );
  app.post("/api/orders", authenticated, writeLimit, async (req, res) => {
    const brief = briefSchema.parse(req.body);
    const settings = await getSettings();
    const selected = settings.packages.find(
      (p) =>
        p.published &&
        p.id === brief.packageId &&
        p.serviceId === brief.serviceId,
    );
    if (!selected)
      return fail(
        400,
        "Please choose an available package discussed with Geraki.",
      );
    if (!canPay(settings))
      return fail(
        503,
        "Booking is not open yet. Please send your requirements through Contact.",
      );
    if (brief.email.toLowerCase() !== identity(res).email?.toLowerCase())
      return fail(400, "Use your signed-in email address.");
    const id = randomUUID();
    const order: ProjectOrder = {
      id,
      clientId: identity(res).uid,
      brief,
      packageName: selected.name,
      status: "booking",
      quotePaise: null,
      scope: "",
      bookingCredited: settings.bookingCredited,
      refundPolicy: settings.refundPolicy,
      termsVersion: createHash("sha256")
        .update(
          JSON.stringify([
            settings.refundPolicy,
            settings.bookingCredited,
            settings.businessAddress,
          ]),
        )
        .digest("hex"),
      payments: { booking: { amount: 50000, state: "ready" } },
      createdAt: time(),
      updatedAt: time(),
    };
    await store.put("orders", id, order);
    res.status(201).json(order);
  });
  app.post(
    "/api/orders/:id/pay/:stage",
    authenticated,
    writeLimit,
    async (req, res) => {
      const stage = z.enum(stages).parse(req.params.stage);
      const order = await ownedOrder(idSchema.parse(req.params.id), res);
      if (!canPay(await getSettings()))
        return fail(503, "Payments are not available yet.");
      let reserved = false;
      const locked = await store.change<ProjectOrder>(
        "orders",
        order.id,
        (current) => {
          reserved = false;
          if (!current || current.status === "cancelled")
            return fail(409, "This order cannot be paid.");
          const payment = current.payments[stage];
          if (!payment || !["ready", "pending"].includes(payment.state))
            return fail(
              409,
              "This payment is not ready or is being processed.",
            );
          if (payment.state === "pending" && payment.providerOrderId)
            return current;
          payment.state = "creating";
          reserved = true;
          return current;
        },
      );
      const payment = locked.payments[stage]!;
      if (!reserved)
        return res.json({
          key: process.env.RAZORPAY_KEY_ID,
          orderId: payment.providerOrderId,
          amount: payment.amount,
          currency: "INR",
        });
      try {
        const result = await provider("orders", {
          amount: payment.amount,
          currency: "INR",
          receipt: `${order.id.slice(0, 28)}-${stage.slice(0, 6)}`,
          notes: { project_order: order.id, stage },
        });
        if (
          result.amount !== payment.amount ||
          result.currency !== "INR" ||
          !result.id
        )
          return fail(502, "Payment details could not be confirmed.");
        await store.put("payment_orders", result.id, {
          id: result.id,
          orderId: order.id,
          stage,
        });
        await store.change<ProjectOrder>("orders", order.id, (current) => {
          if (!current) return fail(404, "Order not found");
          current.payments[stage] = {
            ...payment,
            state: "pending",
            providerOrderId: result.id,
          };
          current.updatedAt = time();
          return current;
        });
        res.json({
          key: process.env.RAZORPAY_KEY_ID,
          orderId: result.id,
          amount: payment.amount,
          currency: "INR",
        });
      } catch (error) {
        // An uncertain provider result must be reconciled, never blindly retried and charged twice.
        await store.change<ProjectOrder>("orders", order.id, (current) => {
          if (!current) return fail(404, "Order not found");
          current.payments[stage]!.state = "review";
          return current;
        });
        throw error;
      }
    },
  );
  app.post(
    "/api/orders/:id/verify-payment",
    authenticated,
    async (req, res) => {
      const order = await ownedOrder(idSchema.parse(req.params.id), res);
      const data = z
        .object({
          razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
          razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
          razorpay_signature: z.string().length(64),
        })
        .parse(req.body);
      const match = Object.values(order.payments).some(
        (p) => p.providerOrderId === data.razorpay_order_id,
      );
      if (
        !match ||
        !process.env.RAZORPAY_KEY_SECRET ||
        !validSignature(
          `${data.razorpay_order_id}|${data.razorpay_payment_id}`,
          data.razorpay_signature,
          process.env.RAZORPAY_KEY_SECRET,
        )
      )
        return fail(400, "Payment verification failed");
      const payment = await provider(`payments/${data.razorpay_payment_id}`);
      if (
        payment.order_id !== data.razorpay_order_id ||
        payment.id !== data.razorpay_payment_id
      )
        return fail(400, "Payment does not belong to this order");
      res.json(await recordPayment(store, payment));
    },
  );

  const publicMessageSchema = z.object({
    content: z.string().trim().min(1).max(2000),
    context: z.string().regex(/^(community|post:[a-zA-Z0-9_-]{1,100})$/),
    askGeraki: z.boolean().default(false),
  });
  async function autoReply(message: RecordData, settings: BusinessSettings) {
    if (
      !message.askGeraki ||
      !settings.autoReplies ||
      message.authorId === "geraki"
    )
      return;
    const replyId = `geraki-${message.id}`;
    let claimed = false;
    await store.change("reply_jobs", replyId, (job) => {
      claimed = false;
      const leaseExpired =
        job?.state === "running" &&
        Date.now() - Date.parse(job.updatedAt) > 180000;
      if (job && job.state !== "failed" && !leaseExpired) return job;
      claimed = true;
      return { id: replyId, state: "running", updatedAt: time() };
    });
    if (!claimed) return;
    try {
      const reply = await ai(
        [{ role: "user", content: message.content }],
        settings,
        true,
      );
      await store.put("messages", replyId, {
        id: replyId,
        context: message.context,
        content: reply.content,
        authorId: "geraki",
        authorName: "Geraki · AI assistant",
        model: reply.model,
        status: "published",
        parentId: message.id,
        createdAt: time(),
      });
      await store.put("reply_jobs", replyId, {
        id: replyId,
        state: "complete",
        updatedAt: time(),
      });
    } catch {
      await store.put("reply_jobs", replyId, {
        id: replyId,
        state: "failed",
        updatedAt: time(),
      });
    }
  }
  app.get("/api/messages", async (req, res) => {
    const context = publicMessageSchema.shape.context.parse(req.query.context);
    if (context === "community" && !(await getSettings()).communityEnabled)
      return res.json([]);
    if (context.startsWith("post:")) {
      const post = await store.get<Content>("content", context.slice(5));
      if (!post?.published) return fail(404, "Post not found");
    }
    const messages = await store.list("messages", "context", context);
    res.json(
      messages
        .filter(
          (m) =>
            m.status === "published" || m.authorId === res.locals.identity?.uid,
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(-100),
    );
  });
  app.post("/api/messages", authenticated, writeLimit, async (req, res) => {
    const data = publicMessageSchema.parse(req.body);
    const settings = await getSettings();
    const user = identity(res);
    if (!user.email_verified)
      return fail(403, "Verify your email before posting.");
    if (data.context === "community" && !settings.communityEnabled)
      return fail(403, "Community posting is currently paused.");
    if (data.context.startsWith("post:")) {
      const post = await store.get<Content>("content", data.context.slice(5));
      if (!post?.published) return fail(404, "Post not found");
    }
    const id = randomUUID();
    const message = {
      id,
      ...data,
      authorId: user.uid,
      authorName: (user.name || "Community member").slice(0, 80),
      status: "published",
      createdAt: time(),
    };
    await store.put("messages", id, message);
    // Persist the question before requesting a reply; retries cannot duplicate the AI message.
    await autoReply(message, settings);
    res.status(201).json(message);
  });
  app.post(
    "/api/messages/:id/report",
    authenticated,
    writeLimit,
    async (req, res) => {
      const messageId = idSchema.parse(req.params.id);
      const message = await store.get("messages", messageId);
      if (!message || message.status !== "published")
        return fail(404, "Message not found");
      const id = createHash("sha256")
        .update(`${messageId}:${identity(res).uid}`)
        .digest("hex");
      await store.put("reports", id, {
        id,
        messageId,
        authorId: identity(res).uid,
        createdAt: time(),
        status: "open",
      });
      res.json({ received: true });
    },
  );

  app.use("/api/admin", admin);
  app.get("/api/admin/overview", async (_req, res) => {
    const [settings, content, orders, inquiries, messages, reports] =
      await Promise.all([
        getSettings(),
        store.list("content"),
        store.list("orders"),
        store.list("inquiries"),
        store.list("messages"),
        store.list("reports"),
      ]);
    res.json({
      settings,
      content,
      orders,
      inquiries,
      messages,
      reports,
      readiness: {
        storage: storageReady(),
        featherless: !!process.env.FEATHERLESS_API_KEY,
        razorpay: paymentReady(),
        policies: canPay(settings),
        packages: settings.packages.some((p) => p.published),
      },
    });
  });
  app.put("/api/admin/settings", async (req, res) => {
    const settings = settingsSchema.parse(req.body);
    if (
      settings.termsApproved &&
      (!settings.refundPolicy.trim() || !settings.businessAddress.trim())
    )
      return fail(
        400,
        "Add the business address and refund terms before enabling payments.",
      );
    await store.put("business_settings", "public", {
      id: "public",
      ...settings,
    });
    res.json(settings);
  });
  app.post("/api/admin/content", async (req, res) => {
    const data = contentSchema.parse(req.body);
    const duplicate = await store.list("content", "slug", data.slug);
    if (duplicate.length)
      return fail(409, "That page address is already used.");
    const id = randomUUID();
    const content = { id, ...data, createdAt: time(), updatedAt: time() };
    await store.put("content", id, content);
    res.status(201).json(content);
  });
  app.put("/api/admin/content/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const data = contentSchema.parse(req.body);
    const existing = await store.get("content", id);
    if (!existing) return fail(404, "Content not found");
    const duplicates = await store.list("content", "slug", data.slug);
    if (duplicates.some((c) => c.id !== id))
      return fail(409, "That page address is already used.");
    const content = { ...existing, ...data, id, updatedAt: time() };
    await store.put("content", id, content);
    res.json(content);
  });
  app.delete("/api/admin/content/:id", async (req, res) => {
    await store.remove("content", idSchema.parse(req.params.id));
    res.sendStatus(204);
  });
  app.post("/api/admin/import-projects", async (_req, res) => {
    for (const project of showcase)
      if (!(await store.get("content", project.id)))
        await store.put("content", project.id, {
          ...project,
          published: false,
          createdAt: time(),
          updatedAt: time(),
        });
    res.json({
      message:
        "Verified public projects imported as drafts. Review before publishing.",
    });
  });
  app.post("/api/admin/import-legacy", async (req, res) => {
    const { cursor } = z
      .object({ cursor: z.string().min(1).max(1500).optional() })
      .parse(req.body || {});
    const { items: posts, nextCursor } = await store.page("blog_posts", cursor);
    let imported = 0;
    let alreadyImported = 0;
    const issues: { id: string; reason: string; fields?: string[] }[] = [];
    for (const post of posts) {
      const id = `legacy-${post.id}`;
      if (!idSchema.safeParse(id).success) {
        issues.push({ id: post.id, reason: "invalid_content", fields: ["id"] });
        continue;
      }
      if (await store.get("content", id)) {
        alreadyImported++;
        continue;
      }
      const safe = contentSchema.safeParse({
        title: post.title,
        slug: post.slug,
        kind: "article",
        excerpt: post.excerpt || "An article from ArtHQ.",
        body: post.content || post.body,
        published: false,
        featured: false,
        category: "Insights",
      });
      if (!safe.success) {
        issues.push({
          id: post.id,
          reason: "invalid_content",
          fields: safe.error.issues.map((i) => i.path.join(".")),
        });
        continue;
      }
      if ((await store.list("content", "slug", safe.data.slug)).length) {
        issues.push({ id: post.id, reason: "slug_conflict" });
        continue;
      }
      let created = false;
      try {
        await store.change("content", id, (current) => {
          created = !current;
          return (
            current || {
              id,
              ...safe.data,
              createdAt: time(),
              updatedAt: time(),
            }
          );
        });
        if (created) imported++;
        else alreadyImported++;
      } catch (error: any) {
        if (error.status !== 409) throw error;
        issues.push({ id: post.id, reason: "slug_conflict" });
      }
    }
    res.json({
      imported,
      alreadyImported,
      skipped: issues.length,
      issues,
      nextCursor,
      complete: nextCursor === null,
    });
  });
  app.put("/api/admin/orders/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const action = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("approve"),
          totalINR: z.number().min(1700).max(10000000),
          scope: z.string().trim().min(10).max(10000),
        }),
        z.object({
          action: z.literal("release"),
          stage: z.enum(["progress", "delivery"]),
        }),
      ])
      .parse(req.body);
    const order = await store.change<ProjectOrder>("orders", id, (current) => {
      if (!current) return fail(404, "Order not found");
      if (action.action === "approve") {
        if (
          current.status !== "review" ||
          current.payments.booking?.state !== "paid"
        )
          return fail(
            409,
            "The booking payment must be confirmed before approval.",
          );
        current.quotePaise = Math.round(action.totalINR * 100);
        current.scope = action.scope;
        current.status = "approved";
        const amounts = milestoneAmounts(
          current.quotePaise,
          current.bookingCredited,
        );
        current.payments.approval = {
          amount: amounts.approval,
          state: "ready",
        };
      } else {
        if (!current.quotePaise || current.status !== "in_progress")
          return fail(409, "The project is not in progress.");
        const previous = action.stage === "progress" ? "approval" : "progress";
        if (
          current.payments[previous]?.state !== "paid" ||
          current.payments[action.stage]
        )
          return fail(
            409,
            "Confirm the previous payment first; each milestone can be released once.",
          );
        current.payments[action.stage] = {
          amount: milestoneAmounts(current.quotePaise, current.bookingCredited)[
            action.stage
          ],
          state: "ready",
        };
      }
      current.updatedAt = time();
      return current;
    });
    res.json(order);
  });
  app.post("/api/admin/orders/:id/reconcile", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { stage, providerOrderId } = z
      .object({
        stage: z.enum(stages),
        providerOrderId: z.string().regex(/^order_[a-zA-Z0-9]+$/),
      })
      .parse(req.body);
    const current = await store.get<ProjectOrder>("orders", id);
    const payment = current?.payments[stage];
    if (!payment) return fail(404, "Payment not found");
    const remote = await provider(`orders/${providerOrderId}`);
    if (
      remote.id !== providerOrderId ||
      remote.amount !== payment.amount ||
      remote.currency !== "INR" ||
      remote.notes?.project_order !== id ||
      remote.notes?.stage !== stage
    )
      return fail(
        400,
        "The provider order does not match this project and milestone",
      );
    const transactions = await provider(`orders/${providerOrderId}/payments`);
    if (!Array.isArray(transactions.items))
      return fail(502, "Payment history could not be confirmed");
    await store.change("payment_orders", providerOrderId, (ref) => {
      if (ref && (ref.orderId !== id || ref.stage !== stage))
        return fail(409, "Provider order already belongs to another milestone");
      return { id: providerOrderId, orderId: id, stage };
    });
    await store.change<ProjectOrder>("orders", id, (order) => {
      if (!order || !order.payments[stage])
        return fail(404, "Payment not found");
      const p = order.payments[stage]!;
      if (p.providerOrderId && p.providerOrderId !== providerOrderId)
        return fail(
          409,
          "This milestone already has a different provider order",
        );
      if (p.amount !== remote.amount)
        return fail(409, "Payment changed during review");
      p.providerOrderId = providerOrderId;
      if (["ready", "review", "creating", "pending"].includes(p.state))
        p.state = "pending";
      order.updatedAt = time();
      return order;
    });
    for (const transaction of transactions.items) {
      if (transaction.order_id !== providerOrderId)
        return fail(502, "Unexpected payment reference");
      if (transaction.status === "captured")
        await recordPayment(store, transaction);
      if (transaction.amount_refunded > 0)
        await recordRefund(store, transaction);
    }
    res.json(await store.get("orders", id));
  });
  app.put("/api/admin/reports/:id", async (req, res) => {
    const status = z.enum(["open", "resolved"]).parse(req.body.status);
    res.json(
      await store.change(
        "reports",
        idSchema.parse(req.params.id),
        (current) => {
          if (!current) return fail(404, "Report not found");
          return { ...current, status, updatedAt: time() };
        },
      ),
    );
  });
  app.put("/api/admin/inquiries/:id", async (req, res) => {
    const status = z
      .enum(["new", "contacted", "closed"])
      .parse(req.body.status);
    const result = await store.change(
      "inquiries",
      idSchema.parse(req.params.id),
      (current) => {
        if (!current) return fail(404, "Inquiry not found");
        return { ...current, status };
      },
    );
    res.json(result);
  });
  app.put("/api/admin/messages/:id", async (req, res) => {
    const status = z.enum(["published", "hidden"]).parse(req.body.status);
    const result = await store.change(
      "messages",
      idSchema.parse(req.params.id),
      (current) => {
        if (!current) return fail(404, "Message not found");
        return { ...current, status };
      },
    );
    res.json(result);
  });
  app.post("/api/admin/messages/:id/retry", async (req, res) => {
    const message = await store.get("messages", idSchema.parse(req.params.id));
    if (!message || message.status !== "published")
      return fail(404, "Message not found");
    await autoReply(message, await getSettings());
    res.json({ received: true });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "This endpoint does not exist." }),
  );
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    const status =
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status <= 599
        ? error.status
        : 500;
    console.error("Request failed", {
      status,
      code: error.code || "request_error",
    });
    res.status(status).json({
      error:
        status === 500
          ? "We could not complete that request. Please try again or contact the team."
          : error.message,
    });
  });
  return app;
}
