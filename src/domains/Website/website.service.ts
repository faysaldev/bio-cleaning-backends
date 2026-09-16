import jwt from "jsonwebtoken";
import Website from "./website.model";
import WebsiteRevision from "./websiteRevision.model";
import WebsiteMedia from "./websiteMedia.model";
import Service from "../Service/service.model";
import { DEFAULT_WEBSITE_SNAPSHOT } from "./website.defaults";
import { websiteSnapshotSchema, type WebsiteSnapshot } from "./website.validation";
import { JWT_SECRET, WEBSITE_PREVIEW_TTL_MINUTES } from "../../config/ENV";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../lib/errors";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const mergeSystemHomepageSections = (snapshot: WebsiteSnapshot) => {
  const next = clone(snapshot);
  const sections = Array.isArray(next.homepageSections) ? [...next.homepageSections] : [];
  const ids = new Set(sections.map((section) => section.id));
  const types = new Set(sections.map((section) => section.type));
  let changed = false;

  for (const systemSection of DEFAULT_WEBSITE_SNAPSHOT.homepageSections) {
    if (ids.has(systemSection.id) || types.has(systemSection.type)) continue;
    sections.push(clone(systemSection));
    ids.add(systemSection.id);
    types.add(systemSection.type);
    changed = true;
  }

  if (changed) next.homepageSections = sections.sort((a, b) => a.order - b.order);
  return { snapshot: next, changed };
};

const ensureWebsite = async () => {
  const website = await Website.findOneAndUpdate(
    { key: "primary" },
    { $setOnInsert: { key: "primary", draft: clone(DEFAULT_WEBSITE_SNAPSHOT), published: clone(DEFAULT_WEBSITE_SNAPSHOT), draftRevision: 1, publishedRevision: 1, publishedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!website) throw new BadRequestError("Website configuration could not be initialized");

  // Phase 9 introduces additional system-owned homepage section types. Existing
  // CMS documents predate those defaults, so merge only missing system sections
  // without overwriting any editorial content, ordering, visibility, or media.
  const draftMerge = mergeSystemHomepageSections(websiteSnapshotSchema.parse(website.draft));
  const publishedMerge = mergeSystemHomepageSections(websiteSnapshotSchema.parse(website.published));
  if (draftMerge.changed || publishedMerge.changed) {
    if (draftMerge.changed) {
      website.draft = draftMerge.snapshot;
      website.markModified("draft");
    }
    if (publishedMerge.changed) {
      website.published = publishedMerge.snapshot;
      website.markModified("published");
    }
    await website.save();
  }

  return website;
};

const activeServices = async () => {
  const services = await Service.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  return services.map((service: any) => {
    const pricing = service.pricing ? { ...service.pricing } : undefined;
    if (pricing) delete pricing.promotions;
    return { ...service, pricing };
  });
};

const publicPayload = async () => {
  const website = await ensureWebsite();
  const services = await activeServices();
  return {
    content: website.published,
    revision: website.publishedRevision,
    publishedAt: website.publishedAt,
    services,
  };
};

const adminPayload = async () => {
  const website = await ensureWebsite();
  return {
    draft: website.draft,
    published: website.published,
    draftRevision: website.draftRevision,
    publishedRevision: website.publishedRevision,
    publishedAt: website.publishedAt,
    updatedAt: website.updatedAt,
  };
};

const updateDraft = async (snapshot: WebsiteSnapshot, userId?: string) => {
  const parsed = websiteSnapshotSchema.parse(snapshot);
  const website = await ensureWebsite();
  website.draft = clone(parsed);
  website.draftRevision += 1;
  if (userId) website.updatedBy = userId as any;
  website.markModified("draft");
  await website.save();
  return adminPayload();
};

const publish = async (userId?: string, note?: string) => {
  const website = await ensureWebsite();
  const parsed = websiteSnapshotSchema.parse(website.draft);
  const nextPublishedRevision = website.publishedRevision + 1;
  const now = new Date();

  website.published = clone(parsed);
  website.publishedRevision = nextPublishedRevision;
  website.publishedAt = now;
  if (userId) website.publishedBy = userId as any;
  website.markModified("published");
  await website.save();

  await WebsiteRevision.updateOne(
    { revision: nextPublishedRevision },
    {
      $setOnInsert: {
        revision: nextPublishedRevision,
        snapshot: clone(parsed),
        publishedAt: now,
        publishedBy: userId || undefined,
        note: note || undefined,
      },
    },
    { upsert: true },
  );

  // Keep revision storage bounded while retaining useful rollback history.
  const old = await WebsiteRevision.find().sort({ revision: -1 }).skip(30).select("_id").lean();
  if (old.length) await WebsiteRevision.deleteMany({ _id: { $in: old.map((entry) => entry._id) } });
  return adminPayload();
};

const resetDraftToPublished = async (userId?: string) => {
  const website = await ensureWebsite();
  website.draft = clone(website.published);
  website.draftRevision += 1;
  if (userId) website.updatedBy = userId as any;
  website.markModified("draft");
  await website.save();
  return adminPayload();
};

const listRevisions = () => WebsiteRevision.find().sort({ revision: -1 }).limit(30).select("revision publishedAt publishedBy note createdAt").populate("publishedBy", "name email").lean();

const restoreRevisionToDraft = async (revision: number, userId?: string) => {
  const stored = await WebsiteRevision.findOne({ revision }).lean();
  if (!stored) throw new NotFoundError("Website revision not found");
  return updateDraft(websiteSnapshotSchema.parse(stored.snapshot), userId);
};

const createPreviewToken = async () => {
  if (!JWT_SECRET) throw new BadRequestError("JWT_SECRET must be configured for website previews");
  const website = await ensureWebsite();
  const token = jwt.sign(
    { tokenType: "website-preview", revision: website.draftRevision },
    JWT_SECRET,
    { expiresIn: WEBSITE_PREVIEW_TTL_MINUTES * 60 },
  );
  return { token, revision: website.draftRevision, expiresInMinutes: WEBSITE_PREVIEW_TTL_MINUTES };
};

const previewPayload = async (token: string) => {
  if (!JWT_SECRET) throw new UnauthorizedError("Preview is unavailable");
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new UnauthorizedError("Preview link is invalid or expired");
  }
  if (payload?.tokenType !== "website-preview") throw new UnauthorizedError("Invalid preview token");
  const website = await ensureWebsite();
  if (Number(payload.revision) !== website.draftRevision) {
    throw new UnauthorizedError("This preview is stale. Generate a new preview link.");
  }
  const services = await activeServices();
  return { content: website.draft, revision: website.draftRevision, services, preview: true };
};

const listMedia = (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {};
  if (typeof query.kind === "string" && ["image", "video", "document"].includes(query.kind)) filter.kind = query.kind;
  return WebsiteMedia.find(filter).sort({ createdAt: -1 }).limit(200).lean();
};

const createMedia = async (data: { url: string; altText: string; label?: string; kind: "image" | "video" | "document" }, userId?: string) =>
  WebsiteMedia.findOneAndUpdate(
    { url: data.url },
    { $set: { ...data, uploadedBy: userId || undefined } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

const deleteMedia = async (id: string) => {
  const deleted = await WebsiteMedia.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError("Media item not found");
  return deleted;
};

export default {
  publicPayload,
  adminPayload,
  updateDraft,
  publish,
  resetDraftToPublished,
  listRevisions,
  restoreRevisionToDraft,
  createPreviewToken,
  previewPayload,
  listMedia,
  createMedia,
  deleteMedia,
};
