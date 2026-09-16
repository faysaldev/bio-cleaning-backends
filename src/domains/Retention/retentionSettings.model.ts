import mongoose, { Schema } from "mongoose";

export interface IRetentionSettings {
  _id: string;
  bookingRemindersEnabled: boolean;
  reminderHoursBefore: number[];
  reviewRequestsEnabled: boolean;
  reviewDelayMinutes: number;
  reviewLinkDays: number;
  publicReviewThreshold: number;
  publicReviewUrl?: string;
  rebookRemindersEnabled: boolean;
  rebookReminderDays: number;
  winBackEnabled: boolean;
  inactiveCustomerDays: number;
  smsEnabled: boolean;
}

interface RetentionSettingsModel extends mongoose.Model<IRetentionSettings> {
  getSingleton(): Promise<any>;
}

const schema = new Schema<IRetentionSettings, RetentionSettingsModel>(
  {
    _id: { type: String, default: "default" },
    bookingRemindersEnabled: { type: Boolean, default: true },
    reminderHoursBefore: { type: [Number], default: [24, 2] },
    reviewRequestsEnabled: { type: Boolean, default: true },
    reviewDelayMinutes: { type: Number, default: 30, min: 0, max: 10080 },
    reviewLinkDays: { type: Number, default: 30, min: 1, max: 365 },
    publicReviewThreshold: { type: Number, default: 4, min: 1, max: 5 },
    publicReviewUrl: { type: String, trim: true, maxlength: 1200 },
    rebookRemindersEnabled: { type: Boolean, default: true },
    rebookReminderDays: { type: Number, default: 30, min: 1, max: 365 },
    winBackEnabled: { type: Boolean, default: true },
    inactiveCustomerDays: { type: Number, default: 90, min: 7, max: 1095 },
    smsEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.statics.getSingleton = async function () {
  return this.findByIdAndUpdate("default", { $setOnInsert: { _id: "default" } }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

const RetentionSettings = mongoose.model<IRetentionSettings, RetentionSettingsModel>("RetentionSettings", schema);
export default RetentionSettings;
