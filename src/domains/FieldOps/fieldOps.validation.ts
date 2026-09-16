import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const assignJobSchema = z.object({
  staffIds: z.array(objectId).max(30).optional().default([]),
  crewId: objectId.nullable().optional(),
});

export const updateJobStatusSchema = z.object({
  status: z.enum(["SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "ISSUE", "COMPLETED", "CANCELLED"]),
});

export const updateChecklistSchema = z.object({
  key: z.string().trim().min(1).max(120),
  completed: z.boolean(),
});

export const addPhotoSchema = z.object({
  type: z.enum(["BEFORE", "AFTER", "ISSUE"]),
  url: z.string().url().max(2048),
  caption: z.string().trim().max(500).optional(),
});

export const addInternalNoteSchema = z.object({
  text: z.string().trim().min(1).max(3000),
});

export const reportIssueSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const resolveIssueSchema = z.object({
  resolution: z.string().trim().min(1).max(3000),
});
