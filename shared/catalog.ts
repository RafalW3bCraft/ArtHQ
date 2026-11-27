import type { BusinessSettings } from "./business";
export type {
  BusinessSettings,
  ServicePackage,
  Content,
  Brief,
  Payment,
  PaymentStage,
  ProjectOrder,
} from "./business";

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
