import { z } from "zod";
export const invoicePaymentSchema=z.object({});
export const refundSchema=z.object({amount:z.number().positive().max(100_000_000)});
export const manualPaymentSchema=z.object({amount:z.number().positive().max(100_000_000),note:z.string().trim().max(1000).optional()});
export const updateInvoiceSchema=z.object({dueAt:z.string().datetime({offset:true}).optional(),notes:z.string().trim().max(5000).optional()});
