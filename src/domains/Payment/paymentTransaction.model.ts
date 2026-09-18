import mongoose, { Document, Schema, Types } from "mongoose";

export const PAYMENT_TRANSACTION_STATUSES = ["PENDING", "SUCCEEDED", "FAILED"] as const;
export const PAYMENT_PURPOSES = ["DEPOSIT", "INVOICE", "SUBSCRIPTION", "MANUAL", "REFUND"] as const;
export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];

export interface IPaymentTransaction extends Document {
  type: "PAYMENT" | "REFUND";
  purpose: PaymentPurpose;
  provider: "STRIPE" | "MANUAL";
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  bookingId?: Types.ObjectId;
  bookingIds: Types.ObjectId[];
  invoiceId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  recurrenceGroupId?: string;
  recurringBillingId?: Types.ObjectId;
  parentPaymentId?: Types.ObjectId;
  allocations: Array<{ bookingId?: Types.ObjectId; invoiceId?: Types.ObjectId; amount: number }>;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  chargeId?: string;
  refundId?: string;
  providerInvoiceId?: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
  receiptUrl?: string;
  failureMessage?: string;
  metadata?: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    type: { type: String, enum: ["PAYMENT", "REFUND"], default: "PAYMENT", index: true },
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true, index: true },
    provider: { type: String, enum: ["STRIPE", "MANUAL"], default: "STRIPE", index: true },
    status: { type: String, enum: PAYMENT_TRANSACTION_STATUSES, default: "PENDING", index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    bookingIds: { type: [Schema.Types.ObjectId], ref: "Booking", default: [] },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    recurrenceGroupId: { type: String, index: true },
    recurringBillingId: { type: Schema.Types.ObjectId, ref: "RecurringBilling", index: true },
    parentPaymentId: { type: Schema.Types.ObjectId, ref: "PaymentTransaction", index: true },
    allocations: { type: [allocationSchema], default: [] },
    checkoutSessionId: { type: String },
    paymentIntentId: { type: String, index: true, sparse: true },
    chargeId: { type: String, index: true, sparse: true },
    refundId: { type: String, unique: true, sparse: true },
    providerInvoiceId: { type: String, unique: true, sparse: true },
    stripeCustomerId: { type: String, index: true },
    subscriptionId: { type: String, index: true },
    receiptUrl: { type: String },
    failureMessage: { type: String, maxlength: 2000 },
    metadata: { type: Schema.Types.Mixed },
    processedAt: { type: Date, index: true },
  },
  { timestamps: true },
);

paymentTransactionSchema.index({ invoiceId: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ bookingIds: 1, purpose: 1, status: 1 });
paymentTransactionSchema.index({ customerId: 1, createdAt: -1 });
paymentTransactionSchema.index({ checkoutSessionId: 1 }, { unique: true, sparse: true });
paymentTransactionSchema.index({ status: 1, type: 1, purpose: 1, createdAt: 1 });

const PaymentTransaction = mongoose.model<IPaymentTransaction>("PaymentTransaction", paymentTransactionSchema);
export default PaymentTransaction;
