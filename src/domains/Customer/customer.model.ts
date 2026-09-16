import mongoose, { Document, Schema, Types } from "mongoose";

export type CustomerContactMethod = "EMAIL" | "PHONE" | "SMS";
export type CustomerStatus = "ACTIVE" | "ARCHIVED";

export interface ICustomerAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip: string;
  country?: string;
  propertyType?: "HOME" | "OFFICE" | "OTHER";
  isPrimary: boolean;
}

export interface ICustomer extends Document {
  name: string;
  email?: string;
  normalizedEmail?: string;
  phone?: string;
  normalizedPhone?: string;
  status: CustomerStatus;
  addresses: ICustomerAddress[];
  preferences: {
    contactMethod: CustomerContactMethod;
    preferredContactWindow?: string;
    serviceNotes?: string;
  };
  accessInstructions?: string;
  pets: Array<{ name?: string; type: string; notes?: string }>;
  tags: string[];
  notes: Array<{ body: string; createdBy?: Types.ObjectId; createdAt: Date }>;
  reviews: Array<{
    rating: number;
    comment?: string;
    source?: string;
    bookingReference?: string;
    createdAt: Date;
  }>;
  firstLeadId?: Types.ObjectId;
  lastLeadId?: Types.ObjectId;
  createdSource?: string;
  lastActivityAt?: Date;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<ICustomerAddress>(
  {
    label: { type: String, trim: true, maxlength: 80 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    zip: { type: String, required: true, trim: true, maxlength: 30 },
    country: { type: String, trim: true, maxlength: 100 },
    propertyType: { type: String, enum: ["HOME", "OFFICE", "OTHER"] },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true },
);

const noteSchema = new Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const reviewSchema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 5000 },
    source: { type: String, trim: true, maxlength: 120 },
    bookingReference: { type: String, trim: true, maxlength: 100 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    normalizedEmail: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 50 },
    normalizedPhone: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE", index: true },
    addresses: { type: [addressSchema], default: [] },
    preferences: {
      contactMethod: { type: String, enum: ["EMAIL", "PHONE", "SMS"], default: "EMAIL" },
      preferredContactWindow: { type: String, trim: true, maxlength: 120 },
      serviceNotes: { type: String, trim: true, maxlength: 3000 },
    },
    accessInstructions: { type: String, trim: true, maxlength: 3000 },
    pets: {
      type: [
        new Schema(
          {
            name: { type: String, trim: true, maxlength: 100 },
            type: { type: String, required: true, trim: true, maxlength: 100 },
            notes: { type: String, trim: true, maxlength: 1000 },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
    tags: { type: [String], default: [] },
    notes: { type: [noteSchema], default: [] },
    reviews: { type: [reviewSchema], default: [] },
    firstLeadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    lastLeadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    createdSource: { type: String, trim: true, maxlength: 80 },
    lastActivityAt: { type: Date, index: true },
    stripeCustomerId: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true },
);

customerSchema.index({ normalizedEmail: 1 }, { unique: true, sparse: true });
customerSchema.index({ normalizedPhone: 1 }, { unique: true, sparse: true });
customerSchema.index({ name: "text", email: "text", phone: "text", tags: "text" });
customerSchema.index({ status: 1, updatedAt: -1 });

const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
export default Customer;
