import mongoose, { Schema, Document } from "mongoose";

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type ServiceType =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "DEEP_CLEAN"
  | "MOVE_IN_OUT";
export type Frequency = "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

export interface IBooking extends Document {
  reference: string;
  serviceType: string;
  propertySize: string;
  date: Date;
  timeSlot: string;
  frequency: Frequency;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      zip: string;
    };
  };
  notes?: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    reference: { type: String, required: true, unique: true },
    serviceType: {
      type: String,
      enum: ["RESIDENTIAL", "COMMERCIAL", "DEEP_CLEAN", "MOVE_IN_OUT"],
      required: true,
    },
    propertySize: { type: String, required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    frequency: {
      type: String,
      enum: ["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"],
      required: true,
    },
    customerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        line1: { type: String, required: true },
        line2: { type: String },
        city: { type: String, required: true },
        zip: { type: String, required: true },
      },
    },
    notes: { type: String },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
