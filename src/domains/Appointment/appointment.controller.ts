import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import appointmentService from "./appointment.services";
import { NotFoundError, BadRequestError } from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import { appointmentStatusTemplate } from "../../lib/templates/emailTemplates";
import activityLogService from "../ActivityLog/activity-log.services";

const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.query.doctorId as string;
  const date = req.query.date as string;

  if (!doctorId || !date) {
    throw new BadRequestError("doctorId and date are required");
  }

  const availability = await appointmentService.checkAvailability(
    doctorId,
    date,
  );

  res.status(httpStatus.OK).json(
    response({
      message: "Availability retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: availability,
    }),
  );
});

const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.createAppointment(req.body);

  // Log activity
  await activityLogService.createLog({
    action: "CREATE_APPOINTMENT",
    module: "Appointment",
    details: `New appointment booked by ${appointment.patientInfo.name} for ${new Date(appointment.date).toLocaleDateString()}`,
  });

  res.status(httpStatus.CREATED).json(
    response({
      message: "Appointment booked successfully",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: appointment,
    }),
  );
});

const getAllAppointments = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const filters: any = {};
  if (status) filters.status = status;

  const appointments = await appointmentService.getAllAppointments(filters);

  res.status(httpStatus.OK).json(
    response({
      message: "Appointments retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: appointments,
    }),
  );
});

const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const appointment = await appointmentService.updateStatus(id, status);
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  // Send email notification if status is Confirmed or Cancelled
  if (status === "Confirmed" || status === "Cancelled") {
    try {
      const emailHtml = appointmentStatusTemplate({
        name: appointment.patientInfo.name,
        status: status,
        date: new Date(appointment.date).toLocaleDateString(),
        time: appointment.timeSlot,
      });

      await sendEmail(
        appointment.patientInfo.email,
        `Appointment ${status} - Bright Smile Dental Clinic`,
        `Your appointment has been ${status.toLowerCase()}.`,
        emailHtml,
      );
    } catch (error) {
      console.error("Failed to send status update email:", error);
    }
  }

  res.status(httpStatus.OK).json(
    response({
      message: "Appointment status updated successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: appointment,
    }),
  );
});

const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const appointment = await appointmentService.deleteAppointment(id);
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  res.status(httpStatus.OK).json(
    response({
      message: "Appointment deleted successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: appointment,
    }),
  );
});

const appointmentController = {
  getAvailability,
  createAppointment,
  getAllAppointments,
  updateStatus,
  deleteAppointment,
};

export default appointmentController;
