import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAuthSession extends Document {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  csrfToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const authSessionSchema = new Schema<IAuthSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: { type: String, required: true, select: false },
    csrfToken: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthSession = mongoose.model<IAuthSession>("AuthSession", authSessionSchema);
export default AuthSession;
