import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from './app.js';
import { closeDatabasePool } from './config/database.js';
import pool from './config/database.js';
import config from './config/index.js';

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const createdEmails = [];
const BOOK_ID = 'b3000000-0000-4000-8000-000000000001';
const originalFetch = globalThis.fetch;
let analysisCalls = 0;
let nextCue = { faceDetected: true, headOrientation: 'forward' };

before(async () => {
  config.mlServiceUrl = 'http://ml-service.test';
  config.mlServiceToken = 'test-only-internal-token';
  globalThis.fetch = async (input, options = {}) => {
    if (String(input).endsWith('/analyze/frame')) {
      analysisCalls += 1;
      assert.equal(options.headers['X-Internal-Token'], config.mlServiceToken);
      assert.ok(JSON.parse(options.body).frame);
      return new Response(JSON.stringify(nextCue), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, options);
  };
  await new Promise((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (createdEmails.length) {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
  }
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await closeDatabasePool();
});

function uniqueEmail(label) {
  const email = `visual-cues-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  createdEmails.push(email);
  return email;
}

async function postJson(path, payload = {}, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await originalFetch(`${baseUrl}${path}`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

async function getJson(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await originalFetch(`${baseUrl}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

async function register(label) {
  const email = uniqueEmail(label);
  const result = await postJson('/api/auth/register', { email, password: 'correct-horse-battery' });
  assert.equal(result.status, 201);
  return result.body.token;
}

async function openIssuedSession(token) {
  const issued = await postJson(`/api/books/${BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);
  const started = await postJson(`/api/books/${BOOK_ID}/reading-sessions/start`, {}, token);
  assert.equal(started.status, 200);
  return started.body.session.id;
}

const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');

test('visual cue endpoint requires authentication and a valid JPEG frame', async () => {
  const path = `/api/books/${BOOK_ID}/reading-sessions/00000000-0000-4000-8000-000000000001/visual-cues`;
  assert.equal((await postJson(path, { frame: validJpeg })).status, 401);
  assert.equal((await getJson(path)).status, 401);

  const token = await register('invalid');
  const sessionId = await openIssuedSession(token);
  const invalid = await postJson(
    `/api/books/${BOOK_ID}/reading-sessions/${sessionId}/visual-cues`,
    { frame: 'bm90LWEtanBlZw==' },
    token
  );
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.message, /jpeg/i);
});

test('visual cues are persisted as per-session aggregates for the owning reader only', async () => {
  const ownerToken = await register('owner');
  const otherToken = await register('other');
  const sessionId = await openIssuedSession(ownerToken);
  const previousCalls = analysisCalls;
  const path = `/api/books/${BOOK_ID}/reading-sessions/${sessionId}/visual-cues`;

  const denied = await postJson(path, { frame: validJpeg }, otherToken);
  assert.equal(denied.status, 403);
  assert.equal(analysisCalls, previousCalls);

  const first = await postJson(path, { frame: validJpeg }, ownerToken);
  assert.equal(first.status, 201);
  assert.deepEqual(first.body.visualCue, { faceDetected: true, headOrientation: 'forward' });
  assert.equal(first.body.summary.samples, 1);
  assert.equal(first.body.summary.facingForward, 1);

  nextCue = { faceDetected: false, headOrientation: 'unknown' };
  const second = await postJson(path, { frame: validJpeg }, ownerToken);
  assert.equal(second.status, 201);
  assert.equal(second.body.summary.samples, 2);
  assert.equal(second.body.summary.faceDetected, 1);
  assert.equal(second.body.summary.noFaceDetected, 1);

  assert.equal((await getJson(path, otherToken)).status, 404);
  const ownerSummary = await getJson(path, ownerToken);
  assert.equal(ownerSummary.status, 200);
  assert.equal(ownerSummary.body.summary.samples, 2);
  assert.equal(JSON.stringify(ownerSummary.body).includes('frame'), false);

  const stopped = await postJson(
    `/api/books/${BOOK_ID}/reading-sessions/stop`,
    { elapsedSeconds: 0 },
    ownerToken
  );
  assert.equal(stopped.status, 200);
  assert.equal((await postJson(path, { frame: validJpeg }, ownerToken)).status, 403);
  const afterClose = await getJson(path, ownerToken);
  assert.equal(afterClose.status, 200);
  assert.equal(afterClose.body.summary.samples, 2);

  const persisted = await pool.query(
    'SELECT sample_count, face_detected_count, forward_facing_count, no_face_count FROM reading_attention WHERE session_id = $1',
    [sessionId]
  );
  assert.deepEqual(persisted.rows[0], {
    sample_count: 2,
    face_detected_count: 1,
    forward_facing_count: 1,
    no_face_count: 1,
  });
});
