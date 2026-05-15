const logo = "https://res.cloudinary.com/dk3v0m35u/image/upload/q_auto/f_auto/v1776585328/logo-bg_flolyf.png";

export const appointmentStatusTemplate = (data: {
  name: string;
  status: string;
  date: string;
  time: string;
}) => {
  const isConfirmed = data.status.toLowerCase() === "confirmed";
  const color = isConfirmed ? "#10b981" : "#ef4444";
  const statusText = isConfirmed ? "Confirmed" : "Cancelled";
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <img src="${logo}" alt="Bright Smile" style="max-height: 60px; margin-bottom: 10px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 24px;">Appointment Update</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">Dear <strong>${data.name}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">
          Your appointment at Bright Smile Dental Clinic has been <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${statusText}</span>.
        </p>
        
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">Appointment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right;">${data.time}</td>
            </tr>
          </table>
        </div>
        
        ${isConfirmed ? `
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            We look forward to seeing you! Please arrive 10 minutes before your scheduled time.
          </p>
        ` : `
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            If you have any questions or would like to reschedule, please contact us or book a new appointment on our website.
          </p>
        `}
        
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} Bright Smile Dental Clinic. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};

export const contactReplyTemplate = (data: {
  name: string;
  originalMessage: string;
  replyMessage: string;
}) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <img src="${logo}" alt="Bright Smile" style="max-height: 60px; margin-bottom: 10px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 24px;">Message from Bright Smile</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">Dear <strong>${data.name}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">
          Thank you for reaching out to us. Here is our reply to your inquiry:
        </p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 16px; line-height: 1.6;">${data.replyMessage}</p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Original Message:</h4>
          <p style="margin: 0; color: #94a3b8; font-size: 14px; font-style: italic;">"${data.originalMessage}"</p>
        </div>
        
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
          If you have further questions, feel free to reply to this email or call us directly.
        </p>
        
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} Bright Smile Dental Clinic. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};
