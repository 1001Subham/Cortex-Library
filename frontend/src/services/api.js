import { getStoredToken } from '../auth/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authorizationHeader(skipAuth) {
  if (skipAuth) {
    return {};
  }

  const token = getStoredToken();

  if (!token) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}

async function parseJsonBody(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const { skipAuth = false, headers: extraHeaders, ...fetchOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authorizationHeader(skipAuth),
      ...extraHeaders,
    },
  });

  const body = await parseJsonBody(response);

  if (!response.ok) {
    const error = new Error(
      body?.message || `Request failed: ${response.status}`
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

export async function getBackendHealth() {
  return request('/api/health', { skipAuth: true });
}

export async function listBooks({ page, limit, q, category, sort } = {}) {
  const params = new URLSearchParams();

  if (page) {
    params.set('page', String(page));
  }
  if (limit) {
    params.set('limit', String(limit));
  }
  if (q) {
    params.set('q', q.slice(0, 200));
  }
  if (category) {
    params.set('category', category);
  }
  if (sort) {
    params.set('sort', sort);
  }

  const query = params.toString();
  return request(`/api/books${query ? `?${query}` : ''}`, { skipAuth: true });
}

export async function getBook(id) {
  return request(`/api/books/${id}`, { skipAuth: true });
}

export async function getBookProgress(id) {
  return request(`/api/books/${id}/progress`);
}

export async function saveBookProgress(id, progressPercent, options = {}) {
  return request(`/api/books/${id}/progress`, {
    method: 'PUT',
    keepalive: Boolean(options.keepalive),
    body: JSON.stringify({ progressPercent }),
  });
}

export async function startReadingSession(id) {
  return request(`/api/books/${id}/reading-sessions/start`, {
    method: 'POST',
    body: '{}',
  });
}

export async function recordReadingVisualCue(id, sessionId, frame) {
  return request(`/api/books/${id}/reading-sessions/${sessionId}/visual-cues`, {
    method: 'POST',
    body: JSON.stringify({ frame }),
  });
}

export async function getReadingVisualCueSummary(id, sessionId) {
  return request(`/api/books/${id}/reading-sessions/${sessionId}/visual-cues`);
}

export async function heartbeatReadingSession(id, elapsedSeconds, options = {}) {
  return request(`/api/books/${id}/reading-sessions/heartbeat`, {
    method: 'POST',
    keepalive: Boolean(options.keepalive),
    body: JSON.stringify({ elapsedSeconds }),
  });
}

export async function stopReadingSession(id, elapsedSeconds, options = {}) {
  return request(`/api/books/${id}/reading-sessions/stop`, {
    method: 'POST',
    keepalive: Boolean(options.keepalive),
    body: JSON.stringify({ elapsedSeconds }),
  });
}

export async function getBookContent(id) {
  const response = await fetch(`${API_BASE_URL}/api/books/${id}/content`, {
    headers: authorizationHeader(false),
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // Keep the status-based message when the body is not JSON.
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.text();
}

export async function registerAccount({ email, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });
}

export async function loginAccount({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithGoogleAccount(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ credential }),
  });
}

export async function getMe() {
  return request('/api/auth/me');
}

export async function getProfile() {
  return request('/api/auth/profile');
}

export async function updateProfile({ displayName }) {
  return request('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ displayName }),
  });
}

export async function getTokens() {
  return request('/api/tokens');
}

export async function getAnalytics() {
  return request('/api/analytics');
}

export async function getRecommendations() {
  return request('/api/recommendations');
}

export async function issueBook(id) {
  return request(`/api/books/${id}/issue`, { method: 'POST', body: '{}' });
}

export async function listLibrary() {
  return request('/api/library');
}

export async function returnIssue(issueId) {
  return request(`/api/library/${issueId}/return`, {
    method: 'POST',
    body: '{}',
  });
}

export { API_BASE_URL };
