import nodemailer from "nodemailer";
import NotificationDelivery from "./notificationDelivery.model";
import {
  EMAIL_PASSWORD,
  EMAIL_USERNAME,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_WORKER_INTERVAL_MS,
  SMS_PROVIDER,
  SMS_WEBHOOK_TOKEN,
  SMS_WEBHOOK_URL,
} from "../../config/ENV";
import { getRedis } from "../../config/redis";
import logger from "../../lib/logger";

let timer: NodeJS.Timeout | undefined;
let running = false;
let emailTransporter: nodemailer.Transporter<any> | undefined;

const getEmailTransporter = () => {
  if (!EMAIL_USERNAME || !EMAIL_PASSWORD) throw new Error("Email credentials are not configured");
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      service: "Gmail",
      auth: { user: EMAIL_USERNAME, pass: EMAIL_PASSWORD },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
  }
  return emailTransporter;
};

const sendEmailNow = async (delivery: any) => {
  await getEmailTransporter().sendMail({
    from: `"BIO Cleaning LLC" <${EMAIL_USERNAME}>`,
    to: delivery.recipient,
    subject: delivery.subject || "BIO Cleaning update",
    text: delivery.text,
    html: delivery.html,
  });
  return "gmail";
};

const sendSmsNow = async (delivery: any) => {
  if (SMS_PROVIDER === "disabled") return "disabled";
  if (SMS_PROVIDER !== "webhook" || !SMS_WEBHOOK_URL) throw new Error("SMS provider is not configured");
  const response = await fetch(SMS_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${SMS_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({ to: delivery.recipient, message: delivery.text }),
  });
  if (!response.ok) throw new Error(`SMS provider returned HTTP ${response.status}`);
  return "webhook";
};

const claimOne = () => NotificationDelivery.findOneAndUpdate(
  {
    $or: [
      { status: { $in: ["QUEUED", "FAILED"] }, nextAttemptAt: { $lte: new Date() }, attempts: { $lt: NOTIFICATION_MAX_ATTEMPTS } },
      { status: "PROCESSING", lockedAt: { $lte: new Date(Date.now() - 10 * 60 * 1000) }, attempts: { $lt: NOTIFICATION_MAX_ATTEMPTS } },
    ],
  },
  { $set: { status: "PROCESSING", lockedAt: new Date() }, $inc: { attempts: 1 } },
  { new: true, sort: { nextAttemptAt: 1, createdAt: 1 } },
);

export const processNotificationQueue = async (limit = 25) => {
  const redis = await getRedis();
  if (redis) {
    try {
      for (let i = 0; i < limit; i += 1) {
        const signal = await redis.rpop("queue:notifications");
        if (!signal) break;
      }
    } catch { /* MongoDB outbox remains the durable source of truth. */ }
  }
  let processed = 0;
  for (let i = 0; i < limit; i += 1) {
    const delivery: any = await claimOne();
    if (!delivery) break;
    try {
      if (delivery.channel === "EMAIL") {
        delivery.provider = await sendEmailNow(delivery);
        delivery.status = "SENT";
      } else {
        delivery.provider = await sendSmsNow(delivery);
        delivery.status = delivery.provider === "disabled" ? "SKIPPED" : "SENT";
      }
      delivery.sentAt = new Date();
      delivery.lastError = undefined;
      delivery.lockedAt = undefined;
      delivery.text = "[delivered]";
      delivery.html = undefined;
    } catch (error: any) {
      delivery.status = "FAILED";
      delivery.lastError = String(error?.message || error).slice(0, 4000);
      const delayMs = Math.min(60 * 60 * 1000, 30_000 * Math.pow(2, Math.max(0, delivery.attempts - 1)));
      delivery.nextAttemptAt = new Date(Date.now() + delayMs);
      delivery.lockedAt = undefined;
    }
    await delivery.save();
    processed += 1;
  }
  return processed;
};

export const startNotificationWorker = () => {
  if (timer || process.env.VERCEL) return;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    processNotificationQueue(20).catch((error) => logger.error("notification_worker_failed", { error })).finally(() => { running = false; });
  }, NOTIFICATION_WORKER_INTERVAL_MS);
  timer.unref?.();
};
