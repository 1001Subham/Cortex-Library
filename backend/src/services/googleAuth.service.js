import { OAuth2Client } from 'google-auth-library';
import config from '../config/index.js';
import { HttpError } from '../middleware/httpError.js';

let verifyCredentialImpl = verifyGoogleIdToken;

export function setGoogleCredentialVerifier(fn) {
  verifyCredentialImpl = fn || verifyGoogleIdToken;
}

function createOAuthClient() {
  return new OAuth2Client({
    clientId: config.google.clientId,
    clientSecret: config.google.clientSecret || undefined,
    redirectUri: config.google.redirectUri || undefined,
  });
}

export async function verifyGoogleIdToken(credential) {
  if (!config.google.clientId) {
    throw new HttpError(503, 'Google sign-in is not configured.');
  }

  const client = createOAuthClient();

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    return ticket.getPayload();
  } catch {
    throw new HttpError(401, 'Google sign-in could not be verified.');
  }
}

export async function verifyGoogleIdentity(credential) {
  const payload = await verifyCredentialImpl(credential);

  if (!payload?.sub || !payload.email) {
    throw new HttpError(401, 'Google sign-in could not be verified.');
  }

  if (payload.email_verified !== true) {
    throw new HttpError(401, 'Google account email is not verified.');
  }

  const displayName = typeof payload.name === 'string' ? payload.name.trim() : '';

  return {
    sub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    displayName: displayName ? displayName.slice(0, 120) : null,
  };
}
