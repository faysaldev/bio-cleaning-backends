import mongoose, { Schema } from "mongoose";

export interface IWebsiteRevision extends mongoose.Document {
  revision: number;
  snapshot: Record<string, unknown>;
  publishedAt: Date;
  publishedBy?: mongoose.Types.ObjectId;
  note?: string;
}

const websiteRevisionSchema = new Schema<IWebsiteRevision>(
  {
    revision: { type: Number, required: true, unique: true, index: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date, required: true, default: Date.now },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, minimize: false },
);

const WebsiteRevision = mongoose.model<IWebsiteRevision>("WebsiteRevision", websiteRevisionSchema);
export default WebsiteRevision;
