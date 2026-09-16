import Service from "./service.model";
import { CreateServiceInput, UpdateServiceInput } from "./service.validation";
import { NotFoundError } from "../../lib/errors";

const createService = async (data: CreateServiceInput) => Service.create(data);

const getAllServices = async () =>
  Service.find({ isActive: true }).sort({ createdAt: -1 });

const getAllServicesAdmin = async () => Service.find().sort({ createdAt: -1 });

const getServiceById = async (id: string) => {
  const service = await Service.findOne({ _id: id, isActive: true });
  if (!service) throw new NotFoundError("Service not found");
  return service;
};

const updateService = async (id: string, data: UpdateServiceInput) => {
  const service = await Service.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!service) throw new NotFoundError("Service not found");
  return service;
};

const deleteService = async (id: string) => {
  const service = await Service.findByIdAndDelete(id);
  if (!service) throw new NotFoundError("Service not found");
  return service;
};

const getShortServices = async () =>
  Service.find({ isActive: true })
    .select("tags name _id basePrice isActive duration description pricing scheduling image includes")
    .sort({ createdAt: -1 });

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
