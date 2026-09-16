import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationChannel = "EMAIL" | "SMS";
export type DeliveryStatus = "QUEUED" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";

export interface INotificationDelivery extends Document {
  notificationId?: Types.ObjectId;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  text: string;
  html?: string;
  status: DeliveryStatus;
  provider?: string;
  dedupeKey?: string;
  attempts: number;
  nextAttemptAt: Date;
  lockedAt?: Date;
  sentAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<INotificationDelivery>(
  {
    notificationId: { type: Schema.Types.ObjectId, ref: "CustomerNotification", index: true },
    channel: { type: String, enum: ["EMAIL", "SMS"], required: true, index: true },
    recipient: { type: String, required: true, trim: true, maxlength: 320 },
    subject: { type: String, trim: true, maxlength: 300 },
    text: { type: String, required: true, maxlength: 20000 },
    html: { type: String, maxlength: 60000 },
    status: { type: String, enum: ["QUEUED", "PROCESSING", "SENT", "FAILED", "SKIPPED"], default: "QUEUED", index: true },
    provider: { type: String, trim: true, maxlength: 80 },
    dedupeKey: { type: String, unique: true, sparse: true, maxlength: 360 },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, index: true },
    sentAt: { type: Date },
    lastError: { type: String, maxlength: 4000 },
  },
  { timestamps: true },
);

schema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
const NotificationDelivery = mongoose.model<INotificationDelivery>("NotificationDelivery", schema);
export default NotificationDelivery;
