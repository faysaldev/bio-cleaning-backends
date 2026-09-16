import mongoose, { Document, Schema, Types } from "mongoose";

export const QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "CONVERTED"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface IQuote extends Document {
  quoteNumber: string;
  leadId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  serviceId: Types.ObjectId;
  status: QuoteStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: { line1: string; line2?: string; city: string; state?: string; zip: string; country?: string };
  };
  bookingDraft: {
    serviceId: Types.ObjectId;
    propertySize?: string;
    property: { propertyType: "HOME" | "OFFICE" | "OTHER"; bedrooms?: number; bathrooms?: number; squareFeet?: number };
    frequency: "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
    extraCodes: string[];
    promoCode?: string;
    occurrenceCount: number;
  };
  lineItems: Array<{ type: "SERVICE" | "EXTRA" | "DISCOUNT"; code?: string; name: string; description?: string; quantity: number; unitPrice: number; amount: number }>;
  pricing: {
    subtotal: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    currency: string;
  };
  /** Frozen server-authoritative booking price snapshot used when an accepted estimate converts. */
  priceBreakdown: Record<string, number>;
  manualDiscount?: { type: "PERCENT" | "FIXED"; value: number; label?: string; amount: number };
  estimatedDurationMinutes: number;
  requiredStaff: number;
  terms: string[];
  notes?: string;
  expiresAt: Date;
  publicTokenHash?: string;
  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  acceptance?: { name: string; email: string; acceptedAt: Date };
  convertedBookingReference?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    zip: { type: String, required: true, trim: true, maxlength: 30 },
    country: { type: String, trim: true, maxlength: 100 },
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

const quoteSchema = new Schema<IQuote>(
  {
    quoteNumber: { type: String, required: true, unique: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    status: { type: String, enum: QUOTE_STATUSES, default: "DRAFT", index: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 160 },
      email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
      phone: { type: String, required: true, trim: true, maxlength: 50 },
      address: { type: addressSchema, required: true },
    },
    bookingDraft: {
      serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
      propertySize: { type: String, trim: true, maxlength: 120 },
      property: { type: propertySchema, required: true },
      frequency: { type: String, enum: ["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"], required: true },
      extraCodes: { type: [String], default: [] },
      promoCode: { type: String, trim: true, uppercase: true, maxlength: 80 },
      occurrenceCount: { type: Number, default: 1, min: 1, max: 52 },
    },
    lineItems: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ["SERVICE", "EXTRA", "DISCOUNT"], required: true },
            code: { type: String, trim: true, maxlength: 100 },
            name: { type: String, required: true, trim: true, maxlength: 200 },
            description: { type: String, trim: true, maxlength: 1000 },
            quantity: { type: Number, required: true, min: 0.01, max: 1000 },
            unitPrice: { type: Number, required: true, min: 0 },
            amount: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discountAmount: { type: Number, required: true, min: 0 },
      taxRate: { type: Number, required: true, min: 0 },
      taxAmount: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, uppercase: true, trim: true },
    },
    priceBreakdown: { type: Schema.Types.Mixed, required: true },
    manualDiscount: {
      type: { type: String, enum: ["PERCENT", "FIXED"] },
      value: { type: Number, min: 0 },
      label: { type: String, trim: true, maxlength: 120 },
      amount: { type: Number, min: 0 },
    },
    estimatedDurationMinutes: { type: Number, required: true, min: 15 },
    requiredStaff: { type: Number, required: true, min: 1 },
    terms: { type: [String], default: [] },
    notes: { type: String, trim: true, maxlength: 5000 },
    expiresAt: { type: Date, required: true, index: true },
    publicTokenHash: { type: String, select: false, index: true },
    sentAt: { type: Date },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
    acceptance: {
      name: { type: String, trim: true, maxlength: 160 },
      email: { type: String, lowercase: true, trim: true, maxlength: 254 },
      acceptedAt: { type: Date },
    },
    convertedBookingReference: { type: String, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

quoteSchema.index({ status: 1, expiresAt: 1 });
quoteSchema.index({ status: 1, createdAt: 1 });
quoteSchema.index({ serviceId: 1, status: 1, createdAt: -1 });
quoteSchema.index({ customerId: 1, createdAt: -1 });
quoteSchema.index({ leadId: 1, createdAt: -1 });

const Quote = mongoose.model<IQuote>("Quote", quoteSchema);
export default Quote;
