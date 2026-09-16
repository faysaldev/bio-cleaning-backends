import mongoose, { Schema, Types } from "mongoose";

export type JobStatus =
  | "SCHEDULED"
  | "EN_ROUTE"
  | "IN_PROGRESS"
  | "PAUSED"
  | "ISSUE"
  | "COMPLETED"
  | "CANCELLED";

export interface IJob {
  _id: Types.ObjectId;
  jobNumber: string;
  bookingId: Types.ObjectId;
  customerId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  status: JobStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  businessTimezone?: string;
  assignedStaffIds: Types.ObjectId[];
  crewId?: Types.ObjectId;
  address: { line1: string; line2?: string; city: string; zip: string };
  customerName: string;
  customerPhone?: string;
  customerInstructions?: string;
  internalNotes: Array<{ text: string; createdAt: Date; createdBy?: Types.ObjectId }>;
  checklist: Array<{
    key: string;
    label: string;
    completed: boolean;
    completedAt?: Date;
    completedBy?: Types.ObjectId;
  }>;
  photos: Array<{
    key: string;
    type: "BEFORE" | "AFTER" | "ISSUE";
    url: string;
    caption?: string;
    uploadedAt: Date;
    uploadedBy?: Types.ObjectId;
  }>;
  issues: Array<{
    key: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "OPEN" | "RESOLVED";
    reportedAt: Date;
    reportedBy?: Types.ObjectId;
    resolvedAt?: Date;
    resolution?: string;
  }>;
  actualStartedAt?: Date;
  actualCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 3000 },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const checklistSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const photoSchema = new Schema(
  {
    key: { type: String, required: true },
    type: { type: String, enum: ["BEFORE", "AFTER", "ISSUE"], required: true },
    url: { type: String, required: true },
    caption: { type: String, trim: true, maxlength: 500 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const issueSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
    status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
    reportedAt: { type: Date, default: Date.now },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
    resolution: { type: String, trim: true, maxlength: 3000 },
  },
  { _id: false },
);

const jobSchema = new Schema<IJob>(
  {
    jobNumber: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", index: true },
    status: {
      type: String,
      enum: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "ISSUE", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },
    scheduledStart: { type: Date, required: true, index: true },
    scheduledEnd: { type: Date, required: true, index: true },
    businessTimezone: { type: String, trim: true },
    assignedStaffIds: [{ type: Schema.Types.ObjectId, ref: "StaffSchedule" }],
    crewId: { type: Schema.Types.ObjectId, ref: "Crew", index: true },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      zip: { type: String, required: true },
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerInstructions: { type: String, trim: true, maxlength: 4000 },
    internalNotes: { type: [noteSchema], default: [] },
    checklist: { type: [checklistSchema], default: [] },
    photos: { type: [photoSchema], default: [] },
    issues: { type: [issueSchema], default: [] },
    actualStartedAt: { type: Date },
    actualCompletedAt: { type: Date },
  },
  { timestamps: true },
);

jobSchema.index({ assignedStaffIds: 1, scheduledStart: 1, scheduledEnd: 1, status: 1 });
jobSchema.index({ crewId: 1, scheduledStart: 1, scheduledEnd: 1, status: 1 });
jobSchema.index({ status: 1, scheduledStart: 1, scheduledEnd: 1 });

const Job = mongoose.model<IJob>("Job", jobSchema);
export default Job;
