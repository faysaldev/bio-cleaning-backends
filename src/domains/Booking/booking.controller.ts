import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import bookingService from "./booking.services";

const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.createBooking(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Booking created successfully",
      status: "CREATED",
      statusCode: httpStatus.CREATED,
      data: result,
    })
  );
});

const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getAllBookings(req.query);
  res.status(httpStatus.OK).json(
    response({
      message: "Bookings retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result.bookings,
      type: result.meta,
    })
  );
});

const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.getBookingById(req.params.id);
  res.status(httpStatus.OK).json(
    response({
      message: "Booking retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.updateBookingStatus(req.params.id, req.body.status);
  res.status(httpStatus.OK).json(
    response({
      message: "Booking status updated successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const getBookedSlots = asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  const result = await bookingService.getBookedSlots(date);
  res.status(httpStatus.OK).json(
    response({
      message: "Booked slots retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const bookingController = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getBookedSlots,
};

export default bookingController;
