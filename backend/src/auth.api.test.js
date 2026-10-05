import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from './app.js';
import config from './config/index.js';
import { closeDatabasePool } from './config/database.js';
import pool from './config/database.js';
import { setGoogleCredentialVerifier } from './services/googleAuth.service.js';

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
  setGoogleCredentialVerifier(null);

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
  assert.equal(raw.includes('google_sub'), false);
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

test('POST /api/auth/register rejects invalid email formats', async () => {
  const password = 'correct-horse-battery';
  const invalid = [
    'abc',
    'abc@',
    '@gmail.com',
    'abc@gmail',
    'abc gmail.com',
    'abc@@gmail.com',
    'abc@.com',
  ];

  for (const email of invalid) {
    const { status, body } = await postJson('/api/auth/register', {
      email,
      password,
    });
    assert.equal(status, 400, email);
    assert.equal(body.message, 'email must be a valid email address.', email);
  }
});

test('POST /api/auth/register trims and lowercases a valid email', async () => {
  const local = `auth-test-case-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stored = `${local}@example.com`;
  createdEmails.push(stored);

  const { status, body } = await postJson('/api/auth/register', {
    email: `  ${local.toUpperCase()}@Example.COM  `,
    password: 'correct-horse-battery',
  });

  assert.equal(status, 201);
  assert.equal(body.user.email, stored);
});

test('POST /api/auth/login rejects invalid email formats', async () => {
  const password = 'correct-horse-battery';
  const invalid = [
    'abc',
    'abc@',
    '@gmail.com',
    'abc@gmail',
    'abc gmail.com',
    'abc@@gmail.com',
    'abc@.com',
  ];

  for (const email of invalid) {
    const { status, body } = await postJson('/api/auth/login', {
      email,
      password,
    });
    assert.equal(status, 400, email);
    assert.equal(body.message, 'email must be a valid email address.', email);
  }
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

test('catalog stays public while reader content requires authentication', async () => {
  const list = await getJson('/api/books?limit=1');
  assert.equal(list.status, 200);
  assert.ok(list.body.books.length >= 1);

  const id = list.body.books[0].id;
  const detail = await getJson(`/api/books/${id}`);
  assert.equal(detail.status, 200);

  const content = await fetch(`${baseUrl}/api/books/${id}/content`);
  const body = await content.json();
  assert.equal(content.status, 401);
  assert.equal(body.message, 'Authentication required.');
});

describe('Google OAuth', { concurrency: false }, () => {
test('POST /api/auth/google verifies identity and issues a Cortex JWT', async () => {
  const email = uniqueEmail('google-new');
  const googleSub = `google-sub-${Date.now()}-new`;

  setGoogleCredentialVerifier(async () => ({
    sub: googleSub,
    email,
    email_verified: true,
    name: 'Ada Lovelace',
  }));

  const { status, body } = await postJson('/api/auth/google', {
    credential: 'verified-google-credential',
  });

  assert.equal(status, 200);
  assert.equal(body.user.email, email);
  assert.equal(body.user.displayName, 'Ada Lovelace');
  assert.equal(body.user.hasGoogle, true);
  assert.ok(body.token);
  assertNoSecretFields(body);

  const me = await getJson('/api/auth/me', {
    Authorization: `Bearer ${body.token}`,
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, body.user.id);

  const wallets = await pool.query(
    'SELECT balance FROM user_token_wallets WHERE user_id = $1',
    [body.user.id]
  );
  assert.equal(wallets.rows.length, 1);
  assert.equal(Number(wallets.rows[0].balance), config.tokens.initialBalance);
});

test('POST /api/auth/google does not create a duplicate user for an existing email', async () => {
  const email = uniqueEmail('google-existing');
  const registered = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });
  assert.equal(registered.status, 201);

  setGoogleCredentialVerifier(async () => ({
    sub: `google-sub-${Date.now()}-existing`,
    email,
    email_verified: true,
  }));

  const google = await postJson('/api/auth/google', {
    credential: 'verified-google-credential',
  });

  assert.equal(google.status, 200);
  assert.equal(google.body.user.id, registered.body.user.id);
  assert.equal(google.body.user.email, email);

  const users = await pool.query('SELECT id FROM users WHERE email = $1', [
    email,
  ]);
  assert.equal(users.rows.length, 1);

  const welcomes = await pool.query(
    `SELECT id FROM token_transactions
     WHERE user_id = $1 AND transaction_type = 'welcome_bonus'`,
    [registered.body.user.id]
  );
  assert.equal(welcomes.rows.length, 1);
});

test('a new Google user receives a wallet exactly once', async () => {
  const email = uniqueEmail('google-wallet-once');
  const googleSub = `google-sub-${Date.now()}-once`;

  setGoogleCredentialVerifier(async () => ({
    sub: googleSub,
    email,
    email_verified: true,
  }));

  const first = await postJson('/api/auth/google', {
    credential: 'verified-google-credential',
  });
  const second = await postJson('/api/auth/google', {
    credential: 'verified-google-credential',
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.user.id, second.body.user.id);

  const wallets = await pool.query(
    'SELECT id FROM user_token_wallets WHERE user_id = $1',
    [first.body.user.id]
  );
  const welcomes = await pool.query(
    `SELECT id FROM token_transactions
     WHERE user_id = $1 AND transaction_type = 'welcome_bonus'`,
    [first.body.user.id]
  );

  assert.equal(wallets.rows.length, 1);
  assert.equal(welcomes.rows.length, 1);
});

test('POST /api/auth/google rejects an unverified identity payload', async () => {
  setGoogleCredentialVerifier(async () => ({
    sub: 'missing-email',
    email_verified: true,
  }));

  const { status, body } = await postJson('/api/auth/google', {
    credential: 'bad-google-credential',
  });

  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('POST /api/auth/google rejects an unverified Google email', async () => {
  setGoogleCredentialVerifier(async () => ({
    sub: `google-sub-${Date.now()}-unverified`,
    email: uniqueEmail('google-unverified'),
    email_verified: false,
  }));

  const { status, body } = await postJson('/api/auth/google', {
    credential: 'unverified-google-credential',
  });

  assert.equal(status, 401);
  assert.match(body.message, /not verified/i);
  assertNoSecretFields(body);
});

test('POST /api/auth/google rejects a missing credential', async () => {
  const { status, body } = await postJson('/api/auth/google', {});
  assert.equal(status, 400);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});
});

test('GET /api/auth/profile returns 401 without a token', async () => {
  const get = await getJson('/api/auth/profile');
  assert.equal(get.status, 401);
  assert.equal(get.body.status, 'error');
  assertNoSecretFields(get.body);

  const put = await putJson('/api/auth/profile', { displayName: 'Ada' });
  assert.equal(put.status, 401);
  assert.equal(put.body.status, 'error');
  assertNoSecretFields(put.body);
});

test('GET /api/auth/profile returns the authenticated user', async () => {
  const email = uniqueEmail('profile-get');
  const registered = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });

  const { status, body } = await getJson('/api/auth/profile', {
    Authorization: `Bearer ${registered.body.token}`,
  });

  assert.equal(status, 200);
  assert.equal(body.user.id, registered.body.user.id);
  assert.equal(body.user.email, email);
  assert.equal(body.user.displayName, null);
  assert.equal(body.user.hasPassword, true);
  assert.equal(body.user.hasGoogle, false);
  assert.ok(body.user.createdAt);
  assert.equal(Object.hasOwn(body, 'token'), false);
  assertNoSecretFields(body);
});

test('PUT /api/auth/profile updates only the authenticated user display name', async () => {
  const ownerEmail = uniqueEmail('profile-owner');
  const otherEmail = uniqueEmail('profile-other');
  const owner = await postJson('/api/auth/register', {
    email: ownerEmail,
    password: 'correct-horse-battery',
  });
  const other = await postJson('/api/auth/register', {
    email: otherEmail,
    password: 'correct-horse-battery',
  });

  const { status, body } = await putJson(
    '/api/auth/profile',
    {
      displayName: '  Ada Lovelace  ',
      user_id: other.body.user.id,
      id: other.body.user.id,
      email: otherEmail,
    },
    owner.body.token
  );

  assert.equal(status, 200);
  assert.equal(body.user.id, owner.body.user.id);
  assert.equal(body.user.email, ownerEmail);
  assert.equal(body.user.displayName, 'Ada Lovelace');
  assert.equal(body.user.hasPassword, true);
  assert.equal(Object.hasOwn(body, 'token'), false);
  assert.equal(JSON.stringify(body).includes(other.body.user.id), false);
  assertNoSecretFields(body);

  const ownerProfile = await getJson('/api/auth/profile', {
    Authorization: `Bearer ${owner.body.token}`,
  });
  assert.equal(ownerProfile.status, 200);
  assert.equal(ownerProfile.body.user.displayName, 'Ada Lovelace');
  assert.equal(ownerProfile.body.user.email, ownerEmail);
  assertNoSecretFields(ownerProfile.body);

  const me = await getJson('/api/auth/me', {
    Authorization: `Bearer ${owner.body.token}`,
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.displayName, 'Ada Lovelace');

  const otherPut = await putJson(
    '/api/auth/profile',
    { displayName: 'Eve Other', user_id: owner.body.user.id },
    other.body.token
  );
  assert.equal(otherPut.status, 200);
  assert.equal(otherPut.body.user.id, other.body.user.id);
  assert.equal(otherPut.body.user.displayName, 'Eve Other');
  assert.equal(otherPut.body.user.email, otherEmail);

  const ownerUnchanged = await getJson('/api/auth/profile', {
    Authorization: `Bearer ${owner.body.token}`,
  });
  assert.equal(ownerUnchanged.body.user.displayName, 'Ada Lovelace');
  assert.equal(ownerUnchanged.body.user.id, owner.body.user.id);

  const otherProfile = await getJson('/api/auth/profile', {
    Authorization: `Bearer ${other.body.token}`,
  });
  assert.equal(otherProfile.status, 200);
  assert.equal(otherProfile.body.user.id, other.body.user.id);
  assert.equal(otherProfile.body.user.displayName, 'Eve Other');
  assert.equal(otherProfile.body.user.email, otherEmail);
});

test('PUT /api/auth/profile rejects invalid display names', async () => {
  const email = uniqueEmail('profile-invalid');
  const registered = await postJson('/api/auth/register', {
    email,
    password: 'correct-horse-battery',
  });
  const token = registered.body.token;

  const missing = await putJson('/api/auth/profile', {}, token);
  assert.equal(missing.status, 400);

  const empty = await putJson('/api/auth/profile', { displayName: '   ' }, token);
  assert.equal(empty.status, 400);

  const notString = await putJson('/api/auth/profile', { displayName: 12 }, token);
  assert.equal(notString.status, 400);

  const tooLong = await putJson(
    '/api/auth/profile',
    { displayName: 'A'.repeat(121) },
    token
  );
  assert.equal(tooLong.status, 400);
  assertNoSecretFields(tooLong.body);

  const unchanged = await getJson('/api/auth/profile', {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(unchanged.body.user.displayName, null);
  assert.equal(unchanged.body.user.email, email);
});
