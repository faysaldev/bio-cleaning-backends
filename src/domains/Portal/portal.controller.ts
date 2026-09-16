import { Request, Response } from "express";
import httpStatus from "http-status";
import portalService from "./portal.service";
import notificationService from "../Notification/notification.service";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { COOKIE_DOMAIN, COOKIE_SAME_SITE, COOKIE_SECURE } from "../../config/ENV";
import { PORTAL_COOKIE_NAME, PortalRequest } from "./portal.middleware";

const cookieOptions = { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, domain: COOKIE_DOMAIN, path: "/" } as const;
const ok = (res: Response, data: unknown, message: string) => res.status(httpStatus.OK).json(response({ statusCode: httpStatus.OK, status: "OK", message, data }));

const requestLink = asyncHandler(async (req: Request, res: Response) => {
  await portalService.requestMagicLink(req.body.email, { ipAddress: req.ip });
  ok(res, undefined, "If a customer account exists for that email, a secure sign-in link has been sent.");
});
const exchange = asyncHandler(async (req: Request, res: Response) => {
  const result = await portalService.exchangeMagicLink(req.body.token, { ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.cookie(PORTAL_COOKIE_NAME, result.rawSession, { ...cookieOptions, maxAge: result.maxAgeSeconds * 1000 });
  ok(res, { csrfToken: result.csrfToken, customer: result.customer }, "Portal sign-in successful");
});
const session = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.getSession(req.portal!.sessionId, req.portal!.customerId), "Portal session retrieved"));
const logout = asyncHandler(async (req: PortalRequest, res: Response) => { await portalService.revokeSession(req.portal!.sessionId); res.clearCookie(PORTAL_COOKIE_NAME, cookieOptions); ok(res, undefined, "Signed out"); });
const overview = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.getOverview(req.portal!.customerId), "Portal overview retrieved"));
const bookings = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.listBookings(req.portal!.customerId, req.query), "Bookings retrieved"));
const booking = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.getBooking(req.portal!.customerId, req.params.id), "Booking retrieved"));
const invoices = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.listInvoices(req.portal!.customerId), "Invoices retrieved"));
const payments = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.listPayments(req.portal!.customerId), "Payments retrieved"));
const payInvoice = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.payInvoice(req.portal!.customerId, req.params.id), "Secure payment checkout created"));
const profile = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.updateProfile(req.portal!.customerId, req.body), "Profile updated"));
const cancel = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.cancelBooking(req.portal!.customerId, req.params.id, req.body.reason), "Booking cancelled"));
const reschedule = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.rescheduleBooking(req.portal!.customerId, req.params.id, req.body.date, req.body.timeSlot), "Booking rescheduled"));
const rebook = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await portalService.rebookDraft(req.portal!.customerId, req.params.id), "Rebooking details retrieved"));
const notifications = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await notificationService.listCustomerNotifications(req.portal!.customerId, req.query), "Notifications retrieved"));
const markRead = asyncHandler(async (req: PortalRequest, res: Response) => ok(res, await notificationService.markRead(req.portal!.customerId, req.params.id), "Notification marked read"));
const markAllRead = asyncHandler(async (req: PortalRequest, res: Response) => { await notificationService.markAllRead(req.portal!.customerId); ok(res, undefined, "Notifications marked read"); });

export default { requestLink, exchange, session, logout, overview, bookings, booking, invoices, payments, payInvoice, profile, cancel, reschedule, rebook, notifications, markRead, markAllRead };
