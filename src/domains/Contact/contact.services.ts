import Contact, { IContact } from "./contact.model";
import { CreateContactInput, ReplyContactInput } from "./contact.validation";
import { NotFoundError } from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import { contactReplyTemplate } from "../../lib/templates/emailTemplates";

const createContact = async (data: CreateContactInput) => {
  const contact = await Contact.create(data);
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

const replyToContact = async (id: string, reply: string) => {
  const contact = await Contact.findByIdAndUpdate(
    id,
    { reply, status: "REPLIED" },
    { new: true }
  );
  if (!contact) {
    throw new NotFoundError("Contact message not found");
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
