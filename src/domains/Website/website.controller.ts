import { Request, Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import type { ProtectedRequest } from "../../types/protected-request";
import websiteService from "./website.service";

const ok = (res: Response, data: unknown, message: string) =>
  res.status(httpStatus.OK).json(response({ statusCode: httpStatus.OK, status: "OK", message, data }));

const getPublic = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  ok(res, await websiteService.publicPayload(), "Website retrieved");
});
const getPreview = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  ok(res, await websiteService.previewPayload(req.params.token), "Website preview retrieved");
});
const getAdmin = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, private");
  ok(res, await websiteService.adminPayload(), "Website draft retrieved");
});
const updateDraft = asyncHandler(async (req: ProtectedRequest, res: Response) => ok(res, await websiteService.updateDraft(req.body.snapshot, req.user?._id), "Website draft saved"));
const publish = asyncHandler(async (req: ProtectedRequest, res: Response) => ok(res, await websiteService.publish(req.user?._id, req.body.note), "Website published"));
const resetDraft = asyncHandler(async (req: ProtectedRequest, res: Response) => ok(res, await websiteService.resetDraftToPublished(req.user?._id), "Draft reset to published content"));
const previewToken = asyncHandler(async (_req: ProtectedRequest, res: Response) => ok(res, await websiteService.createPreviewToken(), "Preview link created"));
const revisions = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, private");
  ok(res, await websiteService.listRevisions(), "Website revisions retrieved");
});
const restoreRevision = asyncHandler(async (req: ProtectedRequest, res: Response) => ok(res, await websiteService.restoreRevisionToDraft(Number(req.params.revision), req.user?._id), "Revision restored to draft"));
const media = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, private");
  ok(res, await websiteService.listMedia(req.query), "Website media retrieved");
});
const createMedia = asyncHandler(async (req: ProtectedRequest, res: Response) => ok(res, await websiteService.createMedia(req.body, req.user?._id), "Media added to library"));
const deleteMedia = asyncHandler(async (req: Request, res: Response) => ok(res, await websiteService.deleteMedia(req.params.id), "Media removed from library"));

export default { getPublic, getPreview, getAdmin, updateDraft, publish, resetDraft, previewToken, revisions, restoreRevision, media, createMedia, deleteMedia };
