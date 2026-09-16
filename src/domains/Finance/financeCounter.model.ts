import mongoose, { Document, Schema } from "mongoose";

export interface IFinanceCounter extends Document {
  sequence: number;
}

const financeCounterSchema = new Schema<IFinanceCounter>({
  sequence: { type: Number, default: 0, min: 0 },
});

const FinanceCounter = mongoose.model<IFinanceCounter>("FinanceCounter", financeCounterSchema);
export default FinanceCounter;
