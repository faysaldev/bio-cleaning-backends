import mongoose, { Schema, Types } from "mongoose";
import type { RoleType } from "../../config/roles";

export interface IStaffSchedule {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  employeeCode?: string;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  role: Exclude<RoleType, "user">;
  jobTitle?: string;
  skills: string[];
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
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  notes?: string;
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
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true, index: true },
    employeeCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    image: { type: String, trim: true },
    role: {
      type: String,
      enum: ["owner", "admin", "manager", "dispatcher", "cleaner", "support", "read_only"],
      default: "cleaner",
      index: true,
    },
    jobTitle: { type: String, trim: true },
    skills: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    capacityUnits: { type: Number, default: 1, min: 1, max: 10 },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    weeklyHours: { type: [weeklyHoursSchema], default: [] },
    timeOff: { type: [timeOffSchema], default: [] },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true },
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

staffScheduleSchema.index({ isActive: 1, serviceIds: 1 });
staffScheduleSchema.index({ role: 1, isActive: 1 });

const StaffSchedule = mongoose.model<IStaffSchedule>("StaffSchedule", staffScheduleSchema);
export default StaffSchedule;
