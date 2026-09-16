import { Request, Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import reviewService from "./review.service";

const ok = (res: Response, data: unknown, message: string) => res.status(httpStatus.OK).json(response({ statusCode: httpStatus.OK, status: "OK", message, data }));
const getPublic = asyncHandler(async (req: Request, res: Response) => ok(res, await reviewService.getPublicReview(req.params.token), "Review request retrieved"));
const submitPublic = asyncHandler(async (req: Request, res: Response) => ok(res, await reviewService.submitPublicReview(req.params.token, req.body.rating, req.body.comment, req.body.publishConsent), "Thank you for your feedback"));
const listPublicTestimonials = asyncHandler(async (_req: Request, res: Response) => ok(res, await reviewService.listPublicTestimonials(), "Verified testimonials retrieved"));
const listAdmin = asyncHandler(async (req: Request, res: Response) => ok(res, await reviewService.listAdminReviews(req.query), "Reviews retrieved"));
const resend = asyncHandler(async (req: Request, res: Response) => ok(res, await reviewService.createReviewRequestForBooking(req.params.bookingId, { rotate: true }), "Review request queued"));
export default { getPublic, submitPublic, listPublicTestimonials, listAdmin, resend };
