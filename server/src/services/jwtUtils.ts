import jwt from 'jsonwebtoken';

export const generateToken = (payload: { userId: string; email: string }): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

export const verifyToken = (token: string): string | jwt.JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};