import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import dashboardService from "./dashboard.services";

const getStats = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getStats();
  res.status(httpStatus.OK).json(
    response({
      message: "Dashboard stats retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const getRecentBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getRecentBookings();
  res.status(httpStatus.OK).json(
    response({
      message: "Recent bookings retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const dashboardController = {
  getStats,
  getRecentBookings,
};

export default dashboardController;
