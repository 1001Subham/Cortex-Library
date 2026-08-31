import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from './app.js';
import config from './config/index.js';
import { closeDatabasePool } from './config/database.js';
import pool from './config/database.js';

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const createdEmails = [];

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
  const email = `auth-test-${label}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}@example.com`;
  createdEmails.push(email);
  return email;
}

function assertNoSecretFields(body) {
  const raw = JSON.stringify(body);
  assert.equal(raw.includes('password_hash'), false);
  assert.equal(Object.hasOwn(body, 'password'), false);
  assert.equal(Object.hasOwn(body.user || {}, 'password'), false);
  assert.equal(Object.hasOwn(body.user || {}, 'password_hash'), false);
}

async function postJson(path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function getJson(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = await response.json();
  return { status: response.status, body };
}

test('POST /api/auth/register creates a user and returns a JWT', async () => {
  const email = uniqueEmail('register');
  const { status, body } = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });

  assert.equal(status, 201);
  assert.equal(body.user.email, email);
  assert.ok(body.user.id);
  assert.ok(body.token);
  assertNoSecretFields(body);
});

test('POST /api/auth/register rejects a duplicate email', async () => {
  const email = uniqueEmail('duplicate');
  const payload = { email, password: 'correct-horse-battery' };

  const first = await postJson('/api/auth/register', payload);
  assert.equal(first.status, 201);

  const second = await postJson('/api/auth/register', {
    email: email.toUpperCase(),
    password: 'another-valid-pass',
  });

  assert.equal(second.status, 409);
  assert.equal(second.body.status, 'error');
  assertNoSecretFields(second.body);
});

test('POST /api/auth/register rejects invalid input', async () => {
  const missing = await postJson('/api/auth/register', {});
  assert.equal(missing.status, 400);

  const badEmail = await postJson('/api/auth/register', {
    email: 'not-an-email',
    password: 'correct-horse-battery',
  });
  assert.equal(badEmail.status, 400);

  const shortPassword = await postJson('/api/auth/register', {
    email: uniqueEmail('short'),
    password: 'short',
  });
  assert.equal(shortPassword.status, 400);
});

test('POST /api/auth/login returns a JWT for valid credentials', async () => {
  const email = uniqueEmail('login');
  const password = 'correct-horse-battery';
  const registered = await postJson('/api/auth/register', { email, password });
  assert.equal(registered.status, 201);

  const { status, body } = await postJson('/api/auth/login', { email, password });

  assert.equal(status, 200);
  assert.equal(body.user.email, email);
  assert.ok(body.token);
  assertNoSecretFields(body);
});

test('POST /api/auth/login rejects a wrong password', async () => {
  const email = uniqueEmail('wrong-password');
  await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });

  const { status, body } = await postJson('/api/auth/login', {
    email,
    password: 'definitely-not-the-password',
  });

  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('POST /api/auth/login rejects an unknown email', async () => {
  const { status, body } = await postJson('/api/auth/login', {
    email: uniqueEmail('unknown'),
    password: 'correct-horse-battery',
  });

  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('GET /api/auth/me returns the current user for a valid JWT', async () => {
  const email = uniqueEmail('me');
  const registered = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });

  const { status, body } = await getJson('/api/auth/me', {
    Authorization: `Bearer ${registered.body.token}`,
  });

  assert.equal(status, 200);
  assert.equal(body.user.email, email);
  assert.equal(body.user.id, registered.body.user.id);
  assertNoSecretFields(body);
});

test('GET /api/auth/me rejects a missing token', async () => {
  const { status, body } = await getJson('/api/auth/me');

  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('GET /api/auth/me rejects an invalid JWT', async () => {
  const { status, body } = await getJson('/api/auth/me', {
    Authorization: 'Bearer not-a-valid-token',
  });

  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('GET /api/auth/me rejects an expired JWT', async () => {
  const email = uniqueEmail('expired');
  const registered = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });

  const expiredToken = jwt.sign(
    { sub: registered.body.user.id, email },
    config.jwt.secret,
    { expiresIn: '-1s' }
  );

  const { status, body } = await getJson('/api/auth/me', {
    Authorization: `Bearer ${expiredToken}`,
  });

  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('catalog and reader stay public without a token', async () => {
  const list = await getJson('/api/books?limit=1');
  assert.equal(list.status, 200);
  assert.ok(list.body.books.length >= 1);

  const id = list.body.books[0].id;
  const detail = await getJson(`/api/books/${id}`);
  assert.equal(detail.status, 200);

  const content = await fetch(`${baseUrl}/api/books/${id}/content`);
  assert.equal(content.status, 200);
});
