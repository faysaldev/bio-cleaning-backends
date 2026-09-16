import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILeadTask extends Document {
  leadId: Types.ObjectId;
  title: string;
  description?: string;
  dueAt: Date;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignedTo?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadTaskSchema = new Schema<ILeadTask>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, trim: true, maxlength: 3000 },
    dueAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["PENDING", "COMPLETED", "CANCELLED"], default: "PENDING", index: true },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

leadTaskSchema.index({ status: 1, dueAt: 1 });
leadTaskSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });
leadTaskSchema.index({ leadId: 1, status: 1, dueAt: 1 });

const LeadTask = mongoose.model<ILeadTask>("LeadTask", leadTaskSchema);
export default LeadTask;
