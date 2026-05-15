import jwt from "jsonwebtoken";
import User from "../Admin-Auth/user.model";
import { LoginInput } from "./auth.validation";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import crypto from "crypto";
import { sendEmail } from "../../lib/mail.service";

const login = async (data: LoginInput) => {
  const { email, password } = data;

  const user = await User.findOne({ email, isDeleted: false }).select("+password");
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isMatch = await user.isPasswordMatch(password);
  if (!isMatch) {
    throw new BadRequestError("Invalid password");
  }

  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

const register = async (data: any) => {
  const { email, password, name } = data;

  const user = await User.findOne({ email, isDeleted: false });
  if (user) {
    throw new BadRequestError("User already exists");
  }

  const newUser = await User.create({
    email,
    password,
    name,
    role: "admin", // Default to admin for this project as per request
  });

  const token = jwt.sign(
    {
      userId: newUser._id,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return {
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
    token,
  };
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const message = `You are receiving this email because you (or someone else) have requested the reset of a password. \n\n Please click on the following link, or paste this into your browser to complete the process:\n\n ${resetUrl}`;

  await sendEmail(user.email, "Password Reset Request", message);
};

const resetPassword = async (token: string, password: string) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError("Password reset token is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();
};

const authService = {
  login,
  register,
  forgotPassword,
  resetPassword,
};

export default authService;
