import mongoose, { Schema, Document } from "mongoose";

export interface IPatientInfo {
  name: string;
  email: string;
  phone: string;
  isNewPatient: boolean;
  notes?: string;
}

export interface IAppointment extends Document {
  serviceId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  timeSlot: string;
  patientInfo: IPatientInfo;
  status: "Pending" | "Confirmed" | "Cancelled" | "Completed";
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    patientInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      isNewPatient: { type: Boolean, default: true },
      notes: { type: String },
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema);

export default Appointment;
