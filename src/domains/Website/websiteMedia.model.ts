import mongoose, { Schema } from "mongoose";

export interface IWebsiteMedia extends mongoose.Document {
  url: string;
  altText: string;
  label?: string;
  kind: "image" | "video" | "document";
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const websiteMediaSchema = new Schema<IWebsiteMedia>(
  {
    url: { type: String, required: true, trim: true, maxlength: 2000, unique: true },
    altText: { type: String, required: true, trim: true, maxlength: 240 },
    label: { type: String, trim: true, maxlength: 160 },
    kind: { type: String, enum: ["image", "video", "document"], default: "image" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

websiteMediaSchema.index({ createdAt: -1 });
const WebsiteMedia = mongoose.model<IWebsiteMedia>("WebsiteMedia", websiteMediaSchema);
export default WebsiteMedia;
