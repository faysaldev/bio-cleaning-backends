import mongoose, { Document, Schema, Types } from "mongoose";

export const INVOICE_STATUSES = ["DRAFT", "OPEN", "PARTIALLY_PAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface IInvoice extends Document {
  invoiceNumber: string;
  bookingId: Types.ObjectId;
  jobId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  recurrenceGroupId?: string;
  status: InvoiceStatus;
  customer: { name: string; email: string; phone?: string; address?: string };
  items: Array<{ type: "SERVICE" | "EXTRA" | "FEE" | "DISCOUNT"; name: string; description?: string; quantity: number; unitPrice: number; amount: number }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountRefunded: number;
  amountDue: number;
  currency: string;
  issuedAt: Date;
  dueAt: Date;
  paidAt?: Date;
  voidedAt?: Date;
  notes?: string;
  publicTokenHash?: string;
  sentAt?: Date;
  stripeHostedInvoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema(
  {
    type: { type: String, enum: ["SERVICE", "EXTRA", "FEE", "DISCOUNT"], required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    recurrenceGroupId: { type: String, index: true },
    status: { type: String, enum: INVOICE_STATUSES, default: "OPEN", index: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 160 },
      email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
      phone: { type: String, trim: true, maxlength: 50 },
      address: { type: String, trim: true, maxlength: 1000 },
    },
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountRefunded: { type: Number, default: 0, min: 0 },
    amountDue: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    issuedAt: { type: Date, default: Date.now, index: true },
    dueAt: { type: Date, required: true, index: true },
    paidAt: { type: Date },
    voidedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 5000 },
    publicTokenHash: { type: String, select: false, index: true },
    sentAt: { type: Date },
    stripeHostedInvoiceUrl: { type: String },
  },
  { timestamps: true },
);

invoiceSchema.index({ status: 1, dueAt: 1 });
invoiceSchema.index({ customerId: 1, issuedAt: -1 });
invoiceSchema.index({ recurrenceGroupId: 1, issuedAt: 1 });
invoiceSchema.index({ issuedAt: 1, status: 1 });

const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
export default Invoice;
