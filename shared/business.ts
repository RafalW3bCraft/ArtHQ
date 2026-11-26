import { z } from "zod";

export const services = [
  {
    id: "websites",
    name: "Websites",
    description:
      "A home for your business. Built to turn visitors into customers.",
    detail:
      "Business websites, online shops, landing pages, booking sites, and redesigns. We help with the pages, content, mobile experience, and launch.",
    examples: ["Business websites", "Online shops", "Booking & enquiry forms"],
    icon: "Globe",
  },
  {
    id: "apps",
    name: "Apps & web apps",
    description: "Bring your idea to life, or make everyday work simpler.",
    detail:
      "Customer portals, booking platforms, internal tools, and custom apps. We start with the people using your app and build around what they need to do.",
    examples: ["Customer portals", "Business tools", "Custom applications"],
    icon: "PanelsTopLeft",
  },
  {
    id: "bots",
    name: "Bots & automation",
    description: "Let the repetitive work take care of itself.",
    detail:
      "Chatbots, Telegram and Discord bots, automated reminders, and workflows that connect the tools you already use.",
    examples: [
      "Customer support bots",
      "Telegram & Discord bots",
      "Connected workflows",
    ],
    icon: "Bot",
  },
  {
    id: "ai",
    name: "AI for your business",
    description: "Useful AI that understands your work and your customers.",
    detail:
      "Custom AI assistants, document search, model customization, and practical AI tools. We agree on the data, privacy needs, and expected results before building.",
    examples: ["Business assistants", "Document search", "Model customization"],
    icon: "Sparkles",
  },
  {
    id: "scripts",
    name: "Scripts & integrations",
    description: "Small custom tools. A big difference to your day.",
    detail:
      "Connect services, organize data, create reports, and automate manual tasks with scripts built around your process.",
    examples: [
      "Data & reporting tools",
      "Service integrations",
      "Task automation",
    ],
    icon: "Workflow",
  },
  {
    id: "training",
    name: "AI training & support",
    description: "Get comfortable with AI. Keep your digital tools working.",
    detail:
      "Practical AI sessions for individuals and teams, website updates, troubleshooting, and ongoing support. Have something else in mind? Tell us about it.",
    examples: [
      "Individual & team training",
      "Website updates",
      "Ongoing support",
    ],
    icon: "GraduationCap",
  },
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
export const safeUrl = z
  .string()
  .url()
  .refine((v) => v.startsWith("https://"), "Use an HTTPS URL");
export const packageSchema = z.object({
  id: text(80).regex(/^[a-z0-9-]+$/),
  name: text(100),
  serviceId: z.enum(["websites", "apps", "bots", "ai", "scripts", "training"]),
  description: text(1000),
  includes: z.array(text(160)).min(1).max(12),
  priceINR: z.number().int().min(500).max(10000000),
  published: z.boolean().default(false),
});
export type ServicePackage = z.infer<typeof packageSchema>;
export const settingsSchema = z.object({
  contactEmail: z.string().email(),
  socials: z
    .array(z.object({ label: text(40), url: safeUrl, enabled: z.boolean() }))
    .max(8),
  packages: z
    .array(packageSchema)
    .max(30)
    .refine(
      (p) => new Set(p.map((v) => v.id)).size === p.length,
      "Package IDs must be unique",
    ),
  bookingCredited: z.boolean(),
  refundPolicy: z.string().trim().max(5000),
  businessAddress: z.string().trim().max(500),
  termsApproved: z.boolean(),
  communityEnabled: z.boolean(),
  autoReplies: z.boolean(),
});
export type BusinessSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: BusinessSettings = {
  contactEmail: "thewhitefalcon13@proton.me",
  socials: [
    { label: "GitHub", url: "https://github.com/RafalW3bCraft", enabled: true },
    { label: "Telegram", url: "https://t.me/RafalW3bCraft", enabled: false },
    { label: "X", url: "https://x.com/RafalW3bCraft", enabled: false },
    {
      label: "Reddit",
      url: "https://www.reddit.com/user/Geraki_init/",
      enabled: false,
    },
  ],
  packages: [],
  bookingCredited: true,
  refundPolicy: "",
  businessAddress: "",
  termsApproved: false,
  communityEnabled: true,
  autoReplies: true,
};
export const contentSchema = z.object({
  title: text(160),
  slug: text(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(["article", "report", "project"]),
  excerpt: text(400),
  body: text(30000),
  published: z.boolean(),
  featured: z.boolean().default(false),
  category: text(80),
  imageUrl: safeUrl.or(z.literal("")).default(""),
  liveUrl: safeUrl.or(z.literal("")).default(""),
  sourceUrl: safeUrl.or(z.literal("")).default(""),
  order: z.number().int().min(0).max(999).default(0),
});
export type Content = z.infer<typeof contentSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export const inquirySchema = z.object({
  name: text(100),
  email: z.string().email().max(254),
  serviceId: text(40),
  message: text(5000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const briefSchema = z.object({
  name: text(100),
  email: z.string().email().max(254),
  serviceId: text(40),
  requirements: text(5000),
  budget: text(100),
  timeline: text(100),
  packageId: text(80),
  consent: z.literal(true),
});
export type Brief = z.infer<typeof briefSchema>;
export type PaymentStage = "booking" | "approval" | "progress" | "delivery";
export type Payment = {
  amount: number;
  state: "ready" | "creating" | "pending" | "paid" | "review" | "refunded";
  providerOrderId?: string;
  paymentId?: string;
  paidAt?: string;
  refundedAmount?: number;
};
export type ProjectOrder = {
  id: string;
  clientId: string;
  brief: Brief;
  packageName: string;
  status:
    | "booking"
    | "review"
    | "approved"
    | "in_progress"
    | "delivered"
    | "cancelled";
  quotePaise: number | null;
  scope: string;
  bookingCredited: boolean;
  refundPolicy: string;
  termsVersion: string;
  payments: Partial<Record<PaymentStage, Payment>>;
  createdAt: string;
  updatedAt: string;
};
export function milestoneAmounts(total: number, creditBooking: boolean) {
  if (!Number.isSafeInteger(total) || total < 170000)
    throw new Error("Project total must be at least ₹1,700");
  const approval = Math.round(total * 0.3),
    progress = Math.round(total * 0.4);
  return {
    approval: approval - (creditBooking ? 50000 : 0),
    progress,
    delivery: total - approval - progress,
  };
}
export const models = {
  primary: "MiniMaxAI/MiniMax-M3",
  secondary: "moonshotai/Kimi-K3",
} as const;
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
