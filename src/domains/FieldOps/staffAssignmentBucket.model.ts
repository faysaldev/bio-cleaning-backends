import mongoose, { Schema, Types } from "mongoose";

export interface IStaffAssignmentBucket {
  staffId: Types.ObjectId;
  bucketKey: string;
  jobId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffAssignmentBucketSchema = new Schema<IStaffAssignmentBucket>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "StaffSchedule", required: true, index: true },
    bucketKey: { type: String, required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
  },
  { timestamps: true },
);

staffAssignmentBucketSchema.index({ staffId: 1, bucketKey: 1 }, { unique: true });
staffAssignmentBucketSchema.index({ jobId: 1, staffId: 1 });

const StaffAssignmentBucket = mongoose.model<IStaffAssignmentBucket>(
  "StaffAssignmentBucket",
  staffAssignmentBucketSchema,
);
export default StaffAssignmentBucket;
