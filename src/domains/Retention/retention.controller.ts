import { Request, Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { COMMUNICATIONS_CRON_SECRET } from "../../config/ENV";
import { UnauthorizedError } from "../../lib/errors";
import retentionService from "./retention.service";
import { processNotificationQueue } from "../Notification/notification.worker";

const ok = (res: Response, data: unknown, message: string) => res.status(httpStatus.OK).json(response({ statusCode: httpStatus.OK, status: "OK", message, data }));
const getSettings = asyncHandler(async (_req: Request, res: Response) => ok(res, await retentionService.getSettings(), "Communication settings retrieved"));
const updateSettings = asyncHandler(async (req: Request, res: Response) => ok(res, await retentionService.updateSettings(req.body), "Communication settings updated"));
const summary = asyncHandler(async (_req: Request, res: Response) => ok(res, await retentionService.getSummary(), "Communication summary retrieved"));
const deliveries = asyncHandler(async (req: Request, res: Response) => ok(res, await retentionService.listDeliveries(req.query), "Delivery queue retrieved"));
const retryDelivery = asyncHandler(async (req: Request, res: Response) => ok(res, await retentionService.retryDelivery(req.params.id), "Delivery queued for retry"));
const run = asyncHandler(async (_req: Request, res: Response) => ok(res, await retentionService.runAutomationSweep(), "Communication automation completed"));
const cron = asyncHandler(async (req: Request, res: Response) => {
  if (!COMMUNICATIONS_CRON_SECRET || req.header("x-cron-secret") !== COMMUNICATIONS_CRON_SECRET) throw new UnauthorizedError("Invalid cron secret");
  const automation = await retentionService.runAutomationSweep();
  const delivered = await processNotificationQueue(100);
  ok(res, { ...automation, delivered }, "Communication cron completed");
});
export default { getSettings, updateSettings, summary, deliveries, retryDelivery, run, cron };
