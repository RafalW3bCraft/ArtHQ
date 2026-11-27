import { z } from "zod";

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

export { services, defaultSettings, models, money } from "./catalog";
