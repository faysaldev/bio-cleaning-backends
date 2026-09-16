import { Response } from "express";
import httpStatus from "http-status";
import { asyncHandler } from "../../lib/errorsHandle";
import { response } from "../../lib/response";
import { ProtectedRequest } from "../../types/protected-request";
import quoteService from "./quote.services";

const create = asyncHandler(async (req: ProtectedRequest,res:Response)=>{const data=await quoteService.createQuote(req.body,req.user?._id);res.status(httpStatus.CREATED).json(response({message:"Estimate created successfully",status:"CREATED",statusCode:httpStatus.CREATED,data}));});
const list = asyncHandler(async (req: ProtectedRequest,res:Response)=>{const result=await quoteService.listQuotes(req.query);res.status(httpStatus.OK).json(response({message:"Estimates retrieved successfully",status:"OK",statusCode:httpStatus.OK,data:result.quotes,type:result.meta}));});
const get = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.getQuote(req.params.id);res.status(httpStatus.OK).json(response({message:"Estimate retrieved successfully",status:"OK",statusCode:httpStatus.OK,data}));});
const update = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.updateQuote(req.params.id,req.body);res.status(httpStatus.OK).json(response({message:"Estimate updated successfully",status:"OK",statusCode:httpStatus.OK,data}));});
const send = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.sendQuote(req.params.id);res.status(httpStatus.OK).json(response({message:"Estimate sent successfully",status:"OK",statusCode:httpStatus.OK,data}));});
const publicGet = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.publicQuote(req.params.token);res.status(httpStatus.OK).json(response({message:"Estimate retrieved successfully",status:"OK",statusCode:httpStatus.OK,data}));});
const publicAccept = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.acceptPublic(req.params.token,req.body);res.status(httpStatus.OK).json(response({message:"Estimate accepted successfully",status:"OK",statusCode:httpStatus.OK,data}));});
const publicDecline = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.declinePublic(req.params.token);res.status(httpStatus.OK).json(response({message:"Estimate declined",status:"OK",statusCode:httpStatus.OK,data}));});
const publicConvert = asyncHandler(async (req:ProtectedRequest,res:Response)=>{const data=await quoteService.convertPublic(req.params.token,req.body);res.status(httpStatus.CREATED).json(response({message:"Booking created from accepted estimate",status:"CREATED",statusCode:httpStatus.CREATED,data}));});
export default { create,list,get,update,send,publicGet,publicAccept,publicDecline,publicConvert };
