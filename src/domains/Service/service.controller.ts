import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import serviceService from "./service.services";

const createService = asyncHandler(async (req: Request, res: Response) => {
  const result = await serviceService.createService(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Service created successfully",
      status: "CREATED",
      statusCode: httpStatus.CREATED,
      data: result,
    }),
  );
});

const getAllServices = asyncHandler(async (req: Request, res: Response) => {
  const result = await serviceService.getAllServices(req.query);
  res.status(httpStatus.OK).json(
    response({
      message: "Services retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getAllServicesAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await serviceService.getAllServicesAdmin();
    res.status(httpStatus.OK).json(
      response({
        message: "Services retrieved successfully",
        status: "OK",
        statusCode: httpStatus.OK,
        data: result,
      }),
    );
  },
);

const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const result = await serviceService.getServiceById(req.params.id);
  res.status(httpStatus.OK).json(
    response({
      message: "Service retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const updateService = asyncHandler(async (req: Request, res: Response) => {
  console.log(req.body);
  const result = await serviceService.updateService(req.params.id, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: "Service updated successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const deleteService = asyncHandler(async (req: Request, res: Response) => {
  await serviceService.deleteService(req.params.id);
  res.status(httpStatus.OK).json(
    response({
      message: "Service deleted successfully",
      status: "OK",
      statusCode: httpStatus.OK,
    }),
  );
});

const getShortServices = asyncHandler(async (req: Request, res: Response) => {
  const result = await serviceService.getShortServices();
  res.status(httpStatus.OK).json(
    response({
      message: "Short service details retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const serviceController = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  getShortServices,
  getAllServicesAdmin,
};

export default serviceController;
