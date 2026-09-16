import PaymentTransaction from "./paymentTransaction.model";
import RecurringBilling from "./recurringBilling.model";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { cancelStripeSubscription, createStripeRefund } from "./stripe.service";

const listPayments=async(query:any)=>{const page=Math.max(1,Number(query.page)||1),limit=Math.min(100,Math.max(1,Number(query.limit)||20)),filter:any={};if(query.status)filter.status=query.status;if(query.purpose)filter.purpose=query.purpose;if(query.provider)filter.provider=query.provider;if(query.invoiceId)filter.invoiceId=query.invoiceId;const [payments,total]=await Promise.all([PaymentTransaction.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).populate("invoiceId","invoiceNumber status total amountDue").populate("customerId","name email").populate("bookingId","reference serviceType").lean(),PaymentTransaction.countDocuments(filter)]);return{payments,meta:{page,limit,total,totalPages:Math.ceil(total/limit)}};};
const refundPayment=async(id:string,amount:number)=>{const payment:any=await PaymentTransaction.findById(id);if(!payment)throw new NotFoundError("Payment not found");if(payment.type!=="PAYMENT"||payment.status!=="SUCCEEDED")throw new BadRequestError("Only successful payments can be refunded");if(payment.provider!=="STRIPE")throw new BadRequestError("Manual payments cannot be refunded through Stripe");return createStripeRefund(payment,amount);};
const listRecurring=async()=>RecurringBilling.find().sort({createdAt:-1}).populate("customerId","name email phone").lean();
const cancelRecurring=async(id:string)=>{const recurring:any=await RecurringBilling.findById(id);if(!recurring)throw new NotFoundError("Recurring billing agreement not found");if(recurring.status==="CANCELED")return recurring;return cancelStripeSubscription(recurring);};
export default {listPayments,refundPayment,listRecurring,cancelRecurring};
