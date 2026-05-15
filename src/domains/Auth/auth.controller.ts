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

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.status(httpStatus.OK).json(
    response({
      message: "Password reset link sent to email",
      status: "OK",
      statusCode: httpStatus.OK,
    })
  );
});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.query.token as string, req.body.password);
  res.status(httpStatus.OK).json(
    response({
      message: "Password reset successful",
      status: "OK",
      statusCode: httpStatus.OK,
    })
  );
});

const logout = asyncHandler(async (req: Request, res: Response) => {
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
  forgotPassword,
  resetPassword,
};

export default authController;
