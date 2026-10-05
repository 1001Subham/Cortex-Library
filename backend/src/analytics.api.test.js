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
  const email = `analytics-test-${label}-${Date.now()}-${Math.random()
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

test('GET /api/analytics returns 401 without a token', async () => {
  const { status, body } = await getJson('/api/analytics');
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('GET /api/analytics returns an empty report for a user with no issues', async () => {
  const { token } = await registerUser('empty');
  const { status, body } = await getJson('/api/analytics', token);

  assert.equal(status, 200);
  assert.equal(body.hasIssueHistory, false);
  assert.equal(body.summary.totalIssues, 0);
  assert.equal(body.summary.uniqueBooksIssued, 0);
  assert.equal(body.summary.activeIssues, 0);
  assert.equal(body.summary.returnedIssues, 0);
  assert.equal(body.summary.expiredIssues, 0);
  assert.equal(body.summary.tokensSpentOnIssues, 0);
  assert.equal(body.currentlyReading.length, 0);
  assert.equal(body.recentlyIssued.length, 0);
  assert.equal(body.recentlyReturned.length, 0);
  assert.equal(body.categoryBreakdown.length, 0);
  assert.equal(body.catalogEstimates.available, false);
  assert.equal(body.readingProgress.available, true);
  assert.equal(body.readingProgress.booksStarted, 0);
  assert.equal(body.readingProgress.booksCompleted, 0);
  assert.equal(body.readingProgress.averageProgressPercent, 0);
  assert.equal(body.readingProgress.books.length, 0);
  assert.equal(body.readingTime.available, true);
  assert.equal(body.readingTime.totalSeconds, 0);
  assert.equal(body.readingTime.totalMinutes, 0);
  assert.equal(body.readingTime.recentSessions.length, 0);
  assert.equal(body.unavailable.attention.available, false);
  assert.equal(Object.hasOwn(body.unavailable, 'readingSessions'), false);
  assert.equal(Object.hasOwn(body.unavailable, 'readingProgress'), false);
  assert.equal(JSON.stringify(body).includes(token), false);
  assertNoSecretFields(body);
});

test('GET /api/analytics includes only the authenticated reader camera visual cues', async () => {
  const owner = await registerUser('visual-cues-owner');
  const other = await registerUser('visual-cues-other');
  const issue = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, owner.token);
  assert.equal(issue.status, 201);
  const started = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    owner.token
  );
  assert.equal(started.status, 200);
  await pool.query(
    `INSERT INTO reading_attention
       (user_id, book_id, session_id, sample_count, face_detected_count,
        forward_facing_count, turned_away_count, no_face_count)
     VALUES ($1, $2, $3, 3, 2, 1, 1, 1)`,
    [owner.user.id, SEEDED_BOOK_ID, started.body.session.id]
  );

  const ownerReport = await getJson('/api/analytics', owner.token);
  assert.equal(ownerReport.status, 200);
  assert.equal(ownerReport.body.visualCues.available, true);
  assert.equal(ownerReport.body.visualCues.sessionsMeasured, 1);
  assert.equal(ownerReport.body.visualCues.samples, 3);
  assert.equal(ownerReport.body.visualCues.faceDetected, 2);
  assert.equal(ownerReport.body.visualCues.facingForward, 1);
  assert.match(ownerReport.body.visualCues.note, /not a measure of attention/i);

  const otherReport = await getJson('/api/analytics', other.token);
  assert.equal(otherReport.status, 200);
  assert.equal(otherReport.body.visualCues.available, false);
  assert.equal(otherReport.body.visualCues.samples, 0);
  assert.equal(otherReport.body.visualCues.faceDetected, 0);
});

test('GET /api/analytics summarizes only the authenticated user issues', async () => {
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

  const ownerReport = await getJson(
    `/api/analytics?user_id=${other.user.id}`,
    owner.token
  );
  assert.equal(ownerReport.status, 200);
  assert.equal(ownerReport.body.hasIssueHistory, true);
  assert.equal(ownerReport.body.summary.totalIssues, 1);
  assert.equal(ownerReport.body.summary.uniqueBooksIssued, 1);
  assert.equal(ownerReport.body.summary.activeIssues, 1);
  assert.equal(ownerReport.body.currentlyReading.length, 1);
  assert.equal(ownerReport.body.currentlyReading[0].book.id, SEEDED_BOOK_ID);
  assert.equal(ownerReport.body.currentlyReading[0].book.title, "Alice's Adventures in Wonderland");
  assert.ok(ownerReport.body.summary.tokensSpentOnIssues > 0);
  assert.ok(ownerReport.body.categoryBreakdown.length >= 1);
  assert.equal(ownerReport.body.catalogEstimates.available, true);
  assert.ok(ownerReport.body.catalogEstimates.totalEstimatedReadingMinutes > 0);
  assert.ok(ownerReport.body.catalogEstimates.totalCatalogPages > 0);
  assert.equal(
    ownerReport.body.currentlyReading.some(
      (item) => item.book.id === OTHER_SEEDED_BOOK_ID
    ),
    false
  );
  assert.equal(JSON.stringify(ownerReport.body).includes(other.user.id), false);
  assert.equal(JSON.stringify(ownerReport.body).includes(owner.user.id), false);
  assertNoSecretFields(ownerReport.body);

  const otherReport = await getJson('/api/analytics', other.token);
  assert.equal(otherReport.status, 200);
  assert.equal(otherReport.body.summary.totalIssues, 1);
  assert.equal(otherReport.body.currentlyReading[0].book.id, OTHER_SEEDED_BOOK_ID);
  assert.equal(
    otherReport.body.currentlyReading.some(
      (item) => item.book.id === SEEDED_BOOK_ID
    ),
    false
  );
});

test('GET /api/analytics treats a returned book as history, not currently reading', async () => {
  const { token } = await registerUser('returned');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const returned = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(returned.status, 200);

  const { status, body } = await getJson('/api/analytics', token);
  assert.equal(status, 200);
  assert.equal(body.summary.activeIssues, 0);
  assert.equal(body.summary.returnedIssues, 1);
  assert.equal(body.currentlyReading.length, 0);
  assert.equal(body.recentlyReturned.length, 1);
  assert.equal(body.recentlyReturned[0].book.id, SEEDED_BOOK_ID);
  assert.equal(body.recentlyIssued.length, 1);
});

test('GET /api/analytics includes saved progress for the authenticated user only', async () => {
  const owner = await registerUser('progress-owner');
  const other = await registerUser('progress-other');

  const ownerIssue = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/issue`,
    {},
    owner.token
  );
  assert.equal(ownerIssue.status, 201);

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

  const ownerReport = await getJson('/api/analytics', owner.token);
  assert.equal(ownerReport.status, 200);
  assert.equal(ownerReport.body.readingProgress.booksStarted, 1);
  assert.equal(ownerReport.body.readingProgress.booksCompleted, 0);
  assert.equal(ownerReport.body.readingProgress.averageProgressPercent, 42);
  assert.equal(ownerReport.body.readingProgress.books[0].bookId, SEEDED_BOOK_ID);
  assert.equal(ownerReport.body.readingProgress.books[0].progressPercent, 42);
  assert.equal(ownerReport.body.currentlyReading[0].progressPercent, 42);
  assert.equal(
    JSON.stringify(ownerReport.body).includes(other.user.id),
    false
  );
  assertNoSecretFields(ownerReport.body);

  const otherReport = await getJson('/api/analytics', other.token);
  assert.equal(otherReport.status, 200);
  assert.equal(otherReport.body.readingProgress.booksStarted, 0);
  assert.equal(otherReport.body.currentlyReading[0].progressPercent, null);

  const again = await getJson('/api/analytics', owner.token);
  assert.equal(again.body.readingProgress.books[0].progressPercent, 42);

  const library = await getJson('/api/library', owner.token);
  assert.equal(library.status, 200);
  assert.equal(library.body.issues[0].progressPercent, 42);
  assert.equal(
    library.body.issues[0].progressPercent,
    ownerReport.body.readingProgress.books[0].progressPercent
  );
});

test('GET /api/analytics treats 100 percent as completed', async () => {
  const { token } = await registerUser('completed');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const saved = await putJson(
    `/api/books/${SEEDED_BOOK_ID}/progress`,
    { progressPercent: 100 },
    token
  );
  assert.equal(saved.status, 200);

  const { status, body } = await getJson('/api/analytics', token);
  assert.equal(status, 200);
  assert.equal(body.readingProgress.booksStarted, 1);
  assert.equal(body.readingProgress.booksCompleted, 1);
  assert.equal(body.readingProgress.averageProgressPercent, 100);
  assert.equal(body.currentlyReading[0].progressPercent, 100);
});

test('GET /api/analytics reading time is measured sessions, not catalog estimates', async () => {
  const { token } = await registerUser('reading-time');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const before = await getJson('/api/analytics', token);
  assert.equal(before.status, 200);
  assert.equal(before.body.readingTime.totalSeconds, 0);
  assert.equal(before.body.readingTime.totalMinutes, 0);
  assert.ok(before.body.catalogEstimates.totalEstimatedReadingMinutes > 0);
  assert.notEqual(
    before.body.readingTime.totalMinutes,
    before.body.catalogEstimates.totalEstimatedReadingMinutes
  );
  assert.match(before.body.catalogEstimates.note, /not measured reading time/i);

  const started = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/start`,
    {},
    token
  );
  assert.equal(started.status, 200);

  const heartbeat = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/heartbeat`,
    { elapsedSeconds: 30 },
    token
  );
  assert.equal(heartbeat.status, 200);

  const stopped = await postJson(
    `/api/books/${SEEDED_BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 12 },
    token
  );
  assert.equal(stopped.status, 200);
  assert.equal(stopped.body.session.durationSeconds, 42);

  const after = await getJson('/api/analytics', token);
  assert.equal(after.status, 200);
  assert.equal(after.body.readingTime.totalSeconds, 42);
  assert.equal(after.body.readingTime.totalMinutes, 0);
  assert.equal(after.body.readingProgress.books[0].readingTimeSeconds, 42);
  assert.notEqual(
    after.body.readingTime.totalMinutes,
    after.body.catalogEstimates.totalEstimatedReadingMinutes
  );
});

test('catalog remains public after analytics is added', async () => {
  const list = await getJson('/api/books?limit=1');
  assert.equal(list.status, 200);
  assert.ok(list.body.books.length >= 1);
});
