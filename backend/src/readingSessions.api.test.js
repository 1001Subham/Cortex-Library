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
  const email = `session-test-${label}-${Date.now()}-${Math.random()
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

test('unauthenticated reading session requests return 401', async () => {
  const start = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`
  );
  assert.equal(start.status, 401);

  const heartbeat = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 10 }
  );
  assert.equal(heartbeat.status, 401);

  const stop = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 10 }
  );
  assert.equal(stop.status, 401);
  assertNoSecretFields(stop.body);
});

test('user without an active issue cannot start or stop a session', async () => {
  const { token } = await registerUser('no-issue');

  const start = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    token
  );
  assert.equal(start.status, 403);
  assert.match(start.body.message, /not in your library/i);

  const stop = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 8 },
    token
  );
  assert.equal(stop.status, 403);
});

test('returned issue cannot create a reading session', async () => {
  const { token } = await registerUser('returned');
  const issued = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    token
  );
  assert.equal(issued.status, 201);

  const returned = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(returned.status, 200);

  const start = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    token
  );
  assert.equal(start.status, 403);

  const heartbeat = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 8 },
    token
  );
  assert.equal(heartbeat.status, 403);

  const stop = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 8 },
    token
  );
  assert.equal(stop.status, 403);
});

test('authenticated user can start, persist, and stop a reading session', async () => {
  const { token, user } = await registerUser('save-time');
  await issueBook(token);

  const start = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    { user_id: '00000000-0000-4000-8000-000000000099' },
    token
  );
  assert.equal(start.status, 200);
  assert.ok(start.body.session.id);
  assert.equal(start.body.session.bookId, SEEDED_BOOK_ID);
  assert.equal(start.body.session.durationSeconds, 0);
  assert.equal(start.body.session.endedAt, null);
  assert.equal(JSON.stringify(start.body).includes(user.id), false);
  assertNoSecretFields(start.body);

  const again = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    token
  );
  assert.equal(again.status, 200);
  assert.equal(again.body.session.id, start.body.session.id);

  const heartbeat = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 12, user_id: user.id },
    token
  );
  assert.equal(heartbeat.status, 200);
  assert.equal(heartbeat.body.session.durationSeconds, 12);
  assert.equal(heartbeat.body.session.endedAt, null);

  const stop = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 5 },
    token
  );
  assert.equal(stop.status, 200);
  assert.equal(stop.body.session.durationSeconds, 17);
  assert.ok(stop.body.session.endedAt);

  const duplicate = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 9 },
    token
  );
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.session.id, stop.body.session.id);
  assert.equal(duplicate.body.session.durationSeconds, 17);

  const analytics = await getJson('/api/analytics', token);
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.readingTime.totalSeconds, 17);
  assert.equal(analytics.body.readingTime.totalMinutes, 0);
  assert.equal(analytics.body.readingTime.recentSessions.length, 1);
  assert.equal(analytics.body.readingTime.recentSessions[0].durationSeconds, 17);
  assert.equal(
    analytics.body.readingProgress.books[0].readingTimeSeconds,
    17
  );
});

test('invalid reading-session durations are rejected', async () => {
  const { token } = await registerUser('invalid-time');
  await issueBook(token);
  await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    token
  );

  const missing = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    {},
    token
  );
  assert.equal(missing.status, 400);

  const negative = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: -1 },
    token
  );
  assert.equal(negative.status, 400);

  const tooHigh = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 61 },
    token
  );
  assert.equal(tooHigh.status, 400);

  const notNumber = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: '12' },
    token
  );
  assert.equal(notNumber.status, 400);

  const negativeStop = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: -3 },
    token
  );
  assert.equal(negativeStop.status, 400);

  const analytics = await getJson('/api/analytics', token);
  assert.equal(analytics.body.readingTime.totalSeconds, 0);
});

test('expired issue cannot create a reading session', async () => {
  const { token, user } = await registerUser('expired');
  await issueBook(token);

  await pool.query(
    `UPDATE book_issues
     SET issued_at = now() - interval '15 days',
         due_at = now() - interval '1 day'
     WHERE user_id = $1 AND book_id = $2 AND status = 'active'`,
    [user.id, SEEDED_BOOK_ID]
  );

  const start = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    token
  );
  assert.equal(start.status, 403);
});

test('another user cannot read or modify reading sessions', async () => {
  const owner = await registerUser('session-owner');
  const other = await registerUser('session-other');
  await issueBook(owner.token);
  await issueBook(other.token);

  await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    owner.token
  );
  await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 20, user_id: other.user.id },
    owner.token
  );

  const otherStart = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    { user_id: owner.user.id },
    other.token
  );
  assert.equal(otherStart.status, 200);

  const otherBeat = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 4, user_id: owner.user.id },
    other.token
  );
  assert.equal(otherBeat.status, 200);
  assert.equal(otherBeat.body.session.durationSeconds, 4);

  const ownerAnalytics = await getJson('/api/analytics', owner.token);
  assert.equal(ownerAnalytics.body.readingTime.totalSeconds, 20);

  const otherAnalytics = await getJson('/api/analytics', other.token);
  assert.equal(otherAnalytics.body.readingTime.totalSeconds, 4);

  const otherBook = await postJson(
    `/api/books/${OTHER_SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    owner.token
  );
  assert.equal(otherBook.status, 403);
});
