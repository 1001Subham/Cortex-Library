import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { HttpError } from '../middleware/httpError.js';
import {
  createGoogleUser,
  createUser,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  linkGoogleSub,
  toPublicUser,
  updateUserDisplayName,
} from '../repositories/users.repository.js';
import { verifyGoogleIdentity } from './googleAuth.service.js';
import { ensureWelcomeWallet } from './tokens.service.js';

const BCRYPT_ROUNDS = 10;
const AUTH_FAILED = 'Invalid email or password.';

function requireJwtSecret() {
  const secret = config.jwt.secret;

  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return secret;
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, requireJwtSecret(), {
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, requireJwtSecret());
  } catch {
    throw new HttpError(401, 'Invalid or expired token.');
  }
}

function sessionFor(row) {
  const user = toPublicUser(row);

  return {
    user,
    token: signAccessToken(user),
  };
}

export async function registerUser({ email, password }) {
  const existing = await findUserByEmail(email);

  if (existing) {
    throw new HttpError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password);
  const row = await createUser({ email, passwordHash });
  await ensureWelcomeWallet(row.id);

  return sessionFor(row);
}

export async function loginUser({ email, password }) {
  const row = await findUserByEmail(email);

  if (!row || !row.password_hash) {
    throw new HttpError(401, AUTH_FAILED);
  }

  const matches = await verifyPassword(password, row.password_hash);

  if (!matches) {
    throw new HttpError(401, AUTH_FAILED);
  }

  return sessionFor(row);
}

export async function loginWithGoogle({ credential }) {
  const identity = await verifyGoogleIdentity(credential);
  let row = await findUserByGoogleSub(identity.sub);

  if (!row) {
    const byEmail = await findUserByEmail(identity.email);

    if (byEmail) {
      row = (await linkGoogleSub(byEmail.id, identity.sub)) || byEmail;
    } else {
      try {
        row = await createGoogleUser({
          email: identity.email,
          googleSub: identity.sub,
          displayName: identity.displayName,
        });
      } catch (error) {
        if (error.statusCode === 409) {
          row = await findUserByEmail(identity.email);

          if (!row) {
            throw error;
          }

          row = (await linkGoogleSub(row.id, identity.sub)) || row;
        } else {
          throw error;
        }
      }
    }
  }

  await ensureWelcomeWallet(row.id);
  return sessionFor(row);
}

export async function getAuthenticatedUser(id) {
  const row = await findUserById(id);

  if (!row) {
    throw new HttpError(401, 'Invalid or expired token.');
  }

  return toPublicUser(row);
}

export async function updateAuthenticatedProfile(userId, { displayName }) {
  const row = await updateUserDisplayName(userId, displayName);

  if (!row) {
    throw new HttpError(401, 'Invalid or expired token.');
  }

  return toPublicUser(row);
}
