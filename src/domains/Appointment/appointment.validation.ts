import { z } from "zod";

const patientInfoSchema = z.object({
  name: z.string().min(1, "Patient name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  isNewPatient: z.boolean(),
  notes: z.string().optional(),
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  timeSlot: z.string().min(1, "Time slot is required"),
  patientInfo: patientInfoSchema,
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Cancelled", "Completed"]),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
