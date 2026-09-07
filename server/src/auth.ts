import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db, User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'canvasmeet-super-secret-jwt-key-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export const AVATAR_COLORS = [
  '#7c3aed', // Purple
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#16a34a', // Green
  '#d97706', // Amber
  '#dc2626', // Red
  '#db2777', // Pink
  '#9333ea', // Violet
];

export function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { id: string; email: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const user = await db.findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  req.user = user;
  next();
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await db.findUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}
