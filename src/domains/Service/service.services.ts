import mongoose from "mongoose";
import Service from "./service.model";
import { CreateServiceInput, UpdateServiceInput } from "./service.validation";
import { NotFoundError } from "../../lib/errors";
import { cacheDeleteByPrefix, cacheGet, cacheSet } from "../../lib/cache";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "service";
const uniqueSlug = async (name: string, excludeId?: string) => {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (await Service.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${suffix++}`;
  return slug;
};

const createService = async (data: CreateServiceInput) => {
  const service = await Service.create({ ...data, slug: await uniqueSlug(data.name) });
  await cacheDeleteByPrefix("public-services");
  return service;
};

const getAllServices = async () => {
  const cached = await cacheGet<any[]>("public-services:list");
  if (cached) return cached;
  const services = await Service.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  await cacheSet("public-services:list", services, 120);
  return services;
};

const getAllServicesAdmin = async () => Service.find().sort({ createdAt: -1 });

const getServiceById = async (identifier: string) => {
  const filter = mongoose.isValidObjectId(identifier) ? { _id: identifier, isActive: true } : { slug: identifier.toLowerCase(), isActive: true };
  const service = await Service.findOne(filter);
  if (!service) throw new NotFoundError("Service not found");
  return service;
};

const updateService = async (id: string, data: UpdateServiceInput) => {
  const payload: any = { ...data };
  if (data.name) payload.slug = await uniqueSlug(data.name, id);
  const service = await Service.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!service) throw new NotFoundError("Service not found");
  await cacheDeleteByPrefix("public-services");
  return service;
};

const deleteService = async (id: string) => {
  const service = await Service.findByIdAndDelete(id);
  if (!service) throw new NotFoundError("Service not found");
  await cacheDeleteByPrefix("public-services");
  return service;
};

const getShortServices = async () => Service.find({ isActive: true }).select("tags name slug _id basePrice isActive duration description pricing scheduling image includes").sort({ createdAt: -1 });

export const backfillServiceSlugs = async () => {
  const services = await Service.find({ $or: [{ slug: { $exists: false } }, { slug: "" }] }).select("name slug");
  let updated = 0;
  for (const service of services) {
    service.slug = await uniqueSlug(service.name, String(service._id));
    await service.save();
    updated += 1;
  }
  await cacheDeleteByPrefix("public-services");
  return updated;
};

export default { createService, getAllServices, getServiceById, updateService, deleteService, getShortServices, getAllServicesAdmin };
