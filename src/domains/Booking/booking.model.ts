import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type Frequency = "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
export type PaymentOption = "PAY_LATER" | "DEPOSIT";
export type PaymentStatus = "NOT_REQUIRED" | "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

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
  manualDiscountAmount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface IBooking extends Document {
  reference: string;
  customerId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  serviceType: string;
  propertySize: string;
  property: {
    propertyType: "HOME" | "OFFICE" | "OTHER";
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
  };
  date: Date;
  timeSlot: string;
  startAt?: Date;
  endAt?: Date;
  blockedStartAt?: Date;
  blockedEndAt?: Date;
  businessTimezone?: string;
  durationMinutes?: number;
  requiredStaffSnapshot?: number;
  capacityBucketKeys?: string[];
  frequency: Frequency;
  recurrenceGroupId?: string;
  bookingSessionId?: string;
  occurrenceIndex?: number;
  occurrenceCount?: number;
  extras: Array<{ code: string; name: string; price: number; durationMinutes?: number }>;
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
  managementTokenHash?: string;
  cancellationPolicy?: {
    noticeHours: number;
    rescheduleNoticeHours: number;
    allowLateCancellation: boolean;
    lateCancellationFeePercent: number;
  };
  cancellationFee?: number;
  payment: {
    option: PaymentOption;
    status: PaymentStatus;
    depositAmount: number;
    currency: string;
    checkoutSessionId?: string;
    checkoutUrl?: string;
    attempt: number;
    paidAt?: Date;
  };
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
    manualDiscountAmount: { type: Number, default: 0 },
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
    durationMinutes: { type: Number, default: 0 },
  },
  { _id: false },
);

const propertySchema = new Schema(
  {
    propertyType: { type: String, enum: ["HOME", "OFFICE", "OTHER"], default: "HOME" },
    bedrooms: { type: Number, min: 0, max: 30 },
    bathrooms: { type: Number, min: 0, max: 30 },
    squareFeet: { type: Number, min: 0, max: 1_000_000 },
  },
  { _id: false },
);

const cancellationPolicySchema = new Schema(
  {
    noticeHours: { type: Number, required: true },
    rescheduleNoticeHours: { type: Number, required: true },
    allowLateCancellation: { type: Boolean, required: true },
    lateCancellationFeePercent: { type: Number, required: true },
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    option: { type: String, enum: ["PAY_LATER", "DEPOSIT"], default: "PAY_LATER" },
    status: {
      type: String,
      enum: ["NOT_REQUIRED", "UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "NOT_REQUIRED",
    },
    depositAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", uppercase: true },
    checkoutSessionId: { type: String },
    checkoutUrl: { type: String },
    attempt: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", index: true },
    serviceType: { type: String, required: true },
    propertySize: { type: String, required: true },
    property: { type: propertySchema, default: () => ({ propertyType: "HOME" }) },
    date: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true },
    startAt: { type: Date, index: true },
    endAt: { type: Date, index: true },
    blockedStartAt: { type: Date, index: true },
    blockedEndAt: { type: Date, index: true },
    businessTimezone: { type: String },
    durationMinutes: { type: Number, min: 15 },
    requiredStaffSnapshot: { type: Number, min: 1 },
    capacityBucketKeys: { type: [String], default: [] },
    frequency: {
      type: String,
      enum: ["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"],
      required: true,
    },
    recurrenceGroupId: { type: String, index: true },
    bookingSessionId: { type: String },
    occurrenceIndex: { type: Number, min: 0 },
    occurrenceCount: { type: Number, min: 1 },
    extras: { type: [extraSnapshotSchema], default: [] },
    promoCode: { type: String },
    customerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, index: true },
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
    managementTokenHash: { type: String, select: false },
    cancellationPolicy: { type: cancellationPolicySchema },
    cancellationFee: { type: Number, min: 0 },
    payment: { type: paymentSchema, default: () => ({}) },
  },
  { timestamps: true },
);

bookingSchema.index({ date: 1, status: 1 });
bookingSchema.index({ serviceId: 1, startAt: 1, status: 1 });
bookingSchema.index({ blockedStartAt: 1, blockedEndAt: 1, status: 1 });
bookingSchema.index({ recurrenceGroupId: 1, occurrenceIndex: 1 });
bookingSchema.index({ bookingSessionId: 1 }, { unique: true, sparse: true });
bookingSchema.index({ createdAt: 1, status: 1 });
bookingSchema.index({ customerId: 1, status: 1, startAt: -1 });
bookingSchema.index({ frequency: 1, status: 1, createdAt: -1 });

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
