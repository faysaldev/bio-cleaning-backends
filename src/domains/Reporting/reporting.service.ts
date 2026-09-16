import Booking from "../Booking/booking.model";
import Customer from "../Customer/customer.model";
import Invoice from "../Invoice/invoice.model";
import Job from "../FieldOps/job.model";
import Lead from "../Lead/lead.model";
import PaymentTransaction from "../Payment/paymentTransaction.model";
import Quote from "../Quote/quote.model";
import ReviewRequest from "../Review/reviewRequest.model";
import Service from "../Service/service.model";
import StaffSchedule from "../Scheduling/staffSchedule.model";
import { cacheGet, cacheSet } from "../../lib/cache";

const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
const money = (value: number) => Math.round(value * 100) / 100;

export type ReportRange = { from: Date; to: Date; days: number };
export const resolveRange = (query: Record<string, unknown>): ReportRange => {
  const to = query.to ? new Date(String(query.to)) : new Date();
  const from = query.from ? new Date(String(query.from)) : new Date(to.getTime() - 29 * 86400000);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new Error("Invalid reporting date range");
  const maxWindow = 366 * 86400000;
  if (to.getTime() - from.getTime() > maxWindow) throw new Error("Reporting range cannot exceed 366 days");
  return { from, to, days: Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000)) };
};

const dateMatch = (from: Date, to: Date) => ({ $gte: from, $lte: to });

export const getReports = async (query: Record<string, unknown>) => {
  const range = resolveRange(query);
  const cacheKey = `reports:${range.from.toISOString()}:${range.to.toISOString()}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) return cached;
  const createdAt = dateMatch(range.from, range.to);

  const [
    leadSources, pipeline, leadTotal, leadWon,
    quotesSent, quotesAccepted,
    bookingTotal, bookingCancelled, bookingCompleted, bookingValueRows,
    revenueTrend, recurringRevenueRows,
    serviceRows, activeStaff,
    jobLaborRows, retentionRows,
    invoiceRows, reviewRows,
  ] = await Promise.all([
    Lead.aggregate([{ $match: { createdAt } }, { $group: { _id: "$source", count: { $sum: 1 }, value: { $sum: "$value" } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([{ $match: { createdAt } }, { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$value" } } }]),
    Lead.countDocuments({ createdAt }),
    Lead.countDocuments({ createdAt, status: "WON" }),
    Quote.countDocuments({ createdAt, status: { $in: ["SENT", "VIEWED", "ACCEPTED", "CONVERTED"] } }),
    Quote.countDocuments({ createdAt, status: { $in: ["ACCEPTED", "CONVERTED"] } }),
    Booking.countDocuments({ createdAt }),
    Booking.countDocuments({ createdAt, status: "CANCELLED" }),
    Booking.countDocuments({ createdAt, status: "COMPLETED" }),
    Booking.aggregate([
      { $match: { createdAt, status: { $ne: "CANCELLED" } } },
      { $group: { _id: null, average: { $avg: "$totalAmount" }, bookedValue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    PaymentTransaction.aggregate([
      { $match: { status: "SUCCEEDED", createdAt } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, gross: { $sum: { $cond: [{ $eq: ["$type", "REFUND"] }, 0, "$amount"] } }, refunds: { $sum: { $cond: [{ $eq: ["$type", "REFUND"] }, "$amount", 0] } } } },
      { $project: { _id: 0, date: "$_id", revenue: { $subtract: ["$gross", "$refunds"] }, gross: 1, refunds: 1 } },
      { $sort: { date: 1 } },
    ]),
    PaymentTransaction.aggregate([{ $match: { status: "SUCCEEDED", purpose: "SUBSCRIPTION", type: "PAYMENT", createdAt } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { createdAt } },
      { $group: { _id: "$serviceId", bookings: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } }, bookedValue: { $sum: "$totalAmount" } } },
      { $sort: { bookings: -1 } }, { $limit: 20 },
    ]),
    StaffSchedule.aggregate([{ $match: { isActive: true, role: "cleaner" } }, { $group: { _id: null, staff: { $sum: 1 }, capacity: { $sum: "$capacityUnits" } } }]),
    Job.aggregate([
      { $match: { scheduledStart: dateMatch(range.from, range.to), status: { $nin: ["CANCELLED"] } } },
      { $project: { laborMinutes: { $multiply: [{ $divide: [{ $subtract: ["$scheduledEnd", "$scheduledStart"] }, 60000] }, { $max: [1, { $size: "$assignedStaffIds" }] }] }, completed: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } } },
      { $group: { _id: null, laborMinutes: { $sum: "$laborMinutes" }, jobs: { $sum: 1 }, completed: { $sum: "$completed" } } },
    ]),
    Booking.aggregate([
      { $match: { status: "COMPLETED", startAt: { $lte: range.to }, customerId: { $exists: true } } },
      { $group: { _id: "$customerId", visitsInRange: { $sum: { $cond: [{ $gte: ["$startAt", range.from] }, 1, 0] } }, lifetimeVisits: { $sum: 1 } } },
      { $match: { visitsInRange: { $gt: 0 } } },
      { $group: { _id: null, activeCustomers: { $sum: 1 }, repeatCustomers: { $sum: { $cond: [{ $gte: ["$lifetimeVisits", 2] }, 1, 0] } } } },
    ]),
    Invoice.aggregate([{ $match: { issuedAt: { $lte: range.to }, status: { $nin: ["PAID", "REFUNDED", "VOID"] } } }, { $group: { _id: "$status", count: { $sum: 1 }, due: { $sum: "$amountDue" }, total: { $sum: "$total" } } }]),
    ReviewRequest.aggregate([{ $match: { submittedAt: createdAt, status: "SUBMITTED", rating: { $exists: true } } }, { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 }, promoters: { $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] } } } }]),
  ]);

  const serviceIds = serviceRows.map((row: any) => row._id).filter(Boolean);
  const services = await Service.find({ _id: { $in: serviceIds } }).select("name").lean();
  const serviceNames = new Map(services.map((service: any) => [String(service._id), service.name]));
  const staffCapacity = activeStaff[0]?.capacity || 0;
  const availableLaborMinutes = staffCapacity * range.days * 8 * 60;
  const laborMinutes = jobLaborRows[0]?.laborMinutes || 0;
  const retention = retentionRows[0] || { activeCustomers: 0, repeatCustomers: 0 };
  const reviews = reviewRows[0] || { average: 0, count: 0, promoters: 0 };
  const unpaidInvoices = invoiceRows.reduce((sum: number, row: any) => sum + (row.due || 0), 0);
  const revenue = revenueTrend.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);

  const result = {
    range: { from: range.from, to: range.to, days: range.days },
    summary: {
      revenue: money(revenue),
      recurringRevenue: money(recurringRevenueRows[0]?.total || 0),
      averageOrderValue: money(bookingValueRows[0]?.average || 0),
      unpaidInvoices: money(unpaidInvoices),
      leadConversionRate: pct(leadWon, leadTotal),
      quoteAcceptanceRate: pct(quotesAccepted, quotesSent),
      bookingCompletionRate: pct(bookingCompleted, bookingTotal),
      cancellationRate: pct(bookingCancelled, bookingTotal),
      customerRetentionRate: pct(retention.repeatCustomers || 0, retention.activeCustomers || 0),
      cleanerUtilization: pct(laborMinutes, availableLaborMinutes),
      reviewScore: Math.round((reviews.average || 0) * 100) / 100,
      reviewCount: reviews.count || 0,
    },
    leadsBySource: leadSources.map((row: any) => ({ source: row._id, count: row.count, value: money(row.value || 0) })),
    pipeline: pipeline.map((row: any) => ({ status: row._id, count: row.count, value: money(row.value || 0) })),
    conversions: { leads: { total: leadTotal, won: leadWon }, quotes: { sent: quotesSent, accepted: quotesAccepted }, bookings: { total: bookingTotal, completed: bookingCompleted, cancelled: bookingCancelled } },
    revenueTrend: revenueTrend.map((row: any) => ({ ...row, revenue: money(row.revenue || 0), gross: money(row.gross || 0), refunds: money(row.refunds || 0) })),
    servicePerformance: serviceRows.map((row: any) => ({ serviceId: row._id ? String(row._id) : null, service: row._id ? serviceNames.get(String(row._id)) || "Archived service" : "Legacy service", bookings: row.bookings, completed: row.completed, cancelled: row.cancelled, bookedValue: money(row.bookedValue || 0), completionRate: pct(row.completed, row.bookings) })),
    cleaner: { activeStaff: activeStaff[0]?.staff || 0, capacityUnits: staffCapacity, scheduledLaborHours: Math.round((laborMinutes / 60) * 10) / 10, availableLaborHours: Math.round((availableLaborMinutes / 60) * 10) / 10, utilization: pct(laborMinutes, availableLaborMinutes), jobs: jobLaborRows[0]?.jobs || 0, completedJobs: jobLaborRows[0]?.completed || 0 },
    retention: { activeCustomers: retention.activeCustomers || 0, repeatCustomers: retention.repeatCustomers || 0, rate: pct(retention.repeatCustomers || 0, retention.activeCustomers || 0), totalCustomers: await Customer.countDocuments({ status: "ACTIVE" }) },
    invoices: { unpaidAmount: money(unpaidInvoices), statuses: invoiceRows.map((row: any) => ({ status: row._id, count: row.count, amountDue: money(row.due || 0), total: money(row.total || 0) })) },
    reviews: { average: Math.round((reviews.average || 0) * 100) / 100, count: reviews.count || 0, satisfactionRate: pct(reviews.promoters || 0, reviews.count || 0) },
  };
  await cacheSet(cacheKey, result, 60);
  return result;
};
