const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
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
  return request('/api/health');
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
  return request(`/api/books${query ? `?${query}` : ''}`);
}

export async function getBook(id) {
  return request(`/api/books/${id}`);
}

export { API_BASE_URL };
