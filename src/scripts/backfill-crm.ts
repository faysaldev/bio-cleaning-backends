import mongoose from "mongoose";
import connectionToDb from "../config/db";
import Contact from "../domains/Contact/contact.model";
import Booking from "../domains/Booking/booking.model";
import Customer from "../domains/Customer/customer.model";
import Lead from "../domains/Lead/lead.model";
import LeadActivity from "../domains/Lead/leadActivity.model";
import { convertBookingLead, upsertLeadFromSource } from "../domains/Lead/lead.services";

const asDate = (value: unknown, fallback = new Date()) => {
  const parsed = value instanceof Date ? value : new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const backfillContacts = async () => {
  const contacts = Contact.find({ $or: [{ leadId: { $exists: false } }, { leadId: null }] })
    .sort({ createdAt: 1 })
    .cursor();
  let linked = 0;

  for await (const contact of contacts) {
    const capturedAt = asDate(contact.createdAt);
    const lead = await upsertLeadFromSource({
      name: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      source: "CONTACT",
      referenceId: String(contact._id),
      requestedServiceName: contact.service,
      message: contact.message,
      contactId: String(contact._id),
      capturedAt,
    });

    contact.leadId = lead._id as any;
    await contact.save();
    await Lead.collection.updateOne(
      { _id: lead._id, createdAt: { $gt: capturedAt } },
      { $set: { createdAt: capturedAt } },
    );

    if (contact.status === "REPLIED") {
      const replyAt = asDate(contact.updatedAt, capturedAt);
      await Lead.updateOne(
        { _id: lead._id, status: { $in: ["NEW", "ATTEMPTED_CONTACT"] } },
        { $set: { status: "CONTACTED", lastContactAt: replyAt, lastActivityAt: replyAt } },
      );
      const alreadyRecorded = await LeadActivity.exists({
        leadId: lead._id,
        type: "EMAIL",
        "metadata.backfillContactId": String(contact._id),
      });
      if (!alreadyRecorded) {
        await LeadActivity.create({
          leadId: lead._id,
          type: "EMAIL",
          title: `Historical reply: ${contact.service}`,
          body: contact.reply,
          direction: "OUTBOUND",
          metadata: { backfillContactId: String(contact._id) },
          occurredAt: replyAt,
        });
      }
    }
    linked += 1;
  }
  return linked;
};

const backfillBookings = async () => {
  const bookings = Booking.find({ $or: [{ customerId: { $exists: false } }, { customerId: null }] })
    .sort({ createdAt: 1 })
    .cursor();
  let linked = 0;

  for await (const booking of bookings) {
    const bookingAt = asDate(booking.createdAt);
    const result = await convertBookingLead({
      bookingSessionId: booking.bookingSessionId,
      bookingReference: booking.reference,
      name: booking.customerDetails.name,
      email: booking.customerDetails.email,
      phone: booking.customerDetails.phone,
      address: {
        ...booking.customerDetails.address,
        propertyType: booking.property?.propertyType,
      },
      value: Number(booking.totalAmount || 0),
      occurredAt: bookingAt,
    });

    booking.customerId = result.customer._id as any;
    await booking.save();
    await Customer.collection.updateOne(
      { _id: result.customer._id, createdAt: { $gt: bookingAt } },
      { $set: { createdAt: bookingAt } },
    );
    linked += 1;
  }
  return linked;
};

const main = async () => {
  await connectionToDb();
  const contacts = await backfillContacts();
  const bookings = await backfillBookings();
  console.log(`CRM backfill complete: ${contacts} contacts linked, ${bookings} bookings linked.`);
};

main()
  .catch((error) => {
    console.error("CRM backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
