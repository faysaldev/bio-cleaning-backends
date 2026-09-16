import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type Frequency = "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

export interface IPriceBreakdown {
  basePrice: number;
  propertyAdjustment: number;
  minimumPrice: number;
  serviceSubtotal: number;
  frequencyDiscountPercent: number;
  frequencyDiscountAmount: number;
  extrasTotal: number;
  subtotal: number;
  promotionDiscount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface IBooking extends Document {
  reference: string;
  serviceId?: Types.ObjectId;
  serviceType: string;
  propertySize: string;
  date: Date;
  timeSlot: string;
  slotKey?: string;
  frequency: Frequency;
  extras: Array<{ code: string; name: string; price: number }>;
  promoCode?: string;
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
  priceBreakdown: IPriceBreakdown;
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const priceBreakdownSchema = new Schema<IPriceBreakdown>(
  {
    basePrice: { type: Number, required: true },
    propertyAdjustment: { type: Number, required: true },
    minimumPrice: { type: Number, required: true },
    serviceSubtotal: { type: Number, required: true },
    frequencyDiscountPercent: { type: Number, required: true },
    frequencyDiscountAmount: { type: Number, required: true },
    extrasTotal: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    promotionDiscount: { type: Number, required: true },
    taxRate: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const extraSnapshotSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", index: true },
    // Snapshot of the service name at booking time for stable historical display.
    serviceType: { type: String, required: true },
    propertySize: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true },
    // Active bookings own a unique slotKey. Cancelled bookings release it.
    slotKey: { type: String },
    frequency: {
      type: String,
      enum: ["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"],
      required: true,
    },
    extras: { type: [extraSnapshotSchema], default: [] },
    promoCode: { type: String },
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
    priceBreakdown: { type: priceBreakdownSchema, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
  },
  { timestamps: true },
);

bookingSchema.index({ slotKey: 1 });
bookingSchema.index({ date: 1, status: 1 });

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
