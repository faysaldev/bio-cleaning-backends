import mongoose, { Schema } from "mongoose";

export type DepositPolicy = "NONE" | "OPTIONAL" | "REQUIRED";
export type DepositType = "PERCENT" | "FIXED";

export interface IWeeklyHours {
  dayOfWeek: number;
  isOpen: boolean;
  start: string;
  end: string;
}

export interface ISchedulingSettings {
  _id: string;
  timezone: string;
  slotIntervalMinutes: number;
  bookingLeadTimeHours: number;
  bookingHorizonDays: number;
  defaultTravelBufferMinutes: number;
  defaultCrewCapacity: number;
  cancellationNoticeHours: number;
  rescheduleNoticeHours: number;
  allowLateCancellation: boolean;
  lateCancellationFeePercent: number;
  depositPolicy: DepositPolicy;
  depositType: DepositType;
  depositValue: number;
  currency: string;
  recurrenceMaxOccurrences: number;
  weeklyHours: IWeeklyHours[];
  closedDates: Array<{ date: string; reason?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyHoursSchema = new Schema<IWeeklyHours>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isOpen: { type: Boolean, default: true },
    start: { type: String, required: true, default: "08:00" },
    end: { type: String, required: true, default: "18:00" },
  },
  { _id: false },
);

const closedDateSchema = new Schema(
  {
    date: { type: String, required: true },
    reason: { type: String, trim: true },
  },
  { _id: false },
);

const defaultWeeklyHours = () => [
  { dayOfWeek: 0, isOpen: false, start: "08:00", end: "18:00" },
  { dayOfWeek: 1, isOpen: true, start: "08:00", end: "18:00" },
  { dayOfWeek: 2, isOpen: true, start: "08:00", end: "18:00" },
  { dayOfWeek: 3, isOpen: true, start: "08:00", end: "18:00" },
  { dayOfWeek: 4, isOpen: true, start: "08:00", end: "18:00" },
  { dayOfWeek: 5, isOpen: true, start: "08:00", end: "18:00" },
  { dayOfWeek: 6, isOpen: true, start: "09:00", end: "16:00" },
];

const schedulingSettingsSchema = new Schema<ISchedulingSettings>(
  {
    _id: { type: String, default: "default" },
    timezone: { type: String, default: "America/New_York", trim: true },
    slotIntervalMinutes: { type: Number, default: 30, min: 15, max: 180 },
    bookingLeadTimeHours: { type: Number, default: 4, min: 0, max: 720 },
    bookingHorizonDays: { type: Number, default: 90, min: 1, max: 365 },
    defaultTravelBufferMinutes: { type: Number, default: 30, min: 0, max: 240 },
    defaultCrewCapacity: { type: Number, default: 3, min: 1, max: 100 },
    cancellationNoticeHours: { type: Number, default: 24, min: 0, max: 720 },
    rescheduleNoticeHours: { type: Number, default: 12, min: 0, max: 720 },
    allowLateCancellation: { type: Boolean, default: false },
    lateCancellationFeePercent: { type: Number, default: 50, min: 0, max: 100 },
    depositPolicy: {
      type: String,
      enum: ["NONE", "OPTIONAL", "REQUIRED"],
      default: "NONE",
    },
    depositType: { type: String, enum: ["PERCENT", "FIXED"], default: "PERCENT" },
    depositValue: { type: Number, default: 20, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    recurrenceMaxOccurrences: { type: Number, default: 12, min: 1, max: 52 },
    weeklyHours: { type: [weeklyHoursSchema], default: defaultWeeklyHours },
    closedDates: { type: [closedDateSchema], default: [] },
  },
  { timestamps: true },
);

const SchedulingSettings = mongoose.model<ISchedulingSettings>(
  "SchedulingSettings",
  schedulingSettingsSchema,
);

export default SchedulingSettings;
