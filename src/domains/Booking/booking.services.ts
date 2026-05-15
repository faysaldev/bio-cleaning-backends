import Booking, { IBooking } from "./booking.model";
import { CreateBookingInput } from "./booking.validation";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import { bookingStatusTemplate } from "../../lib/templates/emailTemplates";

const createBooking = async (data: CreateBookingInput) => {
  // Check if timeslot is already booked for that date
  const existingBooking = await Booking.findOne({
    date: new Date(data.date),
    timeSlot: data.timeSlot,
    status: { $in: ["PENDING", "CONFIRMED", "COMPLETED"] },
  });

  if (existingBooking) {
    throw new BadRequestError("This time slot is already booked for the selected date.");
  }

  // Generate reference BIO-XXXXX
  const count = await Booking.countDocuments();
  const reference = `BIO-${10000 + count + 1}`;

  const booking = await Booking.create({
    ...data,
    reference,
    date: new Date(data.date),
  });

  return booking;
};

const getAllBookings = async (query: any) => {
  const { page = 1, limit = 10, search, status } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: any = {};

  if (search) {
    filter.$or = [
      { reference: { $regex: search, $options: "i" } },
      { "customerDetails.name": { $regex: search, $options: "i" } },
      { "customerDetails.email": { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Booking.countDocuments(filter);

  return {
    bookings,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getBookingById = async (id: string) => {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  return booking;
};

const updateBookingStatus = async (id: string, status: any) => {
  const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  // Send email notification
  try {
    const emailHtml = bookingStatusTemplate({
      name: booking.customerDetails.name,
      status: booking.status as any,
      date: new Date(booking.date).toLocaleDateString(),
      time: booking.timeSlot,
      reference: booking.reference,
    });

    await sendEmail(
      booking.customerDetails.email,
      `Booking Update: ${booking.reference} is now ${booking.status}`,
      `Your booking ${booking.reference} status has been updated to ${booking.status}.`,
      emailHtml
    );
  } catch (error) {
    console.error("Failed to send booking status email:", error);
  }

  return booking;
};

const getBookedSlots = async (date: string) => {
  const bookings = await Booking.find({
    date: new Date(date),
    status: { $in: ["PENDING", "CONFIRMED", "COMPLETED"] },
  }).select("timeSlot");
  
  return bookings.map(b => b.timeSlot);
};

const bookingService = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getBookedSlots,
};

export default bookingService;
