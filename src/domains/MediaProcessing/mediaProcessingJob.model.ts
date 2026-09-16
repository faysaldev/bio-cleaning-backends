import mongoose, { Schema } from "mongoose";

export interface IMediaProcessingJob {
  kind: "CLOUDINARY_OPTIMIZE";
  publicId: string;
  sourceUrl: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  nextAttemptAt: Date;
  lockedAt?: Date;
  lastError?: string;
  completedAt?: Date;
  expiresAt: Date;
}

const schema = new Schema<IMediaProcessingJob>(
  {
    kind: { type: String, enum: ["CLOUDINARY_OPTIMIZE"], required: true },
    publicId: { type: String, required: true, index: true },
    sourceUrl: { type: String, required: true },
    status: { type: String, enum: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"], default: "QUEUED", index: true },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date },
    lastError: { type: String, maxlength: 4000 },
    completedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ publicId: 1, kind: 1 }, { unique: true });
schema.index({ status: 1, nextAttemptAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model<IMediaProcessingJob>("MediaProcessingJob", schema);
