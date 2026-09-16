import { Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { ProtectedRequest } from "../../types/protected-request";
import fieldOpsService from "./fieldOps.services";

const ok = (res: Response, data: unknown, message: string) =>
  res.status(httpStatus.OK).json(response({ statusCode: httpStatus.OK, status: "OK", message, data }));

const listJobs = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.listJobs(req.query), "Dispatch jobs retrieved successfully"),
);
const getJob = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.getAccessibleJob(req.params.id, req.user!._id, req.user!.role as any), "Job retrieved successfully"),
);
const assignJob = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.assignJob(req.params.id, req.body), "Job assignment updated successfully"),
);
const myJobs = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.getMyJobs(req.user!._id, req.query), "Assigned jobs retrieved successfully"),
);
const myOverview = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.getMyOverview(req.user!._id), "Field dashboard retrieved successfully"),
);
const updateStatus = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.updateStatus(req.params.id, req.body.status, req.user!._id, req.user!.role as any), "Job status updated successfully"),
);
const updateChecklist = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.updateChecklist(req.params.id, req.body, req.user!._id, req.user!.role as any), "Checklist updated successfully"),
);
const addPhoto = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.addPhoto(req.params.id, req.body, req.user!._id, req.user!.role as any), "Job photo added successfully"),
);
const addNote = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.addNote(req.params.id, req.body.text, req.user!._id, req.user!.role as any), "Internal note added successfully"),
);
const reportIssue = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.reportIssue(req.params.id, req.body, req.user!._id, req.user!.role as any), "Issue reported successfully"),
);
const resolveIssue = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await fieldOpsService.resolveIssue(req.params.id, req.params.issueKey, req.body.resolution, req.user!._id, req.user!.role as any), "Issue resolved successfully"),
);

export default { listJobs, getJob, assignJob, myJobs, myOverview, updateStatus, updateChecklist, addPhoto, addNote, reportIssue, resolveIssue };
