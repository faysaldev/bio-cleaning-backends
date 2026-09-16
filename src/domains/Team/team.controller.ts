import { Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { ProtectedRequest } from "../../types/protected-request";
import teamService from "./team.services";

const ok = (res: Response, data: unknown, message: string) =>
  res.status(httpStatus.OK).json(response({ statusCode: httpStatus.OK, status: "OK", message, data }));

const listStaff = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.listStaff(req.query), "Team members retrieved successfully"),
);
const getStaff = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.getStaff(req.params.id), "Team member retrieved successfully"),
);
const createStaff = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const data = await teamService.createStaff(req.body, req.user!.role as any);
  res.status(httpStatus.CREATED).json(response({ statusCode: httpStatus.CREATED, status: "CREATED", message: "Team member created successfully", data }));
});
const updateStaff = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.updateStaff(req.params.id, req.body, req.user!.role as any), "Team member updated successfully"),
);
const deactivateStaff = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.deactivateStaff(req.params.id, req.user!.role as any), "Team member deactivated successfully"),
);
const listCrews = asyncHandler(async (_req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.listCrews(), "Crews retrieved successfully"),
);
const createCrew = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const data = await teamService.createCrew(req.body);
  res.status(httpStatus.CREATED).json(response({ statusCode: httpStatus.CREATED, status: "CREATED", message: "Crew created successfully", data }));
});
const updateCrew = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.updateCrew(req.params.id, req.body), "Crew updated successfully"),
);
const deactivateCrew = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.deactivateCrew(req.params.id), "Crew deactivated successfully"),
);
const me = asyncHandler(async (req: ProtectedRequest, res: Response) =>
  ok(res, await teamService.getMyStaffProfile(req.user!._id), "Staff profile retrieved successfully"),
);

export default { listStaff, getStaff, createStaff, updateStaff, deactivateStaff, listCrews, createCrew, updateCrew, deactivateCrew, me };
