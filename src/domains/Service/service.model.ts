import mongoose, { Schema, Document } from "mongoose";

export type Frequency = "ONE_TIME" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
export type PropertyPricingMode = "FIXED" | "BED_BATH" | "SQUARE_FOOTAGE";

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
  propertyPricingMode: PropertyPricingMode;
  includedBedrooms: number;
  includedBathrooms: number;
  additionalBedroomPrice: number;
  additionalBathroomPrice: number;
  additionalBedroomMinutes: number;
  additionalBathroomMinutes: number;
  squareFootageTiers: Array<{
    minSqFt: number;
    maxSqFt?: number;
    priceAdjustment: number;
    durationAdjustmentMinutes: number;
  }>;
  propertySizeAdjustments: Array<{ key: string; amount: number }>;
  frequencyDiscounts: Array<{ frequency: Frequency; percent: number }>;
  extras: Array<{
    code: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes: number;
    additionalStaff: number;
    isActive: boolean;
  }>;
  promotions: Array<{
    code: string;
    type: "PERCENT" | "FIXED";
    value: number;
    isActive: boolean;
    startsAt?: Date;
    endsAt?: Date;
    maxRedemptions?: number;
    redemptionCount?: number;
  }>;
}

export interface IServiceScheduling {
  durationMinutes: number;
  requiredStaff: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  preparationInstructions: string[];
}

export interface IService extends Document {
  name: string;
  slug?: string;
  description: string;
  basePrice: number;
  includes: string[];
  image: string;
  isActive: boolean;
  duration: string;
  tags: string[];
  pricing?: IServicePricing;
  scheduling?: IServiceScheduling;
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

const squareFootageTierSchema = new Schema(
  {
    minSqFt: { type: Number, required: true, min: 0 },
    maxSqFt: { type: Number, min: 0 },
    priceAdjustment: { type: Number, required: true, default: 0 },
    durationAdjustmentMinutes: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const extraSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    additionalStaff: { type: Number, default: 0, min: 0, max: 20 },
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
    maxRedemptions: { type: Number, min: 1 },
    redemptionCount: { type: Number, default: 0, min: 0 },
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
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    description: { type: String, required: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    includes: { type: [String], default: [] },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    // Kept as a human-readable compatibility snapshot for existing UI/content.
    duration: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    pricing: {
      minimumPrice: { type: Number, default: DEFAULT_MINIMUM_PRICE, min: 0 },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      propertyPricingMode: {
        type: String,
        enum: ["FIXED", "BED_BATH", "SQUARE_FOOTAGE"],
        default: "BED_BATH",
      },
      includedBedrooms: { type: Number, default: 1, min: 0, max: 30 },
      includedBathrooms: { type: Number, default: 1, min: 0, max: 30 },
      additionalBedroomPrice: { type: Number, default: 40, min: 0 },
      additionalBathroomPrice: { type: Number, default: 25, min: 0 },
      additionalBedroomMinutes: { type: Number, default: 30, min: 0 },
      additionalBathroomMinutes: { type: Number, default: 20, min: 0 },
      squareFootageTiers: { type: [squareFootageTierSchema], default: [] },
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
    scheduling: {
      durationMinutes: { type: Number, default: 180, min: 15, max: 1440 },
      requiredStaff: { type: Number, default: 1, min: 1, max: 20 },
      bufferBeforeMinutes: { type: Number, default: 0, min: 0, max: 240 },
      bufferAfterMinutes: { type: Number, default: 15, min: 0, max: 240 },
      preparationInstructions: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

serviceSchema.index({ name: 1 });

const Service = mongoose.model<IService>("Service", serviceSchema);
export default Service;
