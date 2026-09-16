import mongoose, { Schema, Types } from "mongoose";

export interface IWaitlistEntry {
  _id: Types.ObjectId;
  serviceId: Types.ObjectId;
  requestedDate: string;
  preferredTime?: string;
  frequency: "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
  property: {
    propertyType: "HOME" | "OFFICE" | "OTHER";
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
  };
  extraCodes: string[];
  customer: { name: string; email: string; phone: string };
  status: "WAITING" | "NOTIFIED" | "BOOKED" | "CANCELLED";
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlistEntry>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    requestedDate: { type: String, required: true, index: true },
    preferredTime: { type: String },
    frequency: {
      type: String,
      enum: ["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"],
      default: "ONE_TIME",
    },
    property: {
      propertyType: { type: String, enum: ["HOME", "OFFICE", "OTHER"], default: "HOME" },
      bedrooms: { type: Number },
      bathrooms: { type: Number },
      squareFeet: { type: Number },
    },
    extraCodes: { type: [String], default: [] },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["WAITING", "NOTIFIED", "BOOKED", "CANCELLED"],
      default: "WAITING",
      index: true,
    },
    notifiedAt: { type: Date },
  },
  { timestamps: true },
);

waitlistSchema.index({ serviceId: 1, requestedDate: 1, status: 1, createdAt: 1 });

const WaitlistEntry = mongoose.model<IWaitlistEntry>("WaitlistEntry", waitlistSchema);
export default WaitlistEntry;
