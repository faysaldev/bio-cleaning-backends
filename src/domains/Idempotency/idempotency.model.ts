import mongoose, { Schema } from "mongoose";

export interface IIdempotencyRecord {
  key: string;
  scope: string;
  requestHash: string;
  status: "PROCESSING" | "COMPLETED";
  responseStatus?: number;
  responseBody?: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const schema = new Schema<IIdempotencyRecord>(
  {
    key: { type: String, required: true },
    scope: { type: String, required: true },
    requestHash: { type: String, required: true },
    status: { type: String, enum: ["PROCESSING", "COMPLETED"], default: "PROCESSING" },
    responseStatus: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ scope: 1, key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model<IIdempotencyRecord>("IdempotencyRecord", schema);
