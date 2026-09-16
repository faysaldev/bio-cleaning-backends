import { z } from "zod";

const safeText = (max = 5000) => z.string().trim().max(max);
const url = z.string().trim().url().max(2000).or(z.literal(""));

const linkSchema = z.object({
  label: safeText(80),
  url,
});

const homepageSectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum([
    "full_service",
    "how_we_clean",
    "equipment",
    "services",
    "why_choose",
    "process",
    "testimonials",
    "satisfaction",
    "service_areas",
    "faq",
    "cta",
    "custom",
  ]),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000),
  eyebrow: safeText(120).optional().default(""),
  title: safeText(220).optional().default(""),
  subtitle: safeText(1200).optional().default(""),
  body: safeText(5000).optional().default(""),
  mediaUrl: url.optional().default(""),
  cta: linkSchema.optional(),
});

const statsSchema = z.object({
  id: z.string().trim().min(1).max(80),
  value: z.number().finite().min(0).max(1000000000),
  decimals: z.number().int().min(0).max(3).default(0),
  suffix: safeText(12).default(""),
  label: safeText(100),
});

const teamMemberSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: safeText(120),
  role: safeText(120),
  bio: safeText(2000).default(""),
  imageUrl: url.default(""),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
});

const testimonialSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: safeText(120),
  role: safeText(160).default(""),
  quote: safeText(2000),
  rating: z.number().int().min(1).max(5).default(5),
  imageUrl: url.default(""),
  videoUrl: url.default(""),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
});

const faqSchema = z.object({
  id: z.string().trim().min(1).max(80),
  question: safeText(300),
  answer: safeText(3000),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
});

const serviceAreaSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: safeText(120),
  description: safeText(1000).default(""),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
});

const socialSchema = z.object({
  platform: safeText(60),
  label: safeText(80),
  url,
});

const valueSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: safeText(120),
  description: safeText(1200),
});

export const websiteSnapshotSchema = z.object({
  branding: z.object({
    siteName: safeText(100),
    tagline: safeText(180),
    logoUrl: url,
    faviconUrl: url,
  }),
  announcement: z.object({
    enabled: z.boolean(),
    text: safeText(240),
    linkLabel: safeText(80).default(""),
    linkUrl: url.default(""),
  }),
  hero: z.object({
    eyebrow: safeText(140),
    title: safeText(320),
    description: safeText(1600),
    mediaUrl: url,
    mediaAlt: safeText(240),
    primaryCta: linkSchema,
    secondaryCta: linkSchema,
    trustItems: z.array(safeText(120)).max(8),
  }),
  statistics: z.array(statsSchema).max(12),
  homepageSections: z.array(homepageSectionSchema).max(30),
  about: z.object({
    eyebrow: safeText(140),
    title: safeText(260),
    intro: safeText(1800),
    storyTitle: safeText(260),
    storyParagraphs: z.array(safeText(3000)).max(12),
    mission: safeText(3000),
    vision: safeText(3000),
    mediaUrl: url,
    values: z.array(valueSchema).max(12),
  }),
  team: z.object({
    eyebrow: safeText(140),
    title: safeText(260),
    intro: safeText(1200),
    members: z.array(teamMemberSchema).max(60),
  }),
  testimonials: z.object({
    eyebrow: safeText(140),
    title: safeText(260),
    intro: safeText(1200),
    items: z.array(testimonialSchema).max(100),
  }),
  faqs: z.object({
    eyebrow: safeText(140),
    title: safeText(260),
    intro: safeText(1200),
    items: z.array(faqSchema).max(100),
  }),
  contact: z.object({
    heading: safeText(260),
    intro: safeText(1600),
    phone: safeText(80),
    email: z.string().trim().email().max(200).or(z.literal("")),
    hours: safeText(300),
    address: safeText(500),
    serviceAreaSummary: safeText(500),
    mapEmbedUrl: url,
  }),
  socialLinks: z.array(socialSchema).max(20),
  serviceAreas: z.array(serviceAreaSchema).max(100),
  policies: z.object({
    privacy: safeText(30000),
    terms: safeText(30000),
    cancellation: safeText(20000),
    accessibility: safeText(20000),
  }),
  seo: z.object({
    siteTitle: safeText(100),
    titleTemplate: safeText(120),
    defaultDescription: safeText(500),
    keywords: z.array(safeText(80)).max(80),
    ogImageUrl: url,
    robotsIndex: z.boolean(),
    robotsFollow: z.boolean(),
  }),
});

export const updateWebsiteDraftSchema = z.object({ snapshot: websiteSnapshotSchema });
export const publishWebsiteSchema = z.object({ note: safeText(300).optional().default("") });
export const createMediaSchema = z.object({
  url: z.string().trim().url().max(2000),
  altText: safeText(240).min(1),
  label: safeText(160).optional(),
  kind: z.enum(["image", "video", "document"]).default("image"),
});

export type WebsiteSnapshot = z.infer<typeof websiteSnapshotSchema>;
