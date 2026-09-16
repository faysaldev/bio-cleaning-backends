import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import authService from "./auth.services";
import {
  clearAuthCookies,
  getCookie,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "../../lib/authTokens";
import { ProtectedRequest } from "../../types/protected-request";
import { UnauthorizedError } from "../../lib/errors";

const requestContext = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

const sessionResponse = (result: {
  user: any;
  csrfToken: string;
  accessToken: string;
  refreshToken: string;
  refreshTtlSeconds: number;
}, res: Response) => {
  setAuthCookies(
    res,
    result.accessToken,
    result.refreshToken,
    result.refreshTtlSeconds,
  );
  return { user: result.user, csrfToken: result.csrfToken };
};

const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, requestContext(req));
  const data = sessionResponse(result, res);
  res.status(httpStatus.OK).json(
    response({
      message: "Login successful",
      status: "OK",
      statusCode: httpStatus.OK,
      data,
    }),
  );
});

const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, requestContext(req));
  const data = sessionResponse(result, res);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Register successful",
      status: "CREATED",
      statusCode: httpStatus.CREATED,
      data,
    }),
  );
});

const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
  if (!refreshToken) throw new UnauthorizedError("Refresh session is missing");

  const result = await authService.refreshSession(refreshToken, requestContext(req));
  const data = sessionResponse(result, res);
  res.status(httpStatus.OK).json(
    response({
      message: "Session refreshed",
      status: "OK",
      statusCode: httpStatus.OK,
      data,
    }),
  );
});

const session = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  const result = await authService.getSession(req.user!._id, req.user!.sessionId);
  res.status(httpStatus.OK).json(
    response({
      message: "Session retrieved successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.status(httpStatus.OK).json(
    response({
      message: "If an account exists for that email, a password reset link has been sent.",
      status: "OK",
      statusCode: httpStatus.OK,
    }),
  );
});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.query.token as string, req.body.password);
  clearAuthCookies(res);
  res.status(httpStatus.OK).json(
    response({
      message: "Password reset successful. Please sign in again.",
      status: "OK",
      statusCode: httpStatus.OK,
    }),
  );
});

const logout = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  await authService.revokeSession(req.user?.sessionId);
  clearAuthCookies(res);
  res.status(httpStatus.OK).json(
    response({
      message: "Logout successful",
      status: "OK",
      statusCode: httpStatus.OK,
    }),
  );
});

const changePassword = asyncHandler(async (req: ProtectedRequest, res: Response) => {
  await authService.changePassword(req.user!._id, req.body);
  clearAuthCookies(res);
  res.status(httpStatus.OK).json(
    response({
      message: "Password changed successfully. Please sign in again.",
      status: "OK",
      statusCode: httpStatus.OK,
    }),
  );
});

const authController = {
  login,
  logout,
  register,
  refresh,
  session,
  forgotPassword,
  resetPassword,
  changePassword,
};

export default authController;
