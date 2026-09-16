import mongoose, { Document, Schema, Types } from "mongoose";

export const LEAD_STATUSES = [
  "NEW",
  "ATTEMPTED_CONTACT",
  "CONTACTED",
  "ESTIMATE_QUOTE_SENT",
  "FOLLOW_UP",
  "WON",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "CONTACT",
  "GET_QUOTE",
  "PHONE",
  "MANUAL",
  "BOOKING_ABANDONMENT",
  "REFERRAL",
  "IMPORT",
  "ONLINE_BOOKING",
  "CAREERS",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface ILead extends Document {
  name: string;
  email?: string;
  normalizedEmail?: string;
  phone?: string;
  normalizedPhone?: string;
  source: LeadSource;
  sourceHistory: Array<{ source: LeadSource; referenceId?: string; capturedAt: Date }>;
  status: LeadStatus;
  ownerId?: Types.ObjectId;
  value: number;
  requestedServiceId?: Types.ObjectId;
  requestedServiceName?: string;
  message?: string;
  notes?: string;
  tags: string[];
  nextFollowUpAt?: Date;
  lastContactAt?: Date;
  lastActivityAt: Date;
  customerId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  abandonedBookingId?: Types.ObjectId;
  referral?: { referredBy?: string; details?: string };
  lostReason?: string;
  wonAt?: Date;
  lostAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sourceHistorySchema = new Schema(
  {
    source: { type: String, enum: LEAD_SOURCES, required: true },
    referenceId: { type: String, trim: true, maxlength: 120 },
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    normalizedEmail: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, maxlength: 50 },
    normalizedPhone: { type: String, trim: true, index: true },
    source: { type: String, enum: LEAD_SOURCES, required: true, index: true },
    sourceHistory: { type: [sourceHistorySchema], default: [] },
    status: { type: String, enum: LEAD_STATUSES, default: "NEW", index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    value: { type: Number, default: 0, min: 0 },
    requestedServiceId: { type: Schema.Types.ObjectId, ref: "Service", index: true },
    requestedServiceName: { type: String, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 5000 },
    notes: { type: String, trim: true, maxlength: 5000 },
    tags: { type: [String], default: [] },
    nextFollowUpAt: { type: Date, index: true },
    lastContactAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },
    abandonedBookingId: { type: Schema.Types.ObjectId, ref: "AbandonedBooking", index: true },
    referral: {
      referredBy: { type: String, trim: true, maxlength: 200 },
      details: { type: String, trim: true, maxlength: 1000 },
    },
    lostReason: { type: String, trim: true, maxlength: 1000 },
    wonAt: { type: Date },
    lostAt: { type: Date },
  },
  { timestamps: true },
);

leadSchema.index({ status: 1, nextFollowUpAt: 1 });
leadSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ name: "text", email: "text", phone: "text", requestedServiceName: "text", tags: "text" });

const Lead = mongoose.model<ILead>("Lead", leadSchema);
export default Lead;
