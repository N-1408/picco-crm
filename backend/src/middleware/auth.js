import { verifyToken } from '../utils/jwt.js';

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);
    if (payload.role !== 'admin' && payload.role !== 'super-admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}
