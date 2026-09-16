import crypto from "crypto";
import FinanceCounter from "./financeCounter.model";

export const money = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
export const hashPublicToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const createPublicToken = () => crypto.randomBytes(32).toString("base64url");

export const nextFinanceNumber = async (kind: "QUOTE" | "INVOICE") => {
  const counter = await FinanceCounter.findByIdAndUpdate(kind, { $inc: { sequence: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const prefix = kind === "QUOTE" ? "Q" : "INV";
  return `${prefix}-${new Date().getUTCFullYear()}-${String(counter.sequence).padStart(6, "0")}`;
};
