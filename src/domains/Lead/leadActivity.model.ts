import mongoose, { Document, Schema, Types } from "mongoose";

export const LEAD_ACTIVITY_TYPES = [
  "SYSTEM",
  "NOTE",
  "CALL",
  "EMAIL",
  "SMS",
  "STATUS_CHANGE",
  "FOLLOW_UP",
  "QUOTE",
  "CUSTOMER_CREATED",
  "BOOKING",
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export interface ILeadActivity extends Document {
  leadId: Types.ObjectId;
  type: LeadActivityType;
  title: string;
  body?: string;
  direction?: "INBOUND" | "OUTBOUND" | "INTERNAL";
  createdBy?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadActivitySchema = new Schema<ILeadActivity>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    type: { type: String, enum: LEAD_ACTIVITY_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    body: { type: String, trim: true, maxlength: 10000 },
    direction: { type: String, enum: ["INBOUND", "OUTBOUND", "INTERNAL"], default: "INTERNAL" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

leadActivitySchema.index({ leadId: 1, occurredAt: -1 });

const LeadActivity = mongoose.model<ILeadActivity>("LeadActivity", leadActivitySchema);
export default LeadActivity;
