import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "user";
  image?: string;
  dateOfBirth?: Date;
  isDeleted: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordChangedAt?: Date;
  isPasswordMatch(password: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    image: {
      type: String,
      default:
        "https://res.cloudinary.com/dk3v0m35u/image/upload/q_auto/f_auto/v1778614866/profile_mthun7.png",
    },
    isDeleted: { type: Boolean, default: false },
    resetPasswordToken: { type: String, select: false, index: true },
    resetPasswordExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password!, 12);
    if (!this.isNew) this.passwordChangedAt = new Date();
  }
  next();
});

userSchema.methods.isPasswordMatch = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password!);
};

const User = mongoose.model<IUser>("User", userSchema);
export default User;
