import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { validateEmail } from './emailValidation';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar?: string;
  verified?: boolean;
  passwordHash?: string;
  salt?: string;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar?: string;
  verified?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'startupathon-echo-workspace-jwt-secret-key-2026';
const USERS_FILE = path.join(process.cwd(), '.users-db.json');

const USER_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#8b5cf6'];

// In-memory cache + file backing
let usersCache: Map<string, AuthUser> | null = null;

function loadUsers(): Map<string, AuthUser> {
  if (usersCache) return usersCache;
  usersCache = new Map<string, AuthUser>();

  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed: AuthUser[] = JSON.parse(data);
      parsed.forEach((u) => usersCache?.set(u.email.toLowerCase(), u));
    }
  } catch (e) {
    console.warn('Could not read users file, starting with empty store:', e);
  }

  // Pre-seed demo user if empty
  if (usersCache.size === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword('password123', salt);
    const demoUser: AuthUser = {
      id: 'usr-demo-001',
      name: 'Alex Vance',
      email: 'm@example.com',
      color: '#7c3aed',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      verified: true,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };
    usersCache.set(demoUser.email.toLowerCase(), demoUser);
    saveUsers(usersCache);
  }

  return usersCache;
}

function saveUsers(map: Map<string, AuthUser>) {
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save users file:', e);
  }
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function createJWT(user: UserProfile): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      color: user.color,
      avatar: user.avatar,
      verified: user.verified ?? true,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })
  ).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyJWT(token: string): UserProfile | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      color: decoded.color,
      avatar: decoded.avatar,
      verified: Boolean(decoded.verified),
    };
  } catch {
    return null;
  }
}

export function authenticateUser(email: string, password: string): { user: UserProfile; token: string } | null {
  const users = loadUsers();
  const existing = users.get(email.toLowerCase().trim());
  if (!existing || !existing.passwordHash || !existing.salt) return null;

  const testHash = hashPassword(password, existing.salt);
  if (testHash !== existing.passwordHash) return null;

  const profile: UserProfile = {
    id: existing.id,
    name: existing.name,
    email: existing.email,
    color: existing.color,
    avatar: existing.avatar,
    verified: existing.verified ?? true,
  };

  const token = createJWT(profile);
  return { user: profile, token };
}

export function registerUser(name: string, email: string, password: string): { user: UserProfile; token: string } {
  const check = validateEmail(email);
  if (!check.isValid) {
    throw new Error(check.error || 'Invalid email address.');
  }

  const users = loadUsers();
  const cleanEmail = email.toLowerCase().trim();

  if (users.has(cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

  const newUser: AuthUser = {
    id: 'usr-' + crypto.randomBytes(6).toString('hex'),
    name: name.trim() || 'Collaborator',
    email: cleanEmail,
    color,
    verified: true,
    passwordHash,
    salt,
    createdAt: Date.now(),
  };

  users.set(cleanEmail, newUser);
  saveUsers(users);

  const profile: UserProfile = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    color: newUser.color,
    verified: true,
  };

  const token = createJWT(profile);
  return { user: profile, token };
}

export function googleAuthUser(name: string, email: string, avatarUrl?: string, verified = true): { user: UserProfile; token: string } {
  const check = validateEmail(email);
  if (!check.isValid) {
    throw new Error(check.error || 'Invalid Google Account email.');
  }

  const users = loadUsers();
  const cleanEmail = email.toLowerCase().trim();

  let user = users.get(cleanEmail);
  if (!user) {
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    user = {
      id: 'usr-g-' + crypto.randomBytes(6).toString('hex'),
      name: name || 'Google User',
      email: cleanEmail,
      color,
      avatar: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      verified,
      createdAt: Date.now(),
    };
    users.set(cleanEmail, user);
    saveUsers(users);
  } else {
    // Ensure verified is up to date
    user.verified = verified;
    if (avatarUrl) user.avatar = avatarUrl;
    if (name) user.name = name;
    users.set(cleanEmail, user);
    saveUsers(users);
  }

  const profile: UserProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    color: user.color,
    avatar: user.avatar,
    verified: user.verified ?? true,
  };

  const token = createJWT(profile);
  return { user: profile, token };
}
