/**
 * JWT session storage (browser).
 *
 * Approach: persist the access token in localStorage under AUTH_TOKEN_KEY.
 * On startup, AuthProvider reads the key and calls GET /api/auth/me.
 * A 401 (expired or invalid token) clears the key. Logout also clears it.
 *
 * Why localStorage (not cookies, not sessionStorage):
 * - The SPA talks to the API on another origin (Vite :5173 → backend :3000),
 *   so the backend does not set an httpOnly cookie for this phase.
 * - localStorage survives a full page reload so the session can be restored.
 * - sessionStorage would drop the session when the tab is closed; cookies
 *   would require backend Set-Cookie / CORS credential changes.
 *
 * Limitations: any XSS on this origin can read the token. Do not log or
 * render the token. Passwords are never stored. The user profile is not
 * persisted; it is always loaded from /me.
 */

export const AUTH_TOKEN_KEY = 'cortex.library.accessToken';

export function getStoredToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredToken(token) {
  if (typeof token !== 'string' || token.trim() === '') {
    clearStoredToken();
    return;
  }

  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Private mode or blocked storage; session lasts only in memory.
  }
}

export function clearStoredToken() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage access errors.
  }
}
