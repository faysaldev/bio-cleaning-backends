import Quote from "./quote.model";
import Lead from "../Lead/lead.model";
import Customer from "../Customer/customer.model";
import bookingService from "../Booking/booking.services";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { createPublicToken, hashPublicToken, money, nextFinanceNumber } from "../Finance/finance.utils";
import { getSchedulingSettings } from "../Scheduling/scheduling.services";
import { FRONTEND_URL } from "../../config/ENV";
import { sendEmail } from "../../lib/mail.service";
import { CreateQuoteInput } from "./quote.validation";

const expireIfNeeded = async (quote: any) => {
  if (!["ACCEPTED","CONVERTED","DECLINED","EXPIRED"].includes(quote.status) && quote.expiresAt.getTime() < Date.now()) {
    quote.status = "EXPIRED"; await quote.save();
  }
  return quote;
};

const pricingFromQuote = (calculated: any) => ({
  subtotal: money(calculated.priceBreakdown.subtotal + calculated.priceBreakdown.frequencyDiscountAmount),
  discountAmount: money(calculated.priceBreakdown.frequencyDiscountAmount + calculated.priceBreakdown.promotionDiscount),
  taxRate: calculated.priceBreakdown.taxRate,
  taxAmount: money(calculated.priceBreakdown.taxAmount),
  total: money(calculated.totalAmount),
});

const lineItemsFromQuote = (calculated: any, manualDiscount?: { amount: number; label?: string }) => {
  const frequencyDiscount = money(calculated.priceBreakdown.frequencyDiscountAmount || 0);
  const promotionDiscount = money(calculated.priceBreakdown.promotionDiscount || 0);
  const grossService = money(calculated.priceBreakdown.serviceSubtotal + frequencyDiscount);
  return [
    { type: "SERVICE", name: calculated.serviceName, description: calculated.propertyLabel, quantity: 1, unitPrice: grossService, amount: grossService },
    ...(calculated.extras || []).map((extra: any) => ({ type: "EXTRA", code: extra.code, name: extra.name, quantity: 1, unitPrice: money(extra.price), amount: money(extra.price) })),
    ...(frequencyDiscount ? [{ type: "DISCOUNT", name: "Recurring service discount", quantity: 1, unitPrice: -frequencyDiscount, amount: -frequencyDiscount }] : []),
    ...(promotionDiscount ? [{ type: "DISCOUNT", name: calculated.promoCode ? `Promotion ${calculated.promoCode}` : "Promotion", quantity: 1, unitPrice: -promotionDiscount, amount: -promotionDiscount }] : []),
    ...(manualDiscount?.amount ? [{ type: "DISCOUNT", name: manualDiscount.label || "Estimate discount", quantity: 1, unitPrice: -manualDiscount.amount, amount: -manualDiscount.amount }] : []),
  ];
};

const createQuote = async (input: CreateQuoteInput, userId?: string) => {
  if (input.leadId && !(await Lead.exists({ _id: input.leadId }))) throw new NotFoundError("Lead not found");
  if (input.customerId && !(await Customer.exists({ _id: input.customerId }))) throw new NotFoundError("Customer not found");
  const calculated = await bookingService.getQuote({ serviceId: input.serviceId, propertySize: input.bookingDraft.propertySize, property: input.bookingDraft.property, frequency: input.bookingDraft.frequency, extraCodes: input.bookingDraft.extraCodes, promoCode: input.bookingDraft.promoCode } as any);
  const settings = await getSchedulingSettings();
  const existingTaxable = money(Math.max(0, calculated.priceBreakdown.subtotal - calculated.priceBreakdown.promotionDiscount));
  const manualDiscountAmount = input.discount
    ? money(input.discount.type === "PERCENT" ? existingTaxable * (Math.min(100, input.discount.value) / 100) : Math.min(existingTaxable, input.discount.value))
    : 0;
  const taxableAfterManualDiscount = money(Math.max(0, existingTaxable - manualDiscountAmount));
  const adjustedTaxAmount = money(taxableAfterManualDiscount * (calculated.priceBreakdown.taxRate / 100));
  const adjustedTotal = money(taxableAfterManualDiscount + adjustedTaxAmount);
  const frozenPriceBreakdown = { ...calculated.priceBreakdown, manualDiscountAmount, taxAmount: adjustedTaxAmount, total: adjustedTotal };
  const manualDiscount = input.discount ? { ...input.discount, amount: manualDiscountAmount } : undefined;
  const basePricing = pricingFromQuote(calculated);
  const quote = await Quote.create({
    quoteNumber: await nextFinanceNumber("QUOTE"), leadId: input.leadId || undefined, customerId: input.customerId || undefined, serviceId: input.serviceId,
    customer: input.customer, bookingDraft: { serviceId: input.serviceId, ...input.bookingDraft }, lineItems: lineItemsFromQuote(calculated, manualDiscount), pricing: { ...basePricing, discountAmount: money(basePricing.discountAmount + manualDiscountAmount), taxAmount: adjustedTaxAmount, total: adjustedTotal, currency: settings.currency },
    priceBreakdown: frozenPriceBreakdown, manualDiscount,
    estimatedDurationMinutes: calculated.durationMinutes, requiredStaff: calculated.requiredStaff, terms: input.terms, notes: input.notes,
    expiresAt: new Date(Date.now() + input.expiresInDays * 86400000), createdBy: userId,
  });
  return quote;
};

const listQuotes = async (query: any) => {
  const page = Math.max(1, Number(query.page) || 1), limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.search) { const q = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); filter.$or = [{ quoteNumber: { $regex: q, $options: "i" } }, { "customer.name": { $regex: q, $options: "i" } }, { "customer.email": { $regex: q, $options: "i" } }]; }
  const [quotes,total] = await Promise.all([Quote.find(filter).sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit).populate("serviceId","name").lean(), Quote.countDocuments(filter)]);
  return { quotes, meta: { page, limit, total, totalPages: Math.ceil(total/limit) } };
};

const getQuote = async (id: string) => { const q = await Quote.findById(id).populate("serviceId","name").populate("leadId","name email phone status").populate("customerId","name email phone"); if (!q) throw new NotFoundError("Quote not found"); return expireIfNeeded(q); };
const updateQuote = async (id: string, data: any) => { const q:any = await Quote.findById(id); if (!q) throw new NotFoundError("Quote not found"); if (!["DRAFT","SENT","VIEWED"].includes(q.status)) throw new BadRequestError("Accepted, declined, expired, or converted quotes cannot be edited"); Object.assign(q, data); await q.save(); return q; };

const sendQuote = async (id: string) => {
  const q:any = await Quote.findById(id); if (!q) throw new NotFoundError("Quote not found"); await expireIfNeeded(q); if (q.status === "EXPIRED") throw new BadRequestError("Expired quotes cannot be sent");
  const token = createPublicToken(); q.publicTokenHash = hashPublicToken(token); q.status = q.status === "DRAFT" ? "SENT" : q.status; q.sentAt = new Date(); await q.save();
  if (q.leadId) {
    await Lead.findByIdAndUpdate(q.leadId, { $set: { status: "ESTIMATE_QUOTE_SENT", value: q.pricing.total, lastActivityAt: new Date() } });
  }
  const url = FRONTEND_URL ? `${FRONTEND_URL.replace(/\/$/,"")}/estimate/${encodeURIComponent(token)}` : undefined;
  await sendEmail(q.customer.email, `Your BIO Cleaning estimate ${q.quoteNumber}`, `Your estimate total is ${q.pricing.currency} ${q.pricing.total.toFixed(2)}.${url ? ` Review and accept it here: ${url}` : ""}`, `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123b2a"><h2>Your cleaning estimate</h2><p>Hi ${q.customer.name},</p><p>Estimate <strong>${q.quoteNumber}</strong> totals <strong>${q.pricing.currency} ${q.pricing.total.toFixed(2)}</strong>.</p>${url ? `<p><a href="${url}">Review and accept estimate</a></p>` : ""}<p>Expires ${q.expiresAt.toDateString()}.</p></div>`);
  return { quote: q, publicUrl: url };
};

const publicQuote = async (token: string) => { const q:any = await Quote.findOne({ publicTokenHash: hashPublicToken(token) }).select("+publicTokenHash").populate("serviceId","name"); if (!q) throw new NotFoundError("Estimate link is invalid"); await expireIfNeeded(q); if (q.status === "SENT") { q.status="VIEWED"; q.viewedAt=new Date(); await q.save(); } q.publicTokenHash=undefined; return q; };
const acceptPublic = async (token: string, data: any) => { const q:any=await Quote.findOne({ publicTokenHash: hashPublicToken(token) }).select("+publicTokenHash"); if(!q) throw new NotFoundError("Estimate link is invalid"); await expireIfNeeded(q); if(q.status==="EXPIRED") throw new BadRequestError("This estimate has expired"); if(["DECLINED","CONVERTED"].includes(q.status)) throw new ConflictError("This estimate can no longer be accepted"); q.status="ACCEPTED"; q.acceptedAt=new Date(); q.acceptance={name:data.name,email:data.email,acceptedAt:new Date()}; await q.save(); return publicQuote(token); };
const declinePublic = async (token:string) => { const q:any=await Quote.findOne({publicTokenHash:hashPublicToken(token)}).select("+publicTokenHash"); if(!q) throw new NotFoundError("Estimate link is invalid"); if(q.status==="CONVERTED") throw new ConflictError("Converted estimates cannot be declined"); q.status="DECLINED"; q.declinedAt=new Date(); await q.save(); return { ok:true }; };
const convertPublic = async (token:string, data:any) => {
  const q:any=await Quote.findOne({publicTokenHash:hashPublicToken(token)}).select("+publicTokenHash"); if(!q) throw new NotFoundError("Estimate link is invalid"); await expireIfNeeded(q); if(q.status==="CONVERTED") return { alreadyConverted:true, bookingReference:q.convertedBookingReference }; if(q.status!=="ACCEPTED") throw new BadRequestError("Accept the estimate before scheduling it");
  const result:any = await bookingService.createBooking({ serviceId:String(q.serviceId), propertySize:q.bookingDraft.propertySize, property:q.bookingDraft.property, frequency:q.bookingDraft.frequency, extraCodes:q.bookingDraft.extraCodes, promoCode:q.bookingDraft.promoCode, occurrenceCount:q.bookingDraft.occurrenceCount, date:data.date, timeSlot:data.timeSlot, paymentOption:data.paymentOption, customerDetails:{ name:q.customer.name,email:q.customer.email,phone:q.customer.phone,address:{line1:q.customer.address.line1,line2:q.customer.address.line2,city:q.customer.address.city,zip:q.customer.address.zip}}, notes:q.notes } as any, { trustedPriceBreakdown: q.priceBreakdown });
  q.status="CONVERTED"; q.convertedBookingReference=result.booking?.reference; await q.save(); if(q.leadId) await Lead.findByIdAndUpdate(q.leadId,{status:"WON",wonAt:new Date(),lastActivityAt:new Date()}); return result;
};

export default { createQuote,listQuotes,getQuote,updateQuote,sendQuote,publicQuote,acceptPublic,declinePublic,convertPublic };
