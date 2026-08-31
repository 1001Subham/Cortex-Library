import { useEffect, useState } from 'react';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function catalogHash() {
  return '#/';
}

export function bookHash(id) {
  return `#/books/${id}`;
}

export function readerHash(id) {
  return `#/books/${id}/read`;
}

export function parseLocationHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';

  if (raw === '/status') {
    return { name: 'status' };
  }

  const readerMatch = raw.match(/^\/books\/([^/]+)\/read\/?$/);

  if (readerMatch && UUID_PATTERN.test(readerMatch[1])) {
    return { name: 'reader', id: readerMatch[1] };
  }

  const match = raw.match(/^\/books\/([^/]+)\/?$/);

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
