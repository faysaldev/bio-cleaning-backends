import Appointment from "./appointment.model";
import {
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointment.validation";
import mongoose from "mongoose";

const checkAvailability = async (doctorId: string, date: string) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await Appointment.find({
    doctorId: new mongoose.Types.ObjectId(doctorId),
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: "Cancelled" },
  }).select("timeSlot");

  const bookedSlots = bookings.map((b) => b.timeSlot);

  // Define full schedule from 9 AM to 6 PM (30-minute slots)
  const allSlots = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
    "05:00 PM",
    "05:30 PM",
  ];

  const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

  return {
    bookedSlots,
    availableSlots,
    allSlots,
  };
};

const createAppointment = async (data: CreateAppointmentInput) => {
  return await Appointment.create({
    ...data,
    serviceId: new mongoose.Types.ObjectId(data.serviceId),
    doctorId: new mongoose.Types.ObjectId(data.doctorId),
    date: new Date(data.date),
  });
};

const getAllAppointments = async (filters: any = {}) => {
  return await Appointment.find(filters)
    .populate("serviceId", "title")
    .populate("doctorId", "name")
    .sort({ date: -1 })
    .lean();
};

const updateStatus = async (id: string, status: string) => {
  return await Appointment.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  ).lean();
};

const deleteAppointment = async (id: string) => {
  const appointment = await Appointment.findByIdAndDelete(id).lean();
  return appointment;
};

const appointmentService = {
  checkAvailability,
  createAppointment,
  getAllAppointments,
  updateStatus,
  deleteAppointment,
};

export default appointmentService;
