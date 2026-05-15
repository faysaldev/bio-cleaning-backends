import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import User from "./user.model";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { ProtectedRequest } from "../../types/protected-request";
import bcrypt from "bcryptjs";

const getProfile = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const user = await User.findById(req.user!._id);
  res.status(httpStatus.OK).json(
    response({
      message: "Profile retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: user!,
    })
  );
});

const updateProfile = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.user!._id, req.body, { new: true });
  res.status(httpStatus.OK).json(
    response({
      message: "Profile updated successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: user!,
    })
  );
});

const changePassword = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user!._id).select("+password");
  
  if (!user || !(await user.isPasswordMatch(oldPassword))) {
    throw new BadRequestError("Invalid old password");
  }

  user.password = newPassword;
  await user.save();

  res.status(httpStatus.OK).json(
    response({
      message: "Password changed successfully",
      status: "OK",
      statusCode: httpStatus.OK,
    })
  );
});

const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({ isDeleted: false });
  res.status(httpStatus.OK).json(
    response({
      message: "Users retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: users,
    })
  );
});

const userController = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
};

export default userController;
