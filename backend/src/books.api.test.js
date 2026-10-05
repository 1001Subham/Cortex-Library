import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import app from './app.js';
import pool, { closeDatabasePool } from './config/database.js';
import { resolveHtmlContentPath } from './services/bookContent.service.js';

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

before(async () => {
  await new Promise((resolve) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once('listening', resolve);
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabasePool();
});

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { status: response.status, body };
}

test('GET /api/books returns paginated published catalog', async () => {
  const { status, body } = await getJson('/api/books?page=1&limit=5');

  assert.equal(status, 200);
  assert.equal(body.books.length, 5);
  assert.equal(body.pagination.page, 1);
  assert.equal(body.pagination.limit, 5);
  assert.ok(body.pagination.total >= 10);
  assert.equal(body.pagination.totalPages, Math.ceil(body.pagination.total / 5));
  assert.ok(body.books[0].title);
  assert.ok(Array.isArray(body.books[0].authors));
  assert.ok(Array.isArray(body.books[0].categories));
  assert.equal(typeof body.books[0].contentAvailable, 'boolean');
});

test('GET /api/books sorts by title by default', async () => {
  const { status, body } = await getJson('/api/books?limit=50');

  assert.equal(status, 200);
  const titles = body.books.map((book) => book.title);
  const expected = await pool.query(
    `SELECT title FROM books
     WHERE status='published'
     ORDER BY title ASC, id ASC
     LIMIT 50`
  );
  assert.deepEqual(titles, expected.rows.map((book) => book.title));
});

test('GET /api/books searches by title', async () => {
  const { status, body } = await getJson('/api/books?q=Sherlock');

  assert.equal(status, 200);
  assert.ok(body.pagination.total >= 1);
  assert.ok(body.books.some((book) => book.title === 'The Adventures of Sherlock Holmes'));
});

test('GET /api/books filters by category including descendants', async () => {
  const { status, body } = await getJson('/api/books?category=fiction&limit=50');

  assert.equal(status, 200);
  assert.ok(body.pagination.total >= 1);
  assert.ok(
    body.books.some((book) => book.title === 'The Time Machine')
  );
});

test('GET /api/books rejects invalid query params', async () => {
  const { status, body } = await getJson('/api/books?page=0');

  assert.equal(status, 400);
  assert.equal(body.status, 'error');
});

test('GET /api/books/:id returns authors, categories, and content', async () => {
  const id = 'b3000000-0000-4000-8000-000000000001';
  const { status, body } = await getJson(`/api/books/${id}`);

  assert.equal(status, 200);
  assert.equal(body.title, "Alice's Adventures in Wonderland");
  assert.equal(body.authors[0].displayName, 'Lewis Carroll');
  assert.ok(body.categories.length >= 1);
  assert.equal(body.content.available, true);
  assert.equal(body.content.format, 'html');
});

test('GET /api/books/:id returns 400 for an invalid UUID', async () => {
  const { status, body } = await getJson('/api/books/not-a-uuid');

  assert.equal(status, 400);
  assert.equal(body.message, 'Book id must be a valid UUID.');
});

test('GET /api/books/:id returns 404 for a missing book', async () => {
  const { status, body } = await getJson(
    '/api/books/00000000-0000-4000-8000-000000000000'
  );

  assert.equal(status, 404);
  assert.equal(body.message, 'Book not found.');
});

test('GET /api/books/:id/content returns 401 without a token', async () => {
  const id = 'b3000000-0000-4000-8000-000000000001';
  const response = await fetch(`${baseUrl}/api/books/${id}/content`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.message, 'Authentication required.');
});

test('GET /api/books/:id/content returns 401 for an invalid UUID without a token', async () => {
  const { status, body } = await getJson('/api/books/not-a-uuid/content');

  assert.equal(status, 401);
  assert.equal(body.message, 'Authentication required.');
});

test('GET /api/books/:id/content returns 401 for a missing book without a token', async () => {
  const { status, body } = await getJson(
    '/api/books/00000000-0000-4000-8000-000000000000/content'
  );

  assert.equal(status, 401);
  assert.equal(body.message, 'Authentication required.');
});

test('resolveHtmlContentPath only allows the book HTML key from storage', () => {
  const id = 'b3000000-0000-4000-8000-000000000001';
  const storageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../storage'
  );
  const resolved = resolveHtmlContentPath(
    id,
    `storage/books/${id}/content.html`,
    storageRoot
  );

  assert.equal(
    path.normalize(resolved),
    path.normalize(path.join(storageRoot, 'books', id, 'content.html'))
  );

  assert.throws(
    () =>
      resolveHtmlContentPath(
        id,
        'storage/books/b3000000-0000-4000-8000-000000000002/content.html',
        storageRoot
      ),
    { statusCode: 404 }
  );
  assert.throws(
    () =>
      resolveHtmlContentPath(id, 'storage/books/' + id + '/../cover.svg', storageRoot),
    { statusCode: 404 }
  );
  assert.throws(
    () => resolveHtmlContentPath(id, '/etc/passwd', storageRoot),
    { statusCode: 404 }
  );
});
