import mongoose, { Schema, Types } from "mongoose";

export interface IScheduleBlock {
  _id: Types.ObjectId;
  title: string;
  startAt: Date;
  endAt: Date;
  capacityReduction: number;
  serviceId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleBlockSchema = new Schema<IScheduleBlock>(
  {
    title: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    capacityReduction: { type: Number, default: 999, min: 1, max: 999 },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", index: true },
  },
  { timestamps: true },
);

scheduleBlockSchema.index({ startAt: 1, endAt: 1 });

const ScheduleBlock = mongoose.model<IScheduleBlock>("ScheduleBlock", scheduleBlockSchema);
export default ScheduleBlock;
