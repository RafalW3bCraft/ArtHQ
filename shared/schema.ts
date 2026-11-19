import { z } from "zod";

const short = z.string().trim().min(1).max(120);
const long = z.string().trim().min(10).max(4000);
export const profileDetails = z.object({
  companyName: short,
  phoneNumber: z.string().trim().min(1).max(40),
});
export const services = {
  website: "Website",
  "telegram-bot": "Telegram bot",
  "ai-assistant": "AI assistant",
  "mobile-app": "Mobile app",
  "e-commerce": "E-commerce",
  other: "Other",
} as const;
export const briefSchema = z.object({
  serviceType: z.enum([
    "website",
    "telegram-bot",
    "ai-assistant",
    "mobile-app",
    "e-commerce",
    "other",
  ]),
  projectName: short,
  description: long,
  timeline: z.string().trim().max(120).optional(),
  budget: z.string().trim().max(120).optional(),
});
export const ticketSchema = z.object({ subject: short, message: long });
export const contactFormSchema = z.object({
  name: short.min(2),
  email: z.email().max(254),
  message: long,
});
export type ContactForm = z.infer<typeof contactFormSchema>;
export type ProfileDetails = z.infer<typeof profileDetails>;
export type UserProfile = ProfileDetails & {
  uid: string;
  email: string;
  role: "user" | "admin";
  createdAt: number;
};
export type Project = z.infer<typeof briefSchema> & {
  id: string;
  userId: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  createdAt: number;
  updatedAt: number;
};
export type SupportMessage = z.infer<typeof ticketSchema> & {
  id: string;
  userId: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: number;
  updatedAt: number;
};
export type ContactSubmission = ContactForm & {
  id: string;
  status: "new" | "read" | "responded";
  createdAt: number;
  respondedAt?: number;
};
export const statusLabel = (value: string) =>
  value === "in-progress"
    ? "In progress"
    : value.charAt(0).toUpperCase() + value.slice(1);
