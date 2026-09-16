import { Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { ProtectedRequest } from "../../types/protected-request";
import customerService from "./customer.services";

const createCustomer = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await customerService.createCustomer(req.body);
  res.status(httpStatus.CREATED).json(response({ message: "Customer created successfully", status: "CREATED", statusCode: httpStatus.CREATED, data: result }));
});

const getCustomers = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await customerService.getCustomers(req.query);
  res.status(httpStatus.OK).json(response({ message: "Customers retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result.customers, type: result.meta }));
});

const getCustomer360 = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await customerService.getCustomer360(req.params.id);
  res.status(httpStatus.OK).json(response({ message: "Customer profile retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const updateCustomer = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await customerService.updateCustomer(req.params.id, req.body);
  res.status(httpStatus.OK).json(response({ message: "Customer updated successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const addNote = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await customerService.addNote(req.params.id, req.body.body, req.user?._id);
  res.status(httpStatus.CREATED).json(response({ message: "Customer note added", status: "CREATED", statusCode: httpStatus.CREATED, data: result }));
});

const addReview = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await customerService.addReview(req.params.id, req.body);
  res.status(httpStatus.CREATED).json(response({ message: "Customer review added", status: "CREATED", statusCode: httpStatus.CREATED, data: result }));
});

export default { createCustomer, getCustomers, getCustomer360, updateCustomer, addNote, addReview };
