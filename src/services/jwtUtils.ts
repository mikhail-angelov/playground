import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

export const generateToken = (payload: {
  userId: string;
  email: string;
  hasAi: boolean;
}): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: 864000000 });
};

export const verifyToken = (token: string): string | jwt.JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};

export const signToken = (
  payload: jwt.JwtPayload,
  expiresIn: StringValue
): string | jwt.JwtPayload => {
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
  return token;
};
