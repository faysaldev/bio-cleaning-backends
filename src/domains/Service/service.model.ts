import mongoose, { Schema, Document } from "mongoose";

export type Frequency = "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

export const DEFAULT_MINIMUM_PRICE = 89;
export const DEFAULT_PROPERTY_SIZE_ADJUSTMENTS = [
  { key: "Studio", amount: -30 },
  { key: "1BR", amount: 0 },
  { key: "2BR", amount: 40 },
  { key: "3BR", amount: 85 },
  { key: "4BR+", amount: 140 },
  { key: "Office", amount: 120 },
] as const;
export const DEFAULT_FREQUENCY_DISCOUNTS = [
  { frequency: "ONE_TIME", percent: 0 },
  { frequency: "WEEKLY", percent: 15 },
  { frequency: "BI_WEEKLY", percent: 10 },
  { frequency: "MONTHLY", percent: 5 },
] as const;

export interface IServicePricing {
  minimumPrice: number;
  taxRate: number;
  propertySizeAdjustments: Array<{ key: string; amount: number }>;
  frequencyDiscounts: Array<{ frequency: Frequency; percent: number }>;
  extras: Array<{
    code: string;
    name: string;
    price: number;
    isActive: boolean;
  }>;
  promotions: Array<{
    code: string;
    type: "PERCENT" | "FIXED";
    value: number;
    isActive: boolean;
    startsAt?: Date;
    endsAt?: Date;
  }>;
}

export interface IService extends Document {
  name: string;
  description: string;
  basePrice: number;
  includes: string[];
  image: string;
  isActive: boolean;
  duration: string;
  tags: string[];
  pricing?: IServicePricing;
  createdAt: Date;
  updatedAt: Date;
}

const propertyAdjustmentSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const frequencyDiscountSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: ["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"],
      required: true,
    },
    percent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const extraSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const promotionSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    value: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { _id: false },
);

const defaultPropertyAdjustments = () =>
  DEFAULT_PROPERTY_SIZE_ADJUSTMENTS.map((item) => ({ ...item }));

const defaultFrequencyDiscounts = () =>
  DEFAULT_FREQUENCY_DISCOUNTS.map((item) => ({ ...item }));

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    includes: { type: [String], default: [] },
    image: { type: String, required: true },
    // isActive is now the single source of truth for public visibility/bookability.
    isActive: { type: Boolean, default: true, index: true },
    duration: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    pricing: {
      minimumPrice: { type: Number, default: DEFAULT_MINIMUM_PRICE, min: 0 },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      propertySizeAdjustments: {
        type: [propertyAdjustmentSchema],
        default: defaultPropertyAdjustments,
      },
      frequencyDiscounts: {
        type: [frequencyDiscountSchema],
        default: defaultFrequencyDiscounts,
      },
      extras: { type: [extraSchema], default: [] },
      promotions: { type: [promotionSchema], default: [] },
    },
  },
  { timestamps: true },
);

const Service = mongoose.model<IService>("Service", serviceSchema);
export default Service;
