import { NextFunction, Request, Response } from "express";
import { processStripeEvent, verifyStripeSignature } from "./stripe.service";

export const stripeWebhookHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
    verifyStripeSignature(rawBody, req.header("Stripe-Signature"));
    const event = JSON.parse(rawBody.toString("utf8"));
    await processStripeEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};
