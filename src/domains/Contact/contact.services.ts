import Contact, { IContact } from "./contact.model";
import { CreateContactInput, ReplyContactInput } from "./contact.validation";
import { NotFoundError } from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import { contactReplyTemplate } from "../../lib/templates/emailTemplates";
import { upsertLeadFromSource } from "../Lead/lead.services";
import LeadActivity from "../Lead/leadActivity.model";
import Lead from "../Lead/lead.model";

const createContact = async (data: CreateContactInput) => {
  const contact = await Contact.create(data);
  try {
    const lead = await upsertLeadFromSource({
      name: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      source: "CONTACT",
      referenceId: String(contact._id),
      requestedServiceName: contact.service,
      message: contact.message,
      contactId: String(contact._id),
    });
    contact.leadId = lead._id as any;
    await contact.save();
  } catch (error) {
    console.error("Failed to sync contact inquiry into lead pipeline:", error);
  }
  return contact;
};

const getAllContacts = async (query: any) => {
  const { page = 1, limit = 10, search, status } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: any = {};

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Contact.countDocuments(filter);

  return {
    contacts,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const replyToContact = async (id: string, reply: string, actorId?: string) => {
  const contact = await Contact.findByIdAndUpdate(
    id,
    { reply, status: "REPLIED" },
    { new: true }
  );
  if (!contact) {
    throw new NotFoundError("Contact message not found");
  }

  if (contact.leadId) {
    try {
      await LeadActivity.create({
        leadId: contact.leadId,
        type: "EMAIL",
        title: `Reply sent: ${contact.service}`,
        body: reply,
        direction: "OUTBOUND",
        createdBy: actorId || undefined,
        occurredAt: new Date(),
      });
      await Lead.updateOne(
        { _id: contact.leadId, status: { $in: ["NEW", "ATTEMPTED_CONTACT"] } },
        { $set: { status: "CONTACTED", lastContactAt: new Date(), lastActivityAt: new Date() } },
      );
    } catch (error) {
      console.error("Failed to record contact reply in CRM timeline:", error);
    }
  }

  // Send email notification
  try {
    const emailHtml = contactReplyTemplate({
      name: contact.fullName,
      originalMessage: contact.message,
      replyMessage: reply,
    });

    await sendEmail(
      contact.email,
      `Re: ${contact.service} - BIO Cleaning LLC`,
      reply,
      emailHtml
    );
  } catch (error) {
    console.error("Failed to send contact reply email:", error);
  }

  return contact;
};

const contactService = {
  createContact,
  getAllContacts,
  replyToContact,
};

export default contactService;
