import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import contactService from "./contact.services";
import { sendEmail } from "../../lib/mail.service";

const createContact = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactService.createContact(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Contact message sent successfully",
      status: "CREATED",
      statusCode: httpStatus.CREATED,
      data: result,
    }),
  );
});

const getAllContacts = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactService.getAllContacts(req.query);
  res.status(httpStatus.OK).json(
    response({
      message: "Contact messages retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result.contacts,
      type: result.meta,
    }),
  );
});

const replyToContact = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactService.replyToContact(
    req.params.id,
    req.body.reply,
  );

  console.log("🚀 ~ replyToContact ~ result:", result);
  res.status(httpStatus.OK).json(
    response({
      message: "Reply sent successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const contactController = {
  createContact,
  getAllContacts,
  replyToContact,
};

export default contactController;
