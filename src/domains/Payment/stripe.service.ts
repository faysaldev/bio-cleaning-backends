import crypto from "crypto";
import { FRONTEND_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../../config/ENV";
import { BadRequestError, ServiceUnavailableError } from "../../lib/errors";
import Booking from "../Booking/booking.model";
import Customer from "../Customer/customer.model";
import Invoice from "../Invoice/invoice.model";
import { refreshInvoiceFinancials } from "../Invoice/invoiceAccounting";
import PaymentTransaction from "./paymentTransaction.model";
import RecurringBilling from "./recurringBilling.model";
import StripeEvent from "./stripeEvent.model";
import { money } from "../Finance/finance.utils";
import { emitCustomerEvent } from "../Notification/notification.service";

const encodeForm = (values: Record<string, string | number | boolean | undefined>) => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) body.set(key, String(value));
  return body;
};

const stripeRequest = async (path: string, init: { method?: string; body?: URLSearchParams; idempotencyKey?: string } = {}) => {
  if (!STRIPE_SECRET_KEY) throw new ServiceUnavailableError("Stripe payments are not configured yet");
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: init.method || "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey.slice(0,255) } : {}),
    },
    body: init.body,
  });
  const payload: any = await response.json();
  if (!response.ok) {
    console.error("Stripe API request failed", path, payload?.error?.message || payload);
    throw new ServiceUnavailableError(payload?.error?.message || "Stripe could not complete the request");
  }
  return payload;
};

const returnUrls = (path: string) => {
  if (!FRONTEND_URL) throw new ServiceUnavailableError("Frontend URL is not configured for payment return links");
  const base=FRONTEND_URL.replace(/\/$/,"");
  return { success:`${base}${path}${path.includes("?")?"&":"?"}payment=success`, cancel:`${base}${path}${path.includes("?")?"&":"?"}payment=cancelled` };
};

export const createStripeCheckoutSession = async ({ reference, recurrenceGroupId, customerEmail, amount, currency, idempotencyKey }: { reference:string; recurrenceGroupId?:string; customerEmail:string; amount:number; currency:string; idempotencyKey?:string }) => {
  const cents=Math.round(amount*100); if(cents<=0) throw new BadRequestError("Deposit amount must be greater than zero");
  const primary:any=await Booking.findOne({reference}); if(!primary) throw new BadRequestError("Booking not found for payment");
  const bookings:any[]=recurrenceGroupId ? await Booking.find({recurrenceGroupId}).sort({occurrenceIndex:1}) : [primary];
  const customer:any=primary.customerId ? await Customer.findById(primary.customerId) : null;
  const tx:any=await PaymentTransaction.create({ type:"PAYMENT",purpose:"DEPOSIT",provider:"STRIPE",status:"PENDING",amount:money(amount),currency,bookingId:primary._id,bookingIds:bookings.map(b=>b._id),customerId:primary.customerId,recurrenceGroupId,allocations:bookings.map(b=>({bookingId:b._id,amount:money(Number(b.payment?.depositAmount||0))})) });
  const urls=returnUrls(`/book?reference=${encodeURIComponent(reference)}`);
  const body=encodeForm({ mode:"payment",success_url:urls.success,cancel_url:urls.cancel,client_reference_id:String(tx._id),customer:customer?.stripeCustomerId,customer_email:customer?.stripeCustomerId?undefined:customerEmail,customer_creation:customer?.stripeCustomerId?undefined:"always",invoice_creation:true,"payment_intent_data[setup_future_usage]":"off_session","payment_intent_data[metadata][transactionId]":String(tx._id),"line_items[0][quantity]":1,"line_items[0][price_data][currency]":currency.toLowerCase(),"line_items[0][price_data][unit_amount]":cents,"line_items[0][price_data][product_data][name]":`BIO Cleaning deposit - ${reference}`,"metadata[transactionId]":String(tx._id),"metadata[purpose]":"DEPOSIT","metadata[bookingReference]":reference,"metadata[recurrenceGroupId]":recurrenceGroupId });
  try { const checkout=await stripeRequest("/v1/checkout/sessions",{body,idempotencyKey}); tx.checkoutSessionId=checkout.id; await tx.save(); return {id:checkout.id as string,url:checkout.url as string}; }
  catch(e:any){tx.status="FAILED";tx.failureMessage=e?.message;await tx.save();throw e;}
};

export const createInvoiceCheckoutSession = async (invoice:any, idempotencyKey?:string, returnPath="/admin/invoices") => {
  if(invoice.amountDue<=0) return {alreadyPaid:true};
  const customer:any=invoice.customerId ? await Customer.findById(invoice.customerId) : null;
  const tx:any=await PaymentTransaction.create({type:"PAYMENT",purpose:"INVOICE",provider:"STRIPE",status:"PENDING",amount:money(invoice.amountDue),currency:invoice.currency,bookingId:invoice.bookingId,bookingIds:[invoice.bookingId],invoiceId:invoice._id,customerId:invoice.customerId,recurrenceGroupId:invoice.recurrenceGroupId,allocations:[{bookingId:invoice.bookingId,invoiceId:invoice._id,amount:money(invoice.amountDue)}]});
  const urls=returnUrls(returnPath);
  const body=encodeForm({mode:"payment",success_url:urls.success,cancel_url:urls.cancel,client_reference_id:String(tx._id),customer:customer?.stripeCustomerId,customer_email:customer?.stripeCustomerId?undefined:invoice.customer.email,customer_creation:customer?.stripeCustomerId?undefined:"always",invoice_creation:true,"payment_intent_data[setup_future_usage]":"off_session","payment_intent_data[metadata][transactionId]":String(tx._id),"line_items[0][quantity]":1,"line_items[0][price_data][currency]":invoice.currency.toLowerCase(),"line_items[0][price_data][unit_amount]":Math.round(invoice.amountDue*100),"line_items[0][price_data][product_data][name]":`BIO Cleaning invoice ${invoice.invoiceNumber}`,"metadata[transactionId]":String(tx._id),"metadata[purpose]":"INVOICE","metadata[invoiceId]":String(invoice._id)});
  try{const checkout=await stripeRequest("/v1/checkout/sessions",{body,idempotencyKey:idempotencyKey||`invoice:${invoice._id}:${tx._id}`});tx.checkoutSessionId=checkout.id;await tx.save();return {id:checkout.id,url:checkout.url,alreadyPaid:false};}catch(e:any){tx.status="FAILED";tx.failureMessage=e?.message;await tx.save();throw e;}
};

export const createRecurringBillingCheckout = async (invoice:any, returnPath="/admin/invoices") => {
  const refreshed:any=await refreshInvoiceFinancials(String(invoice._id));
  if(!refreshed||Number(refreshed.amountDue)>0) throw new BadRequestError("Pay the current invoice before enabling recurring billing");
  const booking:any=await Booking.findById(invoice.bookingId); if(!booking?.recurrenceGroupId || booking.frequency==="ONE_TIME") throw new BadRequestError("Recurring billing requires a recurring booking series");
  const futureVisits=await Booking.countDocuments({recurrenceGroupId:booking.recurrenceGroupId,_id:{$ne:booking._id},status:{$ne:"CANCELLED"},startAt:{$gt:booking.startAt||new Date(0)}});
  if(futureVisits<1) throw new BadRequestError("There are no future visits in this recurring series to bill automatically");
  const customer:any=invoice.customerId ? await Customer.findById(invoice.customerId) : null;
  const mapping:any={WEEKLY:{interval:"week",intervalCount:1},BI_WEEKLY:{interval:"week",intervalCount:2},MONTHLY:{interval:"month",intervalCount:1}};
  const cadence=mapping[booking.frequency]; if(!cadence) throw new BadRequestError("Unsupported recurring billing cadence");
  let recurring:any=await RecurringBilling.findOne({recurrenceGroupId:booking.recurrenceGroupId});
  if(recurring?.status==="ACTIVE") return {alreadyActive:true,recurringBilling:recurring};
  if(recurring?.status==="CANCELED") throw new BadRequestError("This recurring billing agreement was canceled and cannot be restarted automatically");
  if(!recurring) recurring=await RecurringBilling.create({customerId:invoice.customerId,recurrenceGroupId:booking.recurrenceGroupId,serviceName:booking.serviceType,amount:invoice.total,currency:invoice.currency,interval:cadence.interval,intervalCount:cadence.intervalCount,status:"PENDING",maxPayments:futureVisits,paymentsProcessed:0,checkoutAttempt:0});
  recurring.amount=invoice.total; recurring.currency=invoice.currency; recurring.maxPayments=futureVisits; recurring.status="PENDING"; recurring.checkoutAttempt=Number(recurring.checkoutAttempt||0)+1; await recurring.save();
  const urls=returnUrls(returnPath);
  const body=encodeForm({mode:"subscription",success_url:urls.success,cancel_url:urls.cancel,client_reference_id:String(recurring._id),customer:customer?.stripeCustomerId,customer_email:customer?.stripeCustomerId?undefined:invoice.customer.email,"line_items[0][quantity]":1,"line_items[0][price_data][currency]":invoice.currency.toLowerCase(),"line_items[0][price_data][unit_amount]":Math.round(invoice.total*100),"line_items[0][price_data][product_data][name]":`${booking.serviceType} recurring cleaning`,"line_items[0][price_data][recurring][interval]":cadence.interval,"line_items[0][price_data][recurring][interval_count]":cadence.intervalCount,"metadata[recurringBillingId]":String(recurring._id),"metadata[purpose]":"SUBSCRIPTION","subscription_data[metadata][recurringBillingId]":String(recurring._id),"subscription_data[metadata][recurrenceGroupId]":booking.recurrenceGroupId});
  const checkout=await stripeRequest("/v1/checkout/sessions",{body,idempotencyKey:`recurring:${recurring._id}:${recurring.checkoutAttempt}`}); recurring.checkoutSessionId=checkout.id; await recurring.save(); return {alreadyActive:false,url:checkout.url,recurringBilling:recurring};
};

export const cancelStripeSubscription = async (recurring:any) => { if(recurring.stripeSubscriptionId) await stripeRequest(`/v1/subscriptions/${encodeURIComponent(recurring.stripeSubscriptionId)}`,{method:"DELETE"}); recurring.status="CANCELED";recurring.canceledAt=new Date();await recurring.save();return recurring; };

export const createStripeRefund = async (payment:any, amount:number) => {
  if(!payment.paymentIntentId) throw new BadRequestError("This Stripe payment does not have a refundable PaymentIntent");
  const refundAgg:any[]=await PaymentTransaction.aggregate([{ $match:{parentPaymentId:payment._id,type:"REFUND",status:"SUCCEEDED"}},{ $group:{_id:null,total:{$sum:"$amount"}} }]);
  const alreadyRefunded=Number(refundAgg[0]?.total||0);
  const refundable=money(Number(payment.amount||0)-alreadyRefunded);
  if(amount<=0 || amount>refundable) throw new BadRequestError(`Refund must be between 0.01 and ${refundable.toFixed(2)}`);
  const refundTx:any=await PaymentTransaction.create({type:"REFUND",purpose:"REFUND",provider:"STRIPE",status:"PENDING",amount:money(amount),currency:payment.currency,bookingId:payment.bookingId,bookingIds:payment.bookingIds,invoiceId:payment.invoiceId,customerId:payment.customerId,recurrenceGroupId:payment.recurrenceGroupId,parentPaymentId:payment._id});
  try { const refund=await stripeRequest("/v1/refunds",{body:encodeForm({payment_intent:payment.paymentIntentId,amount:Math.round(amount*100),"metadata[transactionId]":String(refundTx._id)}),idempotencyKey:`refund:${refundTx._id}`}); refundTx.refundId=refund.id;refundTx.status=refund.status==="succeeded"?"SUCCEEDED":"PENDING";refundTx.processedAt=refund.status==="succeeded"?new Date():undefined;await refundTx.save(); if(payment.invoiceId) await refreshInvoiceFinancials(String(payment.invoiceId)); return refundTx; } catch(e:any){refundTx.status="FAILED";refundTx.failureMessage=e?.message;await refundTx.save();throw e;}
};

const safeEqual=(left:string,right:string)=>{const a=Buffer.from(left,"utf8"),b=Buffer.from(right,"utf8");return a.length===b.length&&crypto.timingSafeEqual(a,b);};
export const verifyStripeSignature=(rawBody:Buffer,signatureHeader?:string)=>{if(!STRIPE_WEBHOOK_SECRET) throw new ServiceUnavailableError("Stripe webhook secret is not configured");if(!signatureHeader)throw new BadRequestError("Missing Stripe-Signature header");const pieces=signatureHeader.split(",").map(x=>x.trim()),timestamp=pieces.find(x=>x.startsWith("t="))?.slice(2),signatures=pieces.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));if(!timestamp||!signatures.length)throw new BadRequestError("Invalid Stripe signature header");const t=Number(timestamp);if(!Number.isFinite(t)||Math.abs(Date.now()/1000-t)>300)throw new BadRequestError("Stripe webhook signature is outside the allowed time window");const expected=crypto.createHmac("sha256",STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${rawBody.toString("utf8")}`,"utf8").digest("hex");if(!signatures.some(s=>safeEqual(expected,s)))throw new BadRequestError("Stripe webhook signature verification failed");};

const storeStripeCustomer=async(customerId:any,stripeCustomerId?:string)=>{if(customerId&&stripeCustomerId)await Customer.findByIdAndUpdate(customerId,{$set:{stripeCustomerId}});};

const queuePaymentReceipt = async (tx: any) => {
  if (!tx?.customerId || tx?.status !== "SUCCEEDED" || tx?.type !== "PAYMENT") return;
  try {
    const customer: any = await Customer.findById(tx.customerId).lean();
    const booking: any = tx.bookingId ? await Booking.findById(tx.bookingId).select("reference").lean() : null;
    const amount = Number(tx.amount || 0).toFixed(2);
    await emitCustomerEvent({
      customerId: String(tx.customerId),
      bookingId: tx.bookingId ? String(tx.bookingId) : undefined,
      invoiceId: tx.invoiceId ? String(tx.invoiceId) : undefined,
      type: "PAYMENT_RECEIPT",
      title: `Payment received · ${tx.currency} ${amount}`,
      message: `We received your ${tx.currency} ${amount} payment${booking?.reference ? ` for booking ${booking.reference}` : ""}. Your receipt is available in the customer portal.`,
      href: "/portal/payments",
      email: customer?.email,
      phone: customer?.phone,
      dedupeKey: `payment-receipt:${tx._id}`,
    });
  } catch (error) { console.error("Payment processed but receipt notification failed", error); }
};

export const processStripeEvent=async(event:any)=>{
  if(!event?.id) return;
  let record:any;
  try{record=await StripeEvent.create({eventId:event.id,type:event.type,status:"PROCESSING"});}catch(e:any){if(e?.code===11000){const existing:any=await StripeEvent.findOne({eventId:event.id});if(existing?.status==="PROCESSED")return;record=existing;record.status="PROCESSING";record.attempts=Number(record.attempts||1)+1;await record.save();}else throw e;}
  try{
    const object:any=event.data?.object;
    if(event.type.startsWith("checkout.session.")){
      const txId=object?.metadata?.transactionId;
      if(txId){const tx:any=await PaymentTransaction.findById(txId);if(tx){tx.checkoutSessionId=object.id;tx.paymentIntentId=typeof object.payment_intent==="string"?object.payment_intent:object.payment_intent?.id;tx.stripeCustomerId=typeof object.customer==="string"?object.customer:object.customer?.id;if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)&&(object.payment_status==="paid"||event.type.endsWith("succeeded"))){tx.status="SUCCEEDED";tx.processedAt=new Date();}else if(["checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type)){tx.status="FAILED";tx.failureMessage=`Stripe session ${event.type}`;}await tx.save();await storeStripeCustomer(tx.customerId,tx.stripeCustomerId);if(tx.invoiceId)await refreshInvoiceFinancials(String(tx.invoiceId));if(tx.status==="SUCCEEDED")await queuePaymentReceipt(tx);if(tx.purpose==="DEPOSIT"){const filter=tx.recurrenceGroupId?{recurrenceGroupId:tx.recurrenceGroupId}:{_id:tx.bookingId};await Booking.updateMany(filter,{$set:{"payment.status":tx.status==="SUCCEEDED"?"PAID":tx.status==="FAILED"?"FAILED":"PENDING","payment.checkoutSessionId":object.id,"payment.paidAt":tx.status==="SUCCEEDED"?new Date():undefined},$unset:{"payment.checkoutUrl":""}});}}
      } else {
        // Compatibility for deposit Checkout Sessions created before the finance
        // ledger was introduced. Those sessions only carried booking metadata.
        const bookingReference=object?.metadata?.bookingReference;
        const recurrenceGroupId=object?.metadata?.recurrenceGroupId;
        if(bookingReference||recurrenceGroupId){
          const paid=["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)&&(object.payment_status==="paid"||event.type.endsWith("succeeded"));
          const failed=["checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type);
          const filter=recurrenceGroupId?{recurrenceGroupId}:{reference:bookingReference};
          await Booking.updateMany(filter,{$set:{"payment.status":paid?"PAID":failed?"FAILED":"PENDING","payment.checkoutSessionId":object.id,"payment.paidAt":paid?new Date():undefined},$unset:{"payment.checkoutUrl":""}});
        }
      }
      const recurringId=object?.metadata?.recurringBillingId;
      if(recurringId){const recurring:any=await RecurringBilling.findById(recurringId);if(recurring){recurring.checkoutSessionId=object.id;recurring.stripeCustomerId=typeof object.customer==="string"?object.customer:object.customer?.id;recurring.stripeSubscriptionId=typeof object.subscription==="string"?object.subscription:object.subscription?.id;if(event.type==="checkout.session.completed"){recurring.status="ACTIVE";recurring.startedAt=new Date();}else if(event.type==="checkout.session.expired")recurring.status="INCOMPLETE";await recurring.save();await storeStripeCustomer(recurring.customerId,recurring.stripeCustomerId);}}
    } else if(event.type==="charge.succeeded") { const tx:any=object?.metadata?.transactionId ? await PaymentTransaction.findById(object.metadata.transactionId) : await PaymentTransaction.findOne({paymentIntentId:typeof object.payment_intent==="string"?object.payment_intent:object.payment_intent?.id});if(tx){tx.chargeId=object.id;tx.receiptUrl=object.receipt_url;await tx.save();} }
    else if(event.type==="refund.updated"||event.type==="refund.failed"){const tx:any=await PaymentTransaction.findOne({refundId:object.id});if(tx){tx.status=object.status==="succeeded"?"SUCCEEDED":object.status==="failed"?"FAILED":"PENDING";tx.failureMessage=object.failure_reason;tx.processedAt=tx.status==="SUCCEEDED"?new Date():undefined;await tx.save();if(tx.invoiceId)await refreshInvoiceFinancials(String(tx.invoiceId));}}
    else if(event.type==="customer.subscription.deleted"){const sid=object.id;await RecurringBilling.findOneAndUpdate({stripeSubscriptionId:sid},{$set:{status:"CANCELED",canceledAt:new Date()}});}
    else if(event.type==="invoice.paid"){
      const sid=typeof object.subscription==="string"?object.subscription:object.subscription?.id || object.parent?.subscription_details?.subscription;
      if(sid){let recurring:any=await RecurringBilling.findOne({stripeSubscriptionId:sid});if(!recurring){try{const subscription:any=await stripeRequest(`/v1/subscriptions/${encodeURIComponent(sid)}`,{method:"GET"});const recurringId=subscription?.metadata?.recurringBillingId;if(recurringId){recurring=await RecurringBilling.findById(recurringId);if(recurring){recurring.stripeSubscriptionId=sid;recurring.stripeCustomerId=typeof object.customer==="string"?object.customer:object.customer?.id;recurring.status="ACTIVE";recurring.startedAt=recurring.startedAt||new Date();await recurring.save();await storeStripeCustomer(recurring.customerId,recurring.stripeCustomerId);}}}catch(error){console.error("Could not resolve recurring billing from Stripe subscription",sid,error);}}if(recurring){const amount=money(Number(object.amount_paid||0)/100);let invoice:any=await Invoice.findOne({recurrenceGroupId:recurring.recurrenceGroupId,status:{$in:["OPEN","PARTIALLY_PAID"]}}).sort({issuedAt:1});const tx:any=await PaymentTransaction.findOneAndUpdate({providerInvoiceId:object.id},{$setOnInsert:{type:"PAYMENT",purpose:"SUBSCRIPTION",provider:"STRIPE",status:"SUCCEEDED",amount,currency:String(object.currency||recurring.currency).toUpperCase(),invoiceId:invoice?._id,bookingId:invoice?.bookingId,bookingIds:invoice?[invoice.bookingId]:[],customerId:recurring.customerId,recurrenceGroupId:recurring.recurrenceGroupId,recurringBillingId:recurring._id,providerInvoiceId:object.id,stripeCustomerId:typeof object.customer==="string"?object.customer:object.customer?.id,subscriptionId:sid,receiptUrl:object.hosted_invoice_url,processedAt:new Date()}},{upsert:true,new:true,setDefaultsOnInsert:true});if(invoice){tx.allocations=[{bookingId:invoice.bookingId,invoiceId:invoice._id,amount:Math.min(amount,invoice.amountDue)}];await tx.save();await queuePaymentReceipt(tx);invoice.stripeHostedInvoiceUrl=object.hosted_invoice_url;await invoice.save();await refreshInvoiceFinancials(String(invoice._id));}recurring.lastStripeInvoiceId=object.id;recurring.paymentsProcessed=await PaymentTransaction.countDocuments({recurringBillingId:recurring._id,purpose:"SUBSCRIPTION",type:"PAYMENT",status:"SUCCEEDED"});await recurring.save();if(recurring.maxPayments&&recurring.paymentsProcessed>=recurring.maxPayments&&recurring.status==="ACTIVE"){await cancelStripeSubscription(recurring);}}}
    }
    record.status="PROCESSED";record.processedAt=new Date();record.failureMessage=undefined;await record.save();
  }catch(e:any){record.status="FAILED";record.failureMessage=e?.message||"Stripe event failed";await record.save();throw e;}
};
