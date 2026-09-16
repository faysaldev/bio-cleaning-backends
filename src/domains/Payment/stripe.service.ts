import crypto from "crypto";
import { FRONTEND_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../../config/ENV";
import { BadRequestError, ServiceUnavailableError } from "../../lib/errors";
import Booking from "../Booking/booking.model";

const encodeForm = (values: Record<string, string | number | undefined>) => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, String(value));
  }
  return body;
};

export const createStripeCheckoutSession = async ({
  reference,
  recurrenceGroupId,
  customerEmail,
  amount,
  currency,
  idempotencyKey,
}: {
  reference: string;
  recurrenceGroupId?: string;
  customerEmail: string;
  amount: number;
  currency: string;
  idempotencyKey?: string;
}) => {
  if (!STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableError("Online deposit payments are not configured yet");
  }
  if (!FRONTEND_URL) {
    throw new ServiceUnavailableError("Frontend URL is not configured for payment return links");
  }
  const cents = Math.round(amount * 100);
  if (cents <= 0) throw new BadRequestError("Deposit amount must be greater than zero");

  const successUrl = `${FRONTEND_URL.replace(/\/$/, "")}/book?payment=success&reference=${encodeURIComponent(reference)}`;
  const cancelUrl = `${FRONTEND_URL.replace(/\/$/, "")}/book?payment=cancelled&reference=${encodeURIComponent(reference)}`;
  const body = encodeForm({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": cents,
    "line_items[0][price_data][product_data][name]": `BIO Cleaning deposit - ${reference}`,
    "metadata[bookingReference]": reference,
    "metadata[recurrenceGroupId]": recurrenceGroupId,
  });

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey.slice(0, 255) } : {}),
    },
    body,
  });
  const payload: any = await stripeResponse.json();
  if (!stripeResponse.ok || !payload?.url || !payload?.id) {
    console.error("Stripe checkout session creation failed", payload);
    throw new ServiceUnavailableError("Unable to start the secure deposit checkout right now");
  }
  return { id: payload.id as string, url: payload.url as string };
};

const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const verifyStripeSignature = (rawBody: Buffer, signatureHeader?: string) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new ServiceUnavailableError("Stripe webhook secret is not configured");
  }
  if (!signatureHeader) throw new BadRequestError("Missing Stripe-Signature header");
  const pieces = signatureHeader.split(",").map((piece) => piece.trim());
  const timestamp = pieces.find((piece) => piece.startsWith("t="))?.slice(2);
  const signatures = pieces.filter((piece) => piece.startsWith("v1=")).map((piece) => piece.slice(3));
  if (!timestamp || signatures.length === 0) throw new BadRequestError("Invalid Stripe signature header");

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
    throw new BadRequestError("Stripe webhook signature is outside the allowed time window");
  }

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");
  if (!signatures.some((signature) => safeEqual(expected, signature))) {
    throw new BadRequestError("Stripe webhook signature verification failed");
  }
};

export const processStripeEvent = async (event: any) => {
  const type = event?.type;
  const session = event?.data?.object;
  if (!session || !["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(type)) {
    return;
  }

  const reference = session.metadata?.bookingReference;
  const recurrenceGroupId = session.metadata?.recurrenceGroupId;
  if (!reference && !recurrenceGroupId) return;

  const filter = recurrenceGroupId ? { recurrenceGroupId } : { reference };
  if (type === "checkout.session.async_payment_failed" || type === "checkout.session.expired") {
    await Booking.updateMany(filter, {
      $set: { "payment.status": "FAILED", "payment.checkoutSessionId": session.id },
      $unset: { "payment.checkoutUrl": "" },
    });
    return;
  }

  if (session.payment_status === "paid" || type === "checkout.session.async_payment_succeeded") {
    await Booking.updateMany(filter, {
      $set: {
        "payment.status": "PAID",
        "payment.checkoutSessionId": session.id,
        "payment.paidAt": new Date(),
      },
      $unset: { "payment.checkoutUrl": "" },
    });
  }
};
