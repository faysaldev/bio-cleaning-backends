import nodemailer from "nodemailer";
import { EMAIL_PASSWORD, EMAIL_USERNAME } from "../config/ENV";
// Send Email (Using Nodemailer for verification)
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    from: EMAIL_USERNAME,
    auth: {
      user: EMAIL_USERNAME,
      pass: EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Bright Smile Dental Clinic" <${EMAIL_USERNAME}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("Error sending email", error);
    throw new Error("Error sending email");
  }
};
