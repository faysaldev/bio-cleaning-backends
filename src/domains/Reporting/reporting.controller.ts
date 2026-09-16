import { Request, Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { getReports } from "./reporting.service";
const get = asyncHandler(async (req: Request, res: Response) => {
  const data = await getReports(req.query as Record<string, unknown>);
  res.status(httpStatus.OK).json(response({ message: "Reports retrieved", status: "OK", statusCode: httpStatus.OK, data }));
});
export default { get };
