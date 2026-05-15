import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  fullName: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  reply?: string;
  status: "PENDING" | "REPLIED";
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    message: { type: String, required: true },
    reply: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "REPLIED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const Contact = mongoose.model<IContact>("Contact", contactSchema);

export default Contact;
