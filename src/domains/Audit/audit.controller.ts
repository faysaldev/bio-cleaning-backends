import { Request, Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { listAuditLogs } from "./audit.service";

const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await listAuditLogs(req.query as Record<string, unknown>);
  res.status(httpStatus.OK).json(response({ message: "Audit logs retrieved", status: "OK", statusCode: httpStatus.OK, data }));
});
export default { list };
