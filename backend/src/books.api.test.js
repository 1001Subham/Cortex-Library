import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from './app.js';
import { closeDatabasePool } from './config/database.js';

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
  assert.equal(body.pagination.total, 10);
  assert.equal(body.pagination.totalPages, 2);
  assert.ok(body.books[0].title);
  assert.ok(Array.isArray(body.books[0].authors));
  assert.ok(Array.isArray(body.books[0].categories));
  assert.equal(typeof body.books[0].contentAvailable, 'boolean');
});

test('GET /api/books sorts by title by default', async () => {
  const { status, body } = await getJson('/api/books?limit=50');

  assert.equal(status, 200);
  const titles = body.books.map((book) => book.title);
  const sorted = [...titles].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(titles, sorted);
});

test('GET /api/books searches by title', async () => {
  const { status, body } = await getJson('/api/books?q=Sherlock');

  assert.equal(status, 200);
  assert.equal(body.pagination.total, 1);
  assert.equal(body.books[0].title, 'The Adventures of Sherlock Holmes');
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
