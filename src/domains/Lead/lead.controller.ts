import { Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { ProtectedRequest } from "../../types/protected-request";
import leadService from "./lead.services";

const capturePublicLead = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.capturePublicLead(req.body);
  res.status(httpStatus.CREATED).json(response({ message: "Lead captured successfully", status: "CREATED", statusCode: httpStatus.CREATED, data: { id: result._id } }));
});

const createLead = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.createLead(req.body, req.user?._id);
  res.status(httpStatus.CREATED).json(response({ message: "Lead created successfully", status: "CREATED", statusCode: httpStatus.CREATED, data: result }));
});

const listLeads = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.listLeads(req.query);
  res.status(httpStatus.OK).json(response({ message: "Leads retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result.leads, type: result.meta }));
});

const pipeline = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.pipeline(req.query);
  res.status(httpStatus.OK).json(response({ message: "Lead pipeline retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});


const board = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.board(req.query);
  res.status(httpStatus.OK).json(response({ message: "Lead board retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const followUps = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.followUps(req.query);
  res.status(httpStatus.OK).json(response({ message: "Follow-up queue retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const owners = asyncHandler(async (_req: ProtectedRequest, res: Response) => {
  const result = await leadService.getOwners();
  res.status(httpStatus.OK).json(response({ message: "Lead owners retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const getLead = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.getLead(req.params.id);
  res.status(httpStatus.OK).json(response({ message: "Lead retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const updateLead = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.updateLead(req.params.id, req.body, req.user?._id);
  res.status(httpStatus.OK).json(response({ message: "Lead updated successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const convertLead = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.convertLead(req.params.id, req.body.customer, req.user?._id);
  res.status(httpStatus.OK).json(response({ message: "Lead converted to customer successfully", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const recordActivity = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.recordActivity(req.params.id, req.body, req.user?._id);
  res.status(httpStatus.CREATED).json(response({ message: "Lead activity recorded", status: "CREATED", statusCode: httpStatus.CREATED, data: result }));
});

const createTask = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.createTask(req.params.id, req.body, req.user?._id);
  res.status(httpStatus.CREATED).json(response({ message: "Follow-up task created", status: "CREATED", statusCode: httpStatus.CREATED, data: result }));
});

const updateTask = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.updateTask(req.params.id, req.params.taskId, req.body, req.user?._id);
  res.status(httpStatus.OK).json(response({ message: "Lead task updated", status: "OK", statusCode: httpStatus.OK, data: result }));
});

const importLeads = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await leadService.importLeads(req.body.leads, req.user?._id);
  res.status(httpStatus.OK).json(response({ message: "Lead import completed", status: "OK", statusCode: httpStatus.OK, data: result }));
});

export default {
  capturePublicLead,
  createLead,
  listLeads,
  pipeline,
  board,
  followUps,
  owners,
  getLead,
  updateLead,
  convertLead,
  recordActivity,
  createTask,
  updateTask,
  importLeads,
};
