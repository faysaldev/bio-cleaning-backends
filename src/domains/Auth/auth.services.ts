import jwt from "jsonwebtoken";
import User from "../Admin-Auth/user.model";
import { LoginInput } from "./auth.validation";
import { BadRequestError, NotFoundError } from "../../lib/errors";

const login = async (data: LoginInput) => {
  const { email, password } = data;

  const user = await User.findOne({ email, isDeleted: false });
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
      image: user.image,
      dateOfBirth: user.dateOfBirth,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token,
  };
};

const register = async (data: LoginInput) => {
  const { email, password } = data;

  const user = await User.findOne({ email, isDeleted: false });
  if (user) {
    throw new BadRequestError("User already exists");
  }

  const newUser = await User.create({
    email,
    password,
    role: "user",
  });

  const token = jwt.sign(
    {
      userId: newUser._id,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      image: newUser.image,
      dateOfBirth: newUser.dateOfBirth,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return {
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    },
    token,
  };
};

const authService = {
  login,
  register,
};

export default authService;
