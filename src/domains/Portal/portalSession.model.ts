import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPortalSession extends Document {
  customerId: Types.ObjectId;
  tokenHash: string;
  csrfToken: string;
  expiresAt: Date;
  lastSeenAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

const schema = new Schema<IPortalSession>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    csrfToken: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastSeenAt: { type: Date, default: Date.now },
    ipAddress: { type: String, maxlength: 120 },
    userAgent: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

schema.index({ customerId: 1, expiresAt: 1 });
const PortalSession = mongoose.model<IPortalSession>("PortalSession", schema);
export default PortalSession;
