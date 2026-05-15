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
  isPasswordMatch(password: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    image: { type: String },
    dateOfBirth: { type: Date },
    isDeleted: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password!, 12);
  }
  next();
});

userSchema.methods.isPasswordMatch = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password!);
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;
