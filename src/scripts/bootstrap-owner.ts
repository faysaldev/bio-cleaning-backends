import mongoose from "mongoose";
import connectDB from "../config/db";
import User from "../domains/Admin-Auth/user.model";
import AuthSession from "../domains/Auth/authSession.model";

const run = async () => {
  const email = String(process.argv[2] || process.env.TEAM_OWNER_EMAIL || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Provide the existing admin email: npm run team:bootstrap-owner -- owner@example.com");
  }

  await connectDB();
  const existingOwner = await User.findOne({ role: "owner", isDeleted: false }).select("email");
  if (existingOwner) {
    if (existingOwner.email.toLowerCase() === email) {
      console.log(`${email} is already the owner. No changes required.`);
      return;
    }
    throw new Error(`An active owner already exists (${existingOwner.email}). Refusing to promote a second owner.`);
  }

  const user = await User.findOne({ email, isDeleted: false });
  if (!user) throw new Error(`No active user exists for ${email}`);
  if (user.role !== "admin") {
    throw new Error(`Owner bootstrap only promotes an existing admin. ${email} currently has role ${user.role}.`);
  }

  user.role = "owner";
  await user.save();
  // Force a fresh access token carrying the new role.
  await AuthSession.deleteMany({ userId: user._id });
  console.log(`Promoted ${email} to owner. Sign in again to create a fresh session.`);
};

run()
  .catch((error) => {
    console.error("Owner bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await mongoose.disconnect(); } catch {}
  });
