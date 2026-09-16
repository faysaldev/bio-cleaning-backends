import mongoose, { Schema } from "mongoose";

export interface ICapacityBucket {
  _id: string;
  usedUnits: number;
  createdAt: Date;
  updatedAt: Date;
}

const capacityBucketSchema = new Schema<ICapacityBucket>(
  {
    _id: { type: String, required: true },
    usedUnits: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const CapacityBucket = mongoose.model<ICapacityBucket>("CapacityBucket", capacityBucketSchema);
export default CapacityBucket;
