import mongoose, { Schema } from "mongoose";

interface IBookingCounter {
  _id: string;
  sequence: number;
}

const bookingCounterSchema = new Schema<IBookingCounter>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const BookingCounter = mongoose.model<IBookingCounter>(
  "BookingCounter",
  bookingCounterSchema,
);
export default BookingCounter;
