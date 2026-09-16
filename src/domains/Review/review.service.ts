import crypto from "crypto";
import Booking from "../Booking/booking.model";
import Customer from "../Customer/customer.model";
import ReviewRequest from "./reviewRequest.model";
import RetentionSettings from "../Retention/retentionSettings.model";
import { FRONTEND_URL, PUBLIC_REVIEW_URL } from "../../config/ENV";
import { hashToken } from "../../lib/authTokens";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { emitCustomerEvent } from "../Notification/notification.service";

const reviewLink = (token: string) => FRONTEND_URL ? `${FRONTEND_URL.replace(/\/$/, "")}/review/${encodeURIComponent(token)}` : undefined;

export const createReviewRequestForBooking = async (bookingId: string, options: { rotate?: boolean } = {}) => {
  const booking: any = await Booking.findById(bookingId);
  if (!booking?.customerId) return null;
  if (booking.status !== "COMPLETED") return null;
  const customer: any = await Customer.findById(booking.customerId);
  if (!customer) return null;
  const settings: any = await RetentionSettings.getSingleton();

  let request: any = await ReviewRequest.findOne({ bookingId }).select("+tokenHash");
  if (request?.status === "SUBMITTED") return { request, alreadySubmitted: true };
  if (!request || options.rotate || request.expiresAt <= new Date()) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    request = await ReviewRequest.findOneAndUpdate(
      { bookingId },
      {
        $set: {
          customerId: customer._id,
          tokenHash,
          status: "PENDING",
          expiresAt: new Date(Date.now() + settings.reviewLinkDays * 24 * 60 * 60 * 1000),
          publicReviewUrl: settings.publicReviewUrl || PUBLIC_REVIEW_URL,
        },
        $unset: { rating: "", comment: "", submittedAt: "" },
      },
      { upsert: true, new: true },
    ).select("+tokenHash");
    const url = reviewLink(token);
    if (url && settings.reviewRequestsEnabled) {
      await emitCustomerEvent({
        customerId: String(customer._id),
        bookingId: String(booking._id),
        type: "REVIEW_REQUEST",
        title: "How did we do?",
        message: `Tell us how your ${booking.serviceType} visit went. Your feedback helps us keep standards high.`,
        href: `/review/${encodeURIComponent(token)}`,
        email: customer.email,
        phone: customer.phone,
        emailSubject: `How was your BIO Cleaning service?`,
        emailHtml: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123b2a"><h2>How did we do?</h2><p>Hi ${customer.name},</p><p>Thank you for choosing BIO Cleaning. We would love your feedback on booking <strong>${booking.reference}</strong>.</p><p><a href="${url}">Leave your review</a></p></div>`,
        smsText: `BIO Cleaning: How did your visit go? Leave a review: ${url}`,
        dedupeKey: `review-request:${booking._id}:${request.updatedAt?.getTime?.() || Date.now()}`,
      });
    }
    return { request, token, url };
  }
  return { request };
};

const getPublicReview = async (token: string) => {
  const request: any = await ReviewRequest.findOne({ tokenHash: hashToken(token) }).select("+tokenHash");
  if (!request) throw new NotFoundError("Review link is invalid");
  if (request.status === "PENDING" && request.expiresAt <= new Date()) {
    request.status = "EXPIRED";
    await request.save();
  }
  if (request.status === "EXPIRED") throw new BadRequestError("This review link has expired");
  const booking: any = await Booking.findById(request.bookingId).select("reference serviceType startAt").lean();
  const customer: any = await Customer.findById(request.customerId).select("name").lean();
  return {
    status: request.status,
    rating: request.rating,
    comment: request.comment,
    booking,
    customerName: customer?.name?.split(" ")?.[0] || "Customer",
  };
};

const submitPublicReview = async (token: string, rating: number, comment?: string) => {
  const request: any = await ReviewRequest.findOne({ tokenHash: hashToken(token) }).select("+tokenHash");
  if (!request) throw new NotFoundError("Review link is invalid");
  if (request.expiresAt <= new Date()) throw new BadRequestError("This review link has expired");
  if (request.status === "SUBMITTED") throw new BadRequestError("This review was already submitted");
  const booking: any = await Booking.findById(request.bookingId).select("reference").lean();
  request.rating = rating;
  request.comment = comment;
  request.status = "SUBMITTED";
  request.submittedAt = new Date();
  await request.save();
  await Customer.findByIdAndUpdate(request.customerId, {
    $push: { reviews: { rating, comment, source: "POST_SERVICE", bookingReference: booking?.reference, createdAt: new Date() } },
    $set: { lastActivityAt: new Date() },
  });
  const settings: any = await RetentionSettings.getSingleton();
  const redirectUrl = rating >= settings.publicReviewThreshold ? (request.publicReviewUrl || settings.publicReviewUrl || PUBLIC_REVIEW_URL) : undefined;
  return { submitted: true, redirectUrl };
};

const listAdminReviews = async (query: any = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: any = {};
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    ReviewRequest.find(filter).populate("customerId", "name email phone").populate("bookingId", "reference serviceType startAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ReviewRequest.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export default { createReviewRequestForBooking, getPublicReview, submitPublicReview, listAdminReviews };
