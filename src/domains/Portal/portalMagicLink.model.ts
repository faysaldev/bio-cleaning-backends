import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPortalMagicLink extends Document {
  customerId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  requestedIp?: string;
}

const schema = new Schema<IPortalMagicLink>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, index: true },
    requestedIp: { type: String, maxlength: 120 },
  },
  { timestamps: true },
);

const PortalMagicLink = mongoose.model<IPortalMagicLink>("PortalMagicLink", schema);
export default PortalMagicLink;
