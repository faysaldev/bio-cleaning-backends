import mongoose, { Document, Schema, Types } from "mongoose";

export interface IRecurringBilling extends Document {
  customerId?: Types.ObjectId;
  recurrenceGroupId: string;
  serviceName: string;
  amount: number;
  currency: string;
  interval: "week" | "month";
  intervalCount: number;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "CANCELED" | "INCOMPLETE";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  checkoutSessionId?: string;
  lastStripeInvoiceId?: string;
  maxPayments?: number;
  paymentsProcessed: number;
  checkoutAttempt: number;
  startedAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recurringBillingSchema = new Schema<IRecurringBilling>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    recurrenceGroupId: { type: String, required: true, unique: true, index: true },
    serviceName: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    interval: { type: String, enum: ["week", "month"], required: true },
    intervalCount: { type: Number, required: true, min: 1, max: 52 },
    status: { type: String, enum: ["PENDING", "ACTIVE", "PAUSED", "CANCELED", "INCOMPLETE"], default: "PENDING", index: true },
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },
    checkoutSessionId: { type: String, unique: true, sparse: true },
    lastStripeInvoiceId: { type: String },
    maxPayments: { type: Number, min: 1 },
    paymentsProcessed: { type: Number, default: 0, min: 0 },
    checkoutAttempt: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date },
    canceledAt: { type: Date },
  },
  { timestamps: true },
);

const RecurringBilling = mongoose.model<IRecurringBilling>("RecurringBilling", recurringBillingSchema);
export default RecurringBilling;
