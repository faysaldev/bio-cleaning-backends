import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import authService from "./auth.services";

const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.status(httpStatus.OK).json(
    response({
      message: "Login successful",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result.user,
      token: result.token,
    }),
  );
});

const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  res.status(httpStatus.OK).json(
    response({
      message: "Register successful",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result.user,
      token: result.token,
    }),
  );
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  // In a typical JWT setup, logout is handled client-side by deleting the token.
  // Optionally, you can blacklist the token in Redis here if implemented.
  res.status(httpStatus.OK).json(
    response({
      message: "Logout successful",
      status: "OK",
      statusCode: httpStatus.OK,
    }),
  );
});

const authController = {
  login,
  logout,
  register,
};

export default authController;
