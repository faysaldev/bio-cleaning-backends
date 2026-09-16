import mongoose, { Schema, Types } from "mongoose";

interface IBookingSlot {
  _id: string;
  bookingId: Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSlotSchema = new Schema<IBookingSlot>(
  {
    _id: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, required: true, index: true },
    // Temporary reservations self-clean if the process fails before a booking saves.
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

bookingSlotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BookingSlot = mongoose.model<IBookingSlot>("BookingSlot", bookingSlotSchema);
export default BookingSlot;
