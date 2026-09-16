import { enqueueDelivery } from "../domains/Notification/notification.service";

/**
 * All application email is written to the notification outbox. HTTP request
 * handlers therefore never wait on an SMTP round trip. The worker/cron
 * processor owns retries and provider delivery.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
) => {
  await enqueueDelivery({
    channel: "EMAIL",
    recipient: to,
    subject,
    text,
    html,
  });
};
