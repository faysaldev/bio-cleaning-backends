import mongoose, { Schema, Types } from "mongoose";

export interface IAbandonedBooking {
  sessionId: string;
  state: "ACTIVE" | "ABANDONED" | "CONVERTED";
  stage: string;
  serviceId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  property?: Record<string, unknown>;
  extraCodes?: string[];
  frequency?: string;
  requestedDate?: string;
  requestedTime?: string;
  customer?: { name?: string; email?: string; phone?: string };
  bookingReference?: string;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const abandonedBookingSchema = new Schema<IAbandonedBooking>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    state: { type: String, enum: ["ACTIVE", "ABANDONED", "CONVERTED"], default: "ACTIVE", index: true },
    stage: { type: String, required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    property: { type: Schema.Types.Mixed },
    extraCodes: { type: [String], default: [] },
    frequency: { type: String },
    requestedDate: { type: String },
    requestedTime: { type: String },
    customer: {
      name: { type: String },
      email: { type: String, lowercase: true },
      phone: { type: String },
    },
    bookingReference: { type: String },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

abandonedBookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
abandonedBookingSchema.index({ state: 1, updatedAt: -1 });

const AbandonedBooking = mongoose.model<IAbandonedBooking>("AbandonedBooking", abandonedBookingSchema);
export default AbandonedBooking;
