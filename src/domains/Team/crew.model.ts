import mongoose, { Schema, Types } from "mongoose";

export interface ICrew {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  memberIds: Types.ObjectId[];
  leadStaffId?: Types.ObjectId;
  serviceIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const crewSchema = new Schema<ICrew>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "StaffSchedule" }],
    leadStaffId: { type: Schema.Types.ObjectId, ref: "StaffSchedule" },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

crewSchema.index({ isActive: 1, name: 1 });
const Crew = mongoose.model<ICrew>("Crew", crewSchema);
export default Crew;
