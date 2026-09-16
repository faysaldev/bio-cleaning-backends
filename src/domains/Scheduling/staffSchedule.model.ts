import mongoose, { Schema, Types } from "mongoose";

export interface IStaffSchedule {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  isActive: boolean;
  capacityUnits: number;
  serviceIds: Types.ObjectId[];
  weeklyHours: Array<{
    dayOfWeek: number;
    isAvailable: boolean;
    start: string;
    end: string;
  }>;
  timeOff: Array<{ startAt: Date; endAt: Date; reason?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyHoursSchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isAvailable: { type: Boolean, default: true },
    start: { type: String, default: "08:00", required: true },
    end: { type: String, default: "18:00", required: true },
  },
  { _id: false },
);

const timeOffSchema = new Schema(
  {
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    reason: { type: String, trim: true },
  },
  { _id: false },
);

const staffScheduleSchema = new Schema<IStaffSchedule>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    capacityUnits: { type: Number, default: 1, min: 1, max: 10 },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    weeklyHours: { type: [weeklyHoursSchema], default: [] },
    timeOff: { type: [timeOffSchema], default: [] },
  },
  { timestamps: true },
);

staffScheduleSchema.index({ isActive: 1, serviceIds: 1 });

const StaffSchedule = mongoose.model<IStaffSchedule>("StaffSchedule", staffScheduleSchema);
export default StaffSchedule;
