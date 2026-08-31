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

  return response.json();
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

export async function getBookContent(id) {
  const response = await fetch(`${API_BASE_URL}/api/books/${id}/content`);

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

export async function getMe() {
  return request('/api/auth/me');
}

export { API_BASE_URL };
