import mongoose, { Document, Schema, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "BOOKING_RECEIVED",
  "BOOKING_CONFIRMED",
  "BOOKING_REMINDER",
  "CLEANER_ON_WAY",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
  "JOB_COMPLETED",
  "PAYMENT_RECEIPT",
  "REVIEW_REQUEST",
  "REBOOK_REMINDER",
  "WIN_BACK",
  "GENERIC",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface ICustomerNotification extends Document {
  customerId?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICustomerNotification>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    href: { type: String, trim: true, maxlength: 1200 },
    dedupeKey: { type: String, trim: true, maxlength: 300, unique: true, sparse: true },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date, index: true },
  },
  { timestamps: true },
);

schema.index({ customerId: 1, createdAt: -1 });
schema.index({ customerId: 1, readAt: 1, createdAt: -1 });

const CustomerNotification = mongoose.model<ICustomerNotification>("CustomerNotification", schema);
export default CustomerNotification;
