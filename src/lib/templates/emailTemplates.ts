const logo = "https://res.cloudinary.com/dr6linfry/image/upload/q_auto/f_auto/v1778514293/logo_fekjaa.jpg";

export const bookingStatusTemplate = (data: {
  name: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  date: string;
  time: string;
  reference: string;
}) => {
  const statusColors: Record<string, string> = {
    PENDING: "#f59e0b",
    CONFIRMED: "#10b981",
    COMPLETED: "#3b82f6",
    CANCELLED: "#ef4444",
  };

  const statusDescriptions: Record<string, string> = {
    PENDING: "is currently being reviewed by our team.",
    CONFIRMED: "has been officially confirmed. See you soon!",
    COMPLETED: "has been marked as completed. We hope you enjoyed our service!",
    CANCELLED: "has been cancelled.",
  };

  const color = statusColors[data.status] || "#1e293b";
  const description = statusDescriptions[data.status] || "status has been updated.";

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <img src="${logo}" alt="BIO Cleaning LLC" style="max-height: 80px; margin-bottom: 10px; border-radius: 8px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 24px;">Booking Update</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">Dear <strong>${data.name}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">
          Your booking <span style="font-weight: bold; color: #1e293b;">${data.reference}</span> ${description}
        </p>
        
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Status:</td>
              <td style="padding: 8px 0; color: ${color}; text-align: right; font-weight: bold;">${data.status}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Time Slot:</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right;">${data.time}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
          If you have any questions, please reply to this email or visit our website.
        </p>
        
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} BIO Cleaning LLC. All rights reserved.</p>
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
        <img src="${logo}" alt="BIO Cleaning LLC" style="max-height: 80px; margin-bottom: 10px; border-radius: 8px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 24px;">Message from BIO Cleaning</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">Dear <strong>${data.name}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">
          Thank you for reaching out to BIO Cleaning LLC. Here is our response to your inquiry:
        </p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 30px 0;">
          <p style="margin: 0; color: #166534; font-size: 16px; line-height: 1.6;">${data.replyMessage}</p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Inquiry:</h4>
          <p style="margin: 0; color: #94a3b8; font-size: 14px; font-style: italic;">"${data.originalMessage}"</p>
        </div>
        
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
          Feel free to reply to this email if you have more questions.
        </p>
        
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} BIO Cleaning LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};
