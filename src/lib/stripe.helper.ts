import Stripe from "stripe";
import { STRIPE_SECRET_KEY, FRONTEND_URL } from "../config/ENV";

const stripe = new Stripe(STRIPE_SECRET_KEY);

interface CreatePaymentLinkParams {
  orderId: string;
  amount: number; // Amount in cents
  currency?: string;
  productName: string;
  productDescription?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

interface PaymentLinkResult {
  paymentLinkId: string;
  paymentLinkUrl: string;
  sessionId?: string;
}

/**
 * Create a Stripe Checkout Session for order payment
 */
const createCheckoutSession = async (
  params: CreatePaymentLinkParams,
): Promise<PaymentLinkResult> => {
  const {
    orderId,
    amount,
    currency = "usd",
    productName,
    productDescription,
    customerEmail,
    metadata = {},
  } = params;

  const successUrl = `${FRONTEND_URL || "http://localhost:3000"}/payments/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${FRONTEND_URL || "http://localhost:3000"}/payments/success?orderId=${orderId}`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: productName,
            description: productDescription,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orderId,
      ...metadata,
    },
  };

  if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    paymentLinkId: session.id,
    paymentLinkUrl: session.url as string,
    sessionId: session.id,
  };
};

/**
 * Retrieve a checkout session by ID
 */
const getCheckoutSession = async (
  sessionId: string,
): Promise<Stripe.Checkout.Session> => {
  return await stripe.checkout.sessions.retrieve(sessionId);
};

/**
 * Check if a payment was successful
 */
const isPaymentSuccessful = async (sessionId: string): Promise<boolean> => {
  const session = await getCheckoutSession(sessionId);
  return session.payment_status === "paid";
};

const stripeHelper = {
  createCheckoutSession,
  getCheckoutSession,
  isPaymentSuccessful,
};

export default stripeHelper;
