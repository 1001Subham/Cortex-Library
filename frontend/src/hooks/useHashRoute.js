import { useEffect, useState } from 'react';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function catalogHash() {
  return '#/';
}

export function loginHash(next) {
  if (next && isSafeNextPath(next)) {
    return `#/login?next=${encodeURIComponent(next)}`;
  }

  return '#/login';
}

export function registerHash() {
  return '#/register';
}

export function libraryHash() {
  return '#/library';
}

export function analyticsHash() {
  return '#/analytics';
}

export function recommendationsHash() {
  return '#/recommendations';
}

export function profileHash() {
  return '#/profile';
}

export function bookHash(id) {
  return `#/books/${id}`;
}

export function readerHash(id) {
  return `#/books/${id}/read`;
}

export function isSafeNextPath(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (
    value === '/library' ||
    value === '/analytics' ||
    value === '/profile' ||
    value === '/recommendations'
  ) {
    return true;
  }

  const readerMatch = value.match(/^\/books\/([^/]+)\/read\/?$/);

  if (readerMatch && UUID_PATTERN.test(readerMatch[1])) {
    return true;
  }

  const bookMatch = value.match(/^\/books\/([^/]+)\/?$/);
  return Boolean(bookMatch && UUID_PATTERN.test(bookMatch[1]));
}

function parseHashParts() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const queryIndex = raw.indexOf('?');
  const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : raw.slice(queryIndex + 1);
  return { path, params: new URLSearchParams(search) };
}

export function parseLocationHash() {
  const { path, params } = parseHashParts();
  const next = params.get('next');

  if (path === '/status') {
    return { name: 'status' };
  }

  if (path === '/login') {
    return {
      name: 'login',
      next: isSafeNextPath(next) ? next : null,
    };
  }

  if (path === '/register') {
    return { name: 'register' };
  }

  if (path === '/library') {
    return { name: 'library' };
  }

  if (path === '/analytics') {
    return { name: 'analytics' };
  }

  if (path === '/recommendations') {
    return { name: 'recommendations' };
  }

  if (path === '/profile') {
    return { name: 'profile' };
  }

  const readerMatch = path.match(/^\/books\/([^/]+)\/read\/?$/);

  if (readerMatch && UUID_PATTERN.test(readerMatch[1])) {
    return { name: 'reader', id: readerMatch[1] };
  }

  const match = path.match(/^\/books\/([^/]+)\/?$/);

  if (match && UUID_PATTERN.test(match[1])) {
    return { name: 'detail', id: match[1] };
  }

  return { name: 'catalog' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseLocationHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseLocationHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
