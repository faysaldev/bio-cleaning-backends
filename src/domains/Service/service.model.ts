import mongoose, { Schema, Document } from "mongoose";

export interface IService extends Document {
  name: string;
  description: string;
  basePrice: number;
  includes: string[];
  image: string;
  isActive: boolean;
  duration: string;
  tags: string[];
  publish: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true },
    includes: { type: [String], default: [] },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    duration: { type: String, required: true },
    tags: { type: [String], default: [] },
    publish: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Service = mongoose.model<IService>("Service", serviceSchema);

export default Service;
