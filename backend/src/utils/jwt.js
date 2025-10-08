import jwt from 'jsonwebtoken';
import { getRequiredEnv } from './env.js';

const TOKEN_TTL = '12h';

export function signToken(payload, options = {}) {
  const secret = getRequiredEnv('JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL, ...options });
}

export function verifyToken(token) {
  const secret = getRequiredEnv('JWT_SECRET');
  return jwt.verify(token, secret);
}
