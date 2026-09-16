import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import bookingService from "./booking.services";

const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.createBooking(req.body);
  res.status(httpStatus.CREATED).json(
    response({ message: "Booking created successfully", status: "CREATED", statusCode: httpStatus.CREATED, data: result }),
  );
});


const createAdminBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.createBooking(req.body, { forcePayLater: true });
  res.status(httpStatus.CREATED).json(
    response({ message: "Admin booking created successfully", status: "CREATED", statusCode: httpStatus.CREATED, data: result }),
  );
});

const getQuote = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getQuote(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Booking quote calculated successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getAvailability(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Live availability retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getAllBookings(req.query);
  res.status(httpStatus.OK).json(
    response({ message: "Bookings retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result.bookings, type: result.meta }),
  );
});

const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getBookingById(req.params.id);
  res.status(httpStatus.OK).json(
    response({ message: "Booking retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const getAdminWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getAdminWaitlist(req.query);
  res.status(httpStatus.OK).json(
    response({ message: "Waitlist retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result.entries, type: result.meta }),
  );
});

const getAdminAbandonedBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getAdminAbandonedBookings(req.query);
  res.status(httpStatus.OK).json(
    response({ message: "Booking recovery leads retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result.entries, type: result.meta }),
  );
});

const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.updateBookingStatus(req.params.id, req.body.status);
  res.status(httpStatus.OK).json(
    response({ message: "Booking status updated successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const getBookedSlots = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getBookedSlots(req.query.date as string);
  res.status(httpStatus.OK).json(
    response({ message: "Booked slots retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const joinWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.joinWaitlist(req.body);
  res.status(httpStatus.CREATED).json(
    response({ message: "You have been added to the waitlist", status: "CREATED", statusCode: httpStatus.CREATED, data: result }),
  );
});

const captureAbandonment = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.captureAbandonment(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Booking progress saved", status: "OK", statusCode: httpStatus.OK, data: { sessionId: result.sessionId, state: result.state } }),
  );
});

const getManagedBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getManagedBooking(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Booking retrieved successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const cancelManagedBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.cancelManagedBooking(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Booking cancelled successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const rescheduleManagedBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.rescheduleManagedBooking(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Booking rescheduled successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

const startManagedPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.startManagedPayment(req.body);
  res.status(httpStatus.OK).json(
    response({ message: "Payment checkout prepared successfully", status: "OK", statusCode: httpStatus.OK, data: result }),
  );
});

export default {
  createBooking,
  createAdminBooking,
  getQuote,
  getAvailability,
  getAllBookings,
  getBookingById,
  getAdminWaitlist,
  getAdminAbandonedBookings,
  updateBookingStatus,
  getBookedSlots,
  joinWaitlist,
  captureAbandonment,
  getManagedBooking,
  cancelManagedBooking,
  rescheduleManagedBooking,
  startManagedPayment,
};
