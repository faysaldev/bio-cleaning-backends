import mongoose, { Schema } from "mongoose";

export interface IWebsiteDocument extends mongoose.Document {
  key: "primary";
  draft: Record<string, unknown>;
  published: Record<string, unknown>;
  draftRevision: number;
  publishedRevision: number;
  publishedAt?: Date;
  updatedBy?: mongoose.Types.ObjectId;
  publishedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const websiteSchema = new Schema<IWebsiteDocument>(
  {
    key: { type: String, enum: ["primary"], default: "primary", unique: true, index: true },
    draft: { type: Schema.Types.Mixed, required: true },
    published: { type: Schema.Types.Mixed, required: true },
    draftRevision: { type: Number, default: 1, min: 1 },
    publishedRevision: { type: Number, default: 1, min: 1 },
    publishedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, minimize: false },
);

const Website = mongoose.model<IWebsiteDocument>("Website", websiteSchema);
export default Website;
