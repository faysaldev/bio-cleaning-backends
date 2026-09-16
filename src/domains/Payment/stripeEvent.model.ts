import mongoose, { Document, Schema } from "mongoose";

export interface IStripeEvent extends Document {
  eventId: string;
  type: string;
  status: "PROCESSING" | "PROCESSED" | "FAILED";
  attempts: number;
  processedAt?: Date;
  failureMessage?: string;
}

const stripeEventSchema = new Schema<IStripeEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    status: { type: String, enum: ["PROCESSING", "PROCESSED", "FAILED"], default: "PROCESSING", index: true },
    attempts: { type: Number, default: 1, min: 1 },
    processedAt: { type: Date },
    failureMessage: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

const StripeEvent = mongoose.model<IStripeEvent>("StripeEvent", stripeEventSchema);
export default StripeEvent;
