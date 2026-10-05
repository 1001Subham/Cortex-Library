import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from './app.js';
import { closeDatabasePool } from './config/database.js';
import pool from './config/database.js';

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const createdEmails = [];
const SEEDED_BOOK_ID = 'b3000000-0000-4000-8000-000000000001';
const OTHER_SEEDED_BOOK_ID = 'b3000000-0000-4000-8000-000000000002';

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
  if (createdEmails.length > 0) {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [
      createdEmails,
    ]);
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabasePool();
});

function uniqueEmail(label) {
  const email = `library-test-${label}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}@example.com`;
  createdEmails.push(email);
  return email;
}

function assertNoSecretFields(body) {
  const raw = JSON.stringify(body);
  assert.equal(raw.includes('password_hash'), false);
  assert.equal(Object.hasOwn(body, 'password'), false);
}

async function postJson(path, payload = {}, token) {
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function getJson(path, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = await response.json();
  return { status: response.status, body };
}

async function putJson(path, payload = {}, token) {
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function registerUser(label) {
  const email = uniqueEmail(label);
  const { status, body } = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });
  assert.equal(status, 201);
  return { email, token: body.token, user: body.user };
}

test('unauthenticated issue returns 401', async () => {
  const { status, body } = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`);
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('authenticated user can issue a published book', async () => {
  const { token, user } = await registerUser('issue');
  const { status, body } = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    token
  );

  assert.equal(status, 201);
  assert.equal(body.issue.status, 'active');
  assert.equal(body.issue.book.id, SEEDED_BOOK_ID);
  assert.equal(body.issue.book.title, "Alice's Adventures in Wonderland");
  assert.ok(body.issue.id);
  assert.ok(body.issue.issuedAt);
  assert.ok(body.issue.dueAt);
  assert.equal(body.issue.returnedAt, null);
  assert.ok(Array.isArray(body.issue.book.authors));
  assert.equal(body.issue.book.authors.length > 0, true);
  assert.equal(body.issue.progressPercent, null);
  assert.equal(JSON.stringify(body).includes(user.id), false);
  assertNoSecretFields(body);
});

test('duplicate active issue returns 409', async () => {
  const { token } = await registerUser('duplicate');
  const first = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(first.status, 201);

  const second = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(second.status, 409);
  assert.equal(second.body.status, 'error');
  assert.equal(second.body.message, 'This book is already in your library.');
});

test('issuing a missing book returns 404', async () => {
  const { token } = await registerUser('missing-book');
  const { status, body } = await postJson(
    '/api/books/00000000-0000-4000-8000-000000000000/issue',
    {},
    token
  );

  assert.equal(status, 404);
  assert.equal(body.message, 'Book not found.');
});

test('issuing with an invalid UUID returns 400', async () => {
  const { token } = await registerUser('bad-uuid');
  const { status, body } = await postJson('/api/books/not-a-uuid/issue', {}, token);

  assert.equal(status, 400);
  assert.equal(body.message, 'Book id must be a valid UUID.');
});

test('GET /api/library returns only the current user issues', async () => {
  const owner = await registerUser('owner');
  const other = await registerUser('other');

  const ownerIssue = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    owner.token
  );
  assert.equal(ownerIssue.status, 201);

  const otherIssue = await postJson(
    `/api/books/${OTHER_SEEDED_BOOK_ID}/issue`,
    {},
    other.token
  );
  assert.equal(otherIssue.status, 201);

  const ownerLibrary = await getJson('/api/library', owner.token);
  assert.equal(ownerLibrary.status, 200);
  assert.equal(ownerLibrary.body.issues.length, 1);
  assert.equal(ownerLibrary.body.issues[0].id, ownerIssue.body.issue.id);
  assert.equal(ownerLibrary.body.issues[0].book.id, SEEDED_BOOK_ID);
  assert.equal(ownerLibrary.body.issues[0].progressPercent, null);
  assert.ok(
    !ownerLibrary.body.issues.some(
      (issue) => issue.id === otherIssue.body.issue.id
    )
  );

  const otherLibrary = await getJson('/api/library', other.token);
  assert.equal(otherLibrary.status, 200);
  assert.equal(otherLibrary.body.issues.length, 1);
  assert.equal(otherLibrary.body.issues[0].id, otherIssue.body.issue.id);
  assert.equal(otherLibrary.body.issues[0].book.id, OTHER_SEEDED_BOOK_ID);
});

test('returning another user issue is not allowed', async () => {
  const owner = await registerUser('return-owner');
  const other = await registerUser('return-other');

  const ownerIssue = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    owner.token
  );
  assert.equal(ownerIssue.status, 201);

  const { status, body } = await postJson(
    `/api/library/${ownerIssue.body.issue.id}/return`,
    {},
    other.token
  );

  assert.equal(status, 404);
  assert.equal(body.message, 'Issue not found.');

  const ownerLibrary = await getJson('/api/library', owner.token);
  assert.equal(ownerLibrary.body.issues[0].status, 'active');
});

test('return active issue succeeds', async () => {
  const { token } = await registerUser('return-active');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const { status, body } = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );

  assert.equal(status, 200);
  assert.equal(body.issue.status, 'returned');
  assert.ok(body.issue.returnedAt);
  assert.equal(body.issue.book.id, SEEDED_BOOK_ID);
});

test('return already-returned issue returns 409', async () => {
  const { token } = await registerUser('return-twice');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  const first = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(first.status, 200);

  const second = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(second.status, 409);
  assert.equal(second.body.message, 'This book has already been returned.');
});

test('a returned book can be issued again', async () => {
  const { token } = await registerUser('reissue');
  const first = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(first.status, 201);

  const returned = await postJson(
    `/api/library/${first.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(returned.status, 200);

  const second = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(second.status, 201);
  assert.equal(second.body.issue.status, 'active');
  assert.notEqual(second.body.issue.id, first.body.issue.id);
});

test('catalog remains public without a token', async () => {
  const list = await getJson('/api/books?limit=1');
  assert.equal(list.status, 200);
  assert.ok(list.body.books.length >= 1);

  const detail = await getJson(`/api/books/${list.body.books[0].id}`);
  assert.equal(detail.status, 200);
});

async function getContent(bookId, token, query = '') {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const suffix = query ? `?${query}` : '';
  return fetch(`${baseUrl}/api/books/${bookId}/content${suffix}`, { headers });
}

test('unauthenticated reader content returns 401', async () => {
  const response = await getContent(SEEDED_BOOK_ID);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.message, 'Authentication required.');
});

test('authenticated unissued reader content returns 403', async () => {
  const { token } = await registerUser('reader-unissued');
  const response = await getContent(SEEDED_BOOK_ID, token);
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.message, 'This book is not in your library.');
});

test('issued user can read stored HTML', async () => {
  const { token } = await registerUser('reader-issued');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const response = await getContent(
    SEEDED_BOOK_ID,
    token,
    'user_id=00000000-0000-4000-8000-000000000099'
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(html, /Alice's Adventures in Wonderland/);
  assert.match(html, /Down the Rabbit-Hole/);
  assert.doesNotMatch(html, /root:/);
});

test('returned book cannot be read', async () => {
  const { token } = await registerUser('reader-returned');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const returned = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(returned.status, 200);

  const response = await getContent(SEEDED_BOOK_ID, token);
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.message, 'This book is not in your library.');
});

test("another user's issue cannot authorize reading", async () => {
  const owner = await registerUser('reader-owner');
  const other = await registerUser('reader-other');
  const issued = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    owner.token
  );
  assert.equal(issued.status, 201);

  const response = await getContent(SEEDED_BOOK_ID, other.token);
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.message, 'This book is not in your library.');
});

test('authenticated content requests still validate the book id', async () => {
  const { token } = await registerUser('reader-bad-id');
  const invalid = await getJson('/api/books/not-a-uuid/content', token);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.message, 'Book id must be a valid UUID.');

  const missing = await getContent(
    '00000000-0000-4000-8000-000000000000',
    token
  );
  const body = await missing.json();
  assert.equal(missing.status, 404);
  assert.equal(body.message, 'Book not found.');
});

test('unauthenticated return returns 401', async () => {
  const { status, body } = await postJson(
    '/api/library/00000000-0000-4000-8000-000000000000/return'
  );
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
});

test('returning with an invalid UUID returns 400', async () => {
  const { token } = await registerUser('return-bad-uuid');
  const { status, body } = await postJson(
    '/api/library/not-a-uuid/return',
    {},
    token
  );

  assert.equal(status, 400);
  assert.equal(body.message, 'Issue id must be a valid UUID.');
});

test('returning a missing issue returns 404', async () => {
  const { token } = await registerUser('return-missing');
  const { status, body } = await postJson(
    '/api/library/00000000-0000-4000-8000-000000000000/return',
    {},
    token
  );

  assert.equal(status, 404);
  assert.equal(body.message, 'Issue not found.');
});

test('GET /api/library requires authentication', async () => {
  const { status, body } = await getJson('/api/library');
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
});

test('GET /api/library returns saved reading progress for the owner only', async () => {
  const owner = await registerUser('library-progress-owner');
  const other = await registerUser('library-progress-other');

  const ownerIssue = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    owner.token
  );
  assert.equal(ownerIssue.status, 201);
  assert.equal(ownerIssue.body.issue.progressPercent, null);

  const otherIssue = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    other.token
  );
  assert.equal(otherIssue.status, 201);

  const saved = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 42, user_id: other.user.id },
    owner.token
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.progress.progressPercent, 42);

  const first = await getJson('/api/library', owner.token);
  assert.equal(first.status, 200);
  assert.equal(first.body.issues[0].progressPercent, 42);

  const again = await getJson('/api/library', owner.token);
  assert.equal(again.status, 200);
  assert.equal(again.body.issues[0].progressPercent, 42);

  const otherLibrary = await getJson('/api/library', other.token);
  assert.equal(otherLibrary.status, 200);
  assert.equal(otherLibrary.body.issues[0].progressPercent, null);
});
