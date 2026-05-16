import Service, { IService } from "./service.model";
import { CreateServiceInput, UpdateServiceInput } from "./service.validation";
import { NotFoundError } from "../../lib/errors";

const createService = async (data: CreateServiceInput) => {
  const service = await Service.create(data);
  return service;
};

const getAllServices = async (query: any) => {
  const { publishedOnly = "true" } = query;
  const filter: any = {};

  if (publishedOnly === "true") {
    // filter.publish = true;
    filter.isActive = true;
  }

  const services = await Service.find(filter).sort({ createdAt: -1 });
  return services;
};

const getAllServicesAdmin = async () => {
  const services = await Service.find().sort({ createdAt: -1 });
  return services;
};

const getServiceById = async (id: string) => {
  const service = await Service.findById(id);
  if (!service) {
    throw new NotFoundError("Service not found");
  }
  return service;
};

const updateService = async (id: string, data: UpdateServiceInput) => {
  const service = await Service.findByIdAndUpdate(id, data, { new: true });
  if (!service) {
    throw new NotFoundError("Service not found");
  }
  return service;
};

const deleteService = async (id: string) => {
  const service = await Service.findByIdAndDelete(id);
  if (!service) {
    throw new NotFoundError("Service not found");
  }
  return service;
};

const getShortServices = async () => {
  const services = await Service.find({ isActive: true })
    .select("tags name _id basePrice isActive duration description")
    .sort({ createdAt: -1 });
  return services;
};

const serviceService = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  getShortServices,
  getAllServicesAdmin,
};

export default serviceService;
