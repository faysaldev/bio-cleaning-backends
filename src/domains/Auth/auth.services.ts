import crypto from "crypto";
import User, { IUser } from "../Admin-Auth/user.model";
import AuthSession from "./authSession.model";
import { ChangePasswordInput, LoginInput, RegisterInput } from "./auth.validation";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import {
  REFRESH_TOKEN_TTL_DAYS,
  REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS,
} from "../../config/ENV";
import {
  generateCsrfToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/authTokens";

type SessionContext = {
  ipAddress?: string;
  userAgent?: string;
};

const publicUser = (user: IUser) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  image: user.image,
});

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createSession = async (
  user: IUser,
  rememberMe: boolean,
  context: SessionContext,
) => {
  const refreshDays = rememberMe
    ? REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS
    : REFRESH_TOKEN_TTL_DAYS;
  const refreshTtlSeconds = refreshDays * 24 * 60 * 60;
  const csrfToken = generateCsrfToken();

  const session = new AuthSession({
    userId: user._id,
    refreshTokenHash: "pending",
    csrfToken,
    expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent?.slice(0, 500),
  });

  const sessionId = String(session._id);
  const accessToken = signAccessToken({
    userId: String(user._id),
    sessionId,
    role: user.role,
  });
  const refreshToken = signRefreshToken(
    { userId: String(user._id), sessionId },
    refreshTtlSeconds,
  );

  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  return {
    user: publicUser(user),
    csrfToken,
    accessToken,
    refreshToken,
    refreshTtlSeconds,
  };
};

const login = async (data: LoginInput, context: SessionContext) => {
  const user = await User.findOne({ email: data.email, isDeleted: false }).select(
    "+password",
  );
  if (!user || !(await user.isPasswordMatch(data.password))) {
    throw new BadRequestError("Invalid email or password");
  }

  return createSession(user, Boolean(data.rememberMe), context);
};

const register = async (data: RegisterInput, context: SessionContext) => {
  const existing = await User.findOne({ email: data.email, isDeleted: false });
  if (existing) throw new BadRequestError("User already exists");

  // Public registration can never elevate privileges. Admin accounts must be
  // provisioned through a trusted operational process.
  const newUser = await User.create({
    email: data.email,
    password: data.password,
    name: data.name,
    image: data.image,
    role: "user",
  });

  return createSession(newUser, false, context);
};

const refreshSession = async (refreshToken: string, context: SessionContext) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Refresh session is invalid or expired");
  }

  if (decoded.tokenType !== "refresh") {
    throw new UnauthorizedError("Invalid refresh session");
  }

  const session = await AuthSession.findOne({
    _id: decoded.sessionId,
    userId: decoded.userId,
    expiresAt: { $gt: new Date() },
  }).select("+refreshTokenHash +csrfToken");

  if (!session) throw new UnauthorizedError("Session is no longer active");

  const submittedHash = hashToken(refreshToken);
  if (!safeCompare(submittedHash, session.refreshTokenHash)) {
    // A rotated token can arrive late from another browser tab. Reject it, but
    // do not let possession of an old token become a session-revocation DoS.
    throw new UnauthorizedError("Refresh session is no longer current");
  }

  const user = await User.findOne({ _id: decoded.userId, isDeleted: false });
  if (!user) {
    await AuthSession.deleteOne({ _id: session._id });
    throw new UnauthorizedError("User account is no longer active");
  }

  const remainingSeconds = Math.max(
    1,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
  );
  const rotatedRefreshToken = signRefreshToken(
    { userId: String(user._id), sessionId: String(session._id) },
    remainingSeconds,
  );
  const accessToken = signAccessToken({
    userId: String(user._id),
    sessionId: String(session._id),
    role: user.role,
  });

  session.refreshTokenHash = hashToken(rotatedRefreshToken);
  session.ipAddress = context.ipAddress || session.ipAddress;
  session.userAgent = context.userAgent?.slice(0, 500) || session.userAgent;
  await session.save();

  return {
    user: publicUser(user),
    csrfToken: session.csrfToken,
    accessToken,
    refreshToken: rotatedRefreshToken,
    refreshTtlSeconds: remainingSeconds,
  };
};

const getSession = async (userId: string, sessionId: string) => {
  const [user, session] = await Promise.all([
    User.findOne({ _id: userId, isDeleted: false }),
    AuthSession.findOne({ _id: sessionId, userId }).select("+csrfToken"),
  ]);
  if (!user || !session) throw new UnauthorizedError("Session is no longer active");
  return { user: publicUser(user), csrfToken: session.csrfToken };
};

const revokeSession = async (sessionId?: string) => {
  if (sessionId) await AuthSession.deleteOne({ _id: sessionId });
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email, isDeleted: false }).select(
    "+resetPasswordToken +resetPasswordExpires",
  );

  // Always return normally to avoid account enumeration.
  if (!user) return;

  const rawResetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = hashToken(rawResetToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateModifiedOnly: true });

  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
  if (!frontendUrl) throw new Error("FRONTEND_URL must be configured");

  const resetUrl = `${frontendUrl}/admin/reset-password?token=${encodeURIComponent(rawResetToken)}`;
  const message = `A password reset was requested for your BIO Cleaning admin account. The link expires in one hour.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  await sendEmail(user.email, "Password Reset Request", message);
};

const resetPassword = async (rawToken: string, password: string) => {
  if (!rawToken) throw new BadRequestError("Reset token is required");

  const user = await User.findOne({
    resetPasswordToken: hashToken(rawToken),
    resetPasswordExpires: { $gt: new Date() },
    isDeleted: false,
  }).select("+resetPasswordToken +resetPasswordExpires +password");

  if (!user) {
    throw new BadRequestError("Password reset token is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  await AuthSession.deleteMany({ userId: user._id });
};

const changePassword = async (userId: string, data: ChangePasswordInput) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new NotFoundError("User not found");
  if (!(await user.isPasswordMatch(data.oldPassword))) {
    throw new BadRequestError("Invalid old password");
  }

  user.password = data.newPassword;
  await user.save();
  await AuthSession.deleteMany({ userId: user._id });
};

const authService = {
  login,
  register,
  refreshSession,
  getSession,
  revokeSession,
  forgotPassword,
  resetPassword,
  changePassword,
};

export default authService;
