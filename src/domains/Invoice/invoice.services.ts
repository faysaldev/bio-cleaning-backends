import Invoice from "./invoice.model";
import Booking from "../Booking/booking.model";
import Job from "../FieldOps/job.model";
import PaymentTransaction from "../Payment/paymentTransaction.model";
import RecurringBilling from "../Payment/recurringBilling.model";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { createPublicToken, hashPublicToken, money, nextFinanceNumber } from "../Finance/finance.utils";
import { getSchedulingSettings } from "../Scheduling/scheduling.services";
import { createInvoiceCheckoutSession, createRecurringBillingCheckout, cancelStripeSubscription } from "../Payment/stripe.service";
import { refreshInvoiceFinancials } from "./invoiceAccounting";
import { FRONTEND_URL } from "../../config/ENV";
import { sendEmail } from "../../lib/mail.service";

const addressText=(booking:any)=>[booking.customerDetails?.address?.line1,booking.customerDetails?.address?.line2,booking.customerDetails?.address?.city,booking.customerDetails?.address?.zip].filter(Boolean).join(", ");

const itemsForBooking=(booking:any)=>{
  const frequencyDiscount=money(Number(booking.priceBreakdown?.frequencyDiscountAmount||0));
  const serviceSubtotal=money(Number(booking.priceBreakdown?.serviceSubtotal ?? booking.totalAmount)+frequencyDiscount);
  const items:any[]=[{type:"SERVICE",name:booking.serviceType,description:booking.propertySize,quantity:1,unitPrice:serviceSubtotal,amount:serviceSubtotal}];
  for(const extra of booking.extras||[]) items.push({type:"EXTRA",name:extra.name,quantity:1,unitPrice:money(extra.price),amount:money(extra.price)});
  const discount=money(Number(booking.priceBreakdown?.frequencyDiscountAmount||0)+Number(booking.priceBreakdown?.promotionDiscount||0)+Number(booking.priceBreakdown?.manualDiscountAmount||0));
  if(discount>0) items.push({type:"DISCOUNT",name:"Discounts",quantity:1,unitPrice:-discount,amount:-discount});
  if(Number(booking.cancellationFee||0)>0)items.push({type:"FEE",name:"Cancellation fee",quantity:1,unitPrice:money(booking.cancellationFee),amount:money(booking.cancellationFee)});
  return items;
};

const bindExistingCredits=async(invoice:any,booking:any)=>{
  await PaymentTransaction.updateMany({status:"SUCCEEDED",type:"PAYMENT","allocations.bookingId":booking._id,"allocations.invoiceId":{$exists:false}},{$set:{"allocations.$[entry].invoiceId":invoice._id}},{arrayFilters:[{"entry.bookingId":booking._id,"entry.invoiceId":{$exists:false}}]});
  if(booking.recurrenceGroupId){
    const subscriptionTx:any=await PaymentTransaction.findOne({status:"SUCCEEDED",type:"PAYMENT",purpose:"SUBSCRIPTION",recurrenceGroupId:booking.recurrenceGroupId,invoiceId:{$exists:false}}).sort({createdAt:1});
    if(subscriptionTx){subscriptionTx.invoiceId=invoice._id;subscriptionTx.bookingId=booking._id;subscriptionTx.bookingIds=[booking._id];subscriptionTx.allocations=[{bookingId:booking._id,invoiceId:invoice._id,amount:Math.min(subscriptionTx.amount,invoice.total)}];await subscriptionTx.save();}
  }
};

export const ensureInvoiceForCompletedJob=async(jobOrId:any)=>{
  const job:any=typeof jobOrId==="string"?await Job.findById(jobOrId):jobOrId;
  if(!job)throw new NotFoundError("Job not found");
  const booking:any=await Booking.findById(job.bookingId);if(!booking)throw new NotFoundError("Booking not found");
  if(booking.status!=="COMPLETED"&&job.status!=="COMPLETED")throw new BadRequestError("Invoices can only be generated for completed work");
  let invoice:any=await Invoice.findOne({bookingId:booking._id});
  if(!invoice){
    const settings=await getSchedulingSettings();
    const total=money(Number(booking.totalAmount||0)+Number(booking.cancellationFee||0));
    invoice=await Invoice.create({invoiceNumber:await nextFinanceNumber("INVOICE"),bookingId:booking._id,jobId:job._id,customerId:booking.customerId,recurrenceGroupId:booking.recurrenceGroupId,status:"OPEN",customer:{name:booking.customerDetails.name,email:booking.customerDetails.email,phone:booking.customerDetails.phone,address:addressText(booking)},items:itemsForBooking(booking),subtotal:money(Number(booking.priceBreakdown?.subtotal??total)+Number(booking.priceBreakdown?.frequencyDiscountAmount||0)),discountAmount:money(Number(booking.priceBreakdown?.frequencyDiscountAmount||0)+Number(booking.priceBreakdown?.promotionDiscount||0)+Number(booking.priceBreakdown?.manualDiscountAmount||0)),taxAmount:money(Number(booking.priceBreakdown?.taxAmount||0)),total,amountPaid:0,amountRefunded:0,amountDue:total,currency:booking.payment?.currency||settings.currency,issuedAt:new Date(),dueAt:new Date(Date.now()+7*86400000)});
    await bindExistingCredits(invoice,booking);
  }
  return refreshInvoiceFinancials(String(invoice._id));
};

const listInvoices=async(query:any)=>{const page=Math.max(1,Number(query.page)||1),limit=Math.min(100,Math.max(1,Number(query.limit)||20)),filter:any={};if(query.status)filter.status=query.status;if(query.search){const q=String(query.search).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");filter.$or=[{invoiceNumber:{$regex:q,$options:"i"}},{"customer.name":{$regex:q,$options:"i"}},{"customer.email":{$regex:q,$options:"i"}}];}const [invoices,total]=await Promise.all([Invoice.find(filter).sort({issuedAt:-1}).skip((page-1)*limit).limit(limit).populate("bookingId","reference serviceType startAt frequency").lean(),Invoice.countDocuments(filter)]);return{invoices,meta:{page,limit,total,totalPages:Math.ceil(total/limit)}};};
const getInvoice=async(id:string)=>{const invoice=await Invoice.findById(id).populate("bookingId","reference serviceType startAt frequency recurrenceGroupId").populate("customerId","name email phone");if(!invoice)throw new NotFoundError("Invoice not found");return refreshInvoiceFinancials(String(invoice._id));};
const sendInvoice=async(id:string)=>{const invoice:any=await refreshInvoiceFinancials(id);if(!invoice)throw new NotFoundError("Invoice not found");if(invoice.status==="VOID")throw new BadRequestError("Voided invoices cannot be sent");const token=createPublicToken();invoice.publicTokenHash=hashPublicToken(token);invoice.sentAt=new Date();await invoice.save();const url=FRONTEND_URL?`${FRONTEND_URL.replace(/\/$/,"")}/invoice/${encodeURIComponent(token)}`:undefined;await sendEmail(invoice.customer.email,`BIO Cleaning invoice ${invoice.invoiceNumber}`,`Invoice ${invoice.invoiceNumber} total ${invoice.currency} ${invoice.total.toFixed(2)}. Balance due ${invoice.currency} ${invoice.amountDue.toFixed(2)}.${url?` Pay securely: ${url}`:""}`,`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123b2a"><h2>Invoice ${invoice.invoiceNumber}</h2><p>Hi ${invoice.customer.name},</p><p>Total: <strong>${invoice.currency} ${invoice.total.toFixed(2)}</strong></p><p>Balance due: <strong>${invoice.currency} ${invoice.amountDue.toFixed(2)}</strong></p>${url?`<p><a href="${url}">View and pay invoice</a></p>`:""}</div>`);return{invoice,publicUrl:url};};
const publicInvoice=async(token:string)=>{const found:any=await Invoice.findOne({publicTokenHash:hashPublicToken(token)}).select("+publicTokenHash");if(!found)throw new NotFoundError("Invoice link is invalid");const invoice:any=await refreshInvoiceFinancials(String(found._id));await invoice.populate("bookingId","reference serviceType startAt frequency");invoice.publicTokenHash=undefined;return invoice;};
const payPublic=async(token:string)=>{const found:any=await Invoice.findOne({publicTokenHash:hashPublicToken(token)}).select("+publicTokenHash");if(!found)throw new NotFoundError("Invoice link is invalid");const invoice:any=await refreshInvoiceFinancials(String(found._id));return createInvoiceCheckoutSession(invoice,`invoice-public:${invoice._id}:${invoice.amountDue}`,`/invoice/${encodeURIComponent(token)}`);};
const payAdmin=async(id:string)=>{const invoice:any=await refreshInvoiceFinancials(id);if(!invoice)throw new NotFoundError("Invoice not found");return createInvoiceCheckoutSession(invoice,`invoice-admin:${invoice._id}:${invoice.amountDue}`,"/admin/invoices");};
const recordManualPayment=async(id:string,amount:number,note:string|undefined,userId?:string)=>{const invoice:any=await refreshInvoiceFinancials(id);if(!invoice)throw new NotFoundError("Invoice not found");if(amount>invoice.amountDue)throw new BadRequestError("Manual payment cannot exceed the current balance");await PaymentTransaction.create({type:"PAYMENT",purpose:"MANUAL",provider:"MANUAL",status:"SUCCEEDED",amount:money(amount),currency:invoice.currency,bookingId:invoice.bookingId,bookingIds:[invoice.bookingId],invoiceId:invoice._id,customerId:invoice.customerId,recurrenceGroupId:invoice.recurrenceGroupId,allocations:[{bookingId:invoice.bookingId,invoiceId:invoice._id,amount:money(amount)}],metadata:{note,recordedBy:userId},processedAt:new Date()});return refreshInvoiceFinancials(id);};
const updateInvoice=async(id:string,data:any)=>{const invoice:any=await Invoice.findById(id);if(!invoice)throw new NotFoundError("Invoice not found");if(invoice.status==="VOID")throw new BadRequestError("Voided invoices cannot be edited");if(data.dueAt)invoice.dueAt=new Date(data.dueAt);if(data.notes!==undefined)invoice.notes=data.notes;await invoice.save();return invoice;};
const voidInvoice=async(id:string)=>{const invoice:any=await refreshInvoiceFinancials(id);if(!invoice)throw new NotFoundError("Invoice not found");if(invoice.amountPaid>0)throw new BadRequestError("Paid invoices must be refunded rather than voided");invoice.status="VOID";invoice.voidedAt=new Date();invoice.amountDue=0;await invoice.save();return invoice;};
const startRecurring=async(id:string)=>{const invoice:any=await Invoice.findById(id);if(!invoice)throw new NotFoundError("Invoice not found");return createRecurringBillingCheckout(invoice,"/admin/invoices");};
const startRecurringPublic=async(token:string)=>{const found:any=await Invoice.findOne({publicTokenHash:hashPublicToken(token)}).select("+publicTokenHash");if(!found)throw new NotFoundError("Invoice link is invalid");const invoice:any=await refreshInvoiceFinancials(String(found._id));return createRecurringBillingCheckout(invoice,`/invoice/${encodeURIComponent(token)}`);};
const cancelRecurring=async(id:string)=>{const invoice:any=await Invoice.findById(id);if(!invoice?.recurrenceGroupId)throw new BadRequestError("This invoice is not part of a recurring series");const recurring:any=await RecurringBilling.findOne({recurrenceGroupId:invoice.recurrenceGroupId});if(!recurring)throw new NotFoundError("Recurring billing agreement not found");return cancelStripeSubscription(recurring);};
const financeSummary=async()=>{const now=new Date();const aging=[{label:"Current",min:0,max:0},{label:"1-30",min:1,max:30},{label:"31-60",min:31,max:60},{label:"61-90",min:61,max:90},{label:"90+",min:91,max:99999}];const invoices:any[]=await Invoice.find({status:{$nin:["VOID"]}}).select("status total amountPaid amountDue amountRefunded dueAt issuedAt").lean();const outstanding=money(invoices.filter(i=>!["PAID","REFUNDED"].includes(i.status)).reduce((s,i)=>s+Number(i.amountDue||0),0));const paidRevenue=money(invoices.reduce((s,i)=>s+Number(i.amountPaid||0)-Number(i.amountRefunded||0),0));const paidInvoices=invoices.filter(i=>Number(i.amountPaid||0)>0);const averageBookingValue=money(paidInvoices.length?paidInvoices.reduce((s,i)=>s+Number(i.total||0),0)/paidInvoices.length:0);const agingBuckets=aging.map(b=>({label:b.label,amount:money(invoices.filter(i=>Number(i.amountDue||0)>0&&i.dueAt).filter(i=>{const days=Math.max(0,Math.floor((now.getTime()-new Date(i.dueAt).getTime())/86400000));return days>=b.min&&days<=b.max;}).reduce((s,i)=>s+Number(i.amountDue||0),0))}));return{outstandingInvoices:outstanding,paidRevenue,averageBookingValue,invoiceCount:invoices.length,aging:agingBuckets};};
export default {ensureInvoiceForCompletedJob,listInvoices,getInvoice,sendInvoice,publicInvoice,payPublic,payAdmin,recordManualPayment,updateInvoice,voidInvoice,startRecurring,startRecurringPublic,cancelRecurring,financeSummary};
