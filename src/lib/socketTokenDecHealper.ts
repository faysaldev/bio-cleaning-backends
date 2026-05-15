import jwt from "jsonwebtoken";
export const socketHelper = (token: string) => {
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
  const user = {
    _id: decoded.userId,
    role: decoded.role,
    name: decoded.name,
    email: decoded.email,
    password: decoded.password,
    image: decoded.image,
    dateOfBirth: decoded.dateOfBirth,
  };
  return user;
};
