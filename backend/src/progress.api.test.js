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
const MISSING_BOOK_ID = 'b3000000-0000-4000-8000-0000000000ff';

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
  const email = `progress-test-${label}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}@example.com`;
  createdEmails.push(email);
  return email;
}

function assertNoSecretFields(body) {
  const raw = JSON.stringify(body);
  assert.equal(raw.includes('password_hash'), false);
  assert.equal(raw.includes('google_sub'), false);
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

async function issueBook(token, bookId = SEEDED_BOOK_ID) {
  const { status } = await postJson(`/api/books/${bookId}/issue`, {}, token);
  assert.equal(status, 201);
}

test('unauthenticated GET progress returns 401', async () => {
  const { status, body } = await getJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`
  );
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('unauthenticated PUT progress returns 401', async () => {
  const { status, body } = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 12 }
  );
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('user without an active issue cannot use the progress endpoint', async () => {
  const { token } = await registerUser('no-issue');

  const get = await getJson(`/api/books/${SEEDED_BOOK_ID}/progress`, token);
  assert.equal(get.status, 403);
  assert.match(get.body.message, /not in your library/i);

  const put = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 20 },
    token
  );
  assert.equal(put.status, 403);
});

test('returned issue cannot use the progress endpoint', async () => {
  const { token } = await registerUser('returned');
  const issued = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    token
  );
  assert.equal(issued.status, 201);

  await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 33 },
    token
  );

  const returned = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(returned.status, 200);

  const get = await getJson(`/api/books/${SEEDED_BOOK_ID}/progress`, token);
  assert.equal(get.status, 403);

  const put = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 40 },
    token
  );
  assert.equal(put.status, 403);
});

test('authenticated user with issued book can save and retrieve progress', async () => {
  const { token, user } = await registerUser('save');
  await issueBook(token);

  const empty = await getJson(`/api/books/${SEEDED_BOOK_ID}/progress`, token);
  assert.equal(empty.status, 200);
  assert.equal(empty.body.progress.bookId, SEEDED_BOOK_ID);
  assert.equal(empty.body.progress.progressPercent, null);
  assert.equal(empty.body.progress.updatedAt, null);
  assert.equal(Object.hasOwn(empty.body, 'token'), false);
  assert.equal(JSON.stringify(empty.body).includes(user.id), false);
  assertNoSecretFields(empty.body);

  const saved = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    {
      progressPercent: 42.456,
      user_id: '00000000-0000-4000-8000-000000000099',
      id: '00000000-0000-4000-8000-000000000099',
    },
    token
  );

  assert.equal(saved.status, 200);
  assert.equal(saved.body.progress.bookId, SEEDED_BOOK_ID);
  assert.equal(saved.body.progress.progressPercent, 42.46);
  assert.ok(saved.body.progress.updatedAt);
  assert.equal(Object.hasOwn(saved.body, 'token'), false);
  assert.equal(JSON.stringify(saved.body).includes(user.id), false);
  assertNoSecretFields(saved.body);

  const again = await getJson(`/api/books/${SEEDED_BOOK_ID}/progress`, token);
  assert.equal(again.status, 200);
  assert.equal(again.body.progress.progressPercent, 42.46);
  assert.equal(again.body.progress.bookId, SEEDED_BOOK_ID);
});

test('invalid progress values are rejected', async () => {
  const { token } = await registerUser('invalid');
  await issueBook(token);

  const missing = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    {},
    token
  );
  assert.equal(missing.status, 400);

  const notNumber = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: '42' },
    token
  );
  assert.equal(notNumber.status, 400);

  const negative = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: -1 },
    token
  );
  assert.equal(negative.status, 400);

  const tooHigh = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 100.01 },
    token
  );
  assert.equal(tooHigh.status, 400);

  const nan = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: Number.NaN },
    token
  );
  assert.equal(nan.status, 400);

  const unchanged = await getJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    token
  );
  assert.equal(unchanged.body.progress.progressPercent, null);
});

test('another user cannot read or modify saved progress', async () => {
  const owner = await registerUser('owner');
  const other = await registerUser('other');
  await issueBook(owner.token);
  await issueBook(other.token);

  const ownerPut = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 55, user_id: other.user.id },
    owner.token
  );
  assert.equal(ownerPut.status, 200);
  assert.equal(ownerPut.body.progress.progressPercent, 55);

  const otherGet = await getJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    other.token
  );
  assert.equal(otherGet.status, 200);
  assert.equal(otherGet.body.progress.progressPercent, null);

  const otherPut = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 8, user_id: owner.user.id },
    other.token
  );
  assert.equal(otherPut.status, 200);
  assert.equal(otherPut.body.progress.progressPercent, 8);

  const ownerGet = await getJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    owner.token
  );
  assert.equal(ownerGet.status, 200);
  assert.equal(ownerGet.body.progress.progressPercent, 55);

  const otherBook = await putJson(
    `/api/books/${OTHER_SEEDED_BOOK_ID}/progress`,
    { progressPercent: 12 },
    owner.token
  );
  assert.equal(otherBook.status, 403);
});

test('progress requests still require a valid published book', async () => {
  const { token } = await registerUser('missing-book');

  const invalid = await getJson('/api/books/not-a-uuid/progress', token);
  assert.equal(invalid.status, 400);

  const missing = await getJson(
    `/api/books/${MISSING_BOOK_ID}/progress`,
    token
  );
  assert.equal(missing.status, 404);

  const library = await getJson('/api/library', token);
  assert.equal(library.status, 200);
  assert.equal(library.body.issues.length, 0);
});

test('library lists saved progress for the authenticated user only', async () => {
  const { token } = await registerUser('library-progress');
  await issueBook(token);
  await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 18 },
    token
  );

  const { status, body } = await getJson('/api/library', token);
  assert.equal(status, 200);
  assert.equal(body.issues.length, 1);
  assert.equal(body.issues[0].book.id, SEEDED_BOOK_ID);
  assert.equal(body.issues[0].progressPercent, 18);
  assertNoSecretFields(body);
});

test('catalog remains public after progress endpoints are added', async () => {
  const response = await fetch(`${baseUrl}/api/books?limit=1`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.books.length, 1);
});
