import { Request, Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import schedulingService from "./scheduling.services";

const ok = (res: Response, data: unknown, message: string) =>
  res.status(httpStatus.OK).json(
    response({ statusCode: httpStatus.OK, status: "OK", message, data }),
  );

const getPublicConfig = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await schedulingService.getPublicConfig(), "Scheduling configuration retrieved successfully"),
);
const getSettings = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await schedulingService.getSettings(), "Scheduling settings retrieved successfully"),
);
const updateSettings = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await schedulingService.updateSettings(req.body), "Scheduling settings updated successfully"),
);
const listStaff = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await schedulingService.listStaff(), "Staff schedules retrieved successfully"),
);
const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const data = await schedulingService.createStaff(req.body);
  res.status(httpStatus.CREATED).json(
    response({ statusCode: httpStatus.CREATED, status: "CREATED", message: "Staff schedule created successfully", data }),
  );
});
const updateStaff = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await schedulingService.updateStaff(req.params.id, req.body), "Staff schedule updated successfully"),
);
const deleteStaff = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await schedulingService.deleteStaff(req.params.id), "Staff schedule deleted successfully"),
);
const listBlocks = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await schedulingService.listBlocks(), "Schedule blocks retrieved successfully"),
);
const createBlock = asyncHandler(async (req: Request, res: Response) => {
  const data = await schedulingService.createBlock(req.body);
  res.status(httpStatus.CREATED).json(
    response({ statusCode: httpStatus.CREATED, status: "CREATED", message: "Schedule block created successfully", data }),
  );
});
const updateBlock = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await schedulingService.updateBlock(req.params.id, req.body), "Schedule block updated successfully"),
);
const deleteBlock = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await schedulingService.deleteBlock(req.params.id), "Schedule block deleted successfully"),
);

export default {
  getPublicConfig,
  getSettings,
  updateSettings,
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  listBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
};
