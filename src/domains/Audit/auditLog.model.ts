import mongoose, { Schema, Types } from "mongoose";

export interface IAuditLog {
  actorId?: Types.ObjectId;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  method: string;
  path: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  ipHash?: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

const schema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorEmail: { type: String, trim: true, lowercase: true },
    actorRole: { type: String, trim: true, index: true },
    action: { type: String, required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true, maxlength: 1000 },
    entityType: { type: String, trim: true, index: true },
    entityId: { type: String, trim: true, index: true },
    requestId: { type: String, trim: true, index: true },
    ipHash: { type: String, trim: true },
    statusCode: { type: Number, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: -1, actorId: 1 });
schema.index({ entityType: 1, entityId: 1, createdAt: -1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model<IAuditLog>("AuditLog", schema);
