import mongoose, { Document, Schema, Types } from "mongoose";

export type ReviewRequestStatus = "PENDING" | "SUBMITTED" | "EXPIRED";

export interface IReviewRequest extends Document {
  customerId: Types.ObjectId;
  bookingId: Types.ObjectId;
  tokenHash: string;
  status: ReviewRequestStatus;
  expiresAt: Date;
  rating?: number;
  comment?: string;
  publishConsent: boolean;
  submittedAt?: Date;
  publicReviewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IReviewRequest>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    status: { type: String, enum: ["PENDING", "SUBMITTED", "EXPIRED"], default: "PENDING", index: true },
    expiresAt: { type: Date, required: true, index: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 5000 },
    publishConsent: { type: Boolean, default: false, index: true },
    submittedAt: { type: Date },
    publicReviewUrl: { type: String, trim: true, maxlength: 1200 },
  },
  { timestamps: true },
);

schema.index({ status: 1, submittedAt: 1, rating: 1 });
schema.index({ status: 1, publishConsent: 1, submittedAt: -1 });
const ReviewRequest = mongoose.model<IReviewRequest>("ReviewRequest", schema);
export default ReviewRequest;
