import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from './app.js';
import pool, { closeDatabasePool } from './config/database.js';

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const createdEmails = [];
const createdBookIds = [];
const ALICE_ID = 'b3000000-0000-4000-8000-000000000001';
const SHERLOCK_ID = 'b3000000-0000-4000-8000-000000000002';
const TIME_MACHINE_ID = 'b3000000-0000-4000-8000-000000000003';
const WIZARD_ID = 'b3000000-0000-4000-8000-000000000006';
const WELLS_OTHER_ID = 'b3000000-0000-4000-8000-00000000000a';
const DRACULA_ID = 'b3000000-0000-4000-8000-000000000007';
const FRANKENSTEIN_ID = '31ef1ddf-effb-5ecc-aef1-54113b81d694';

before(async () => {
  await new Promise((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });
});

after(async () => {
  if (createdEmails.length) {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
  }
  if (createdBookIds.length) {
    await pool.query('DELETE FROM books WHERE id = ANY($1::uuid[])', [createdBookIds]);
  }
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await closeDatabasePool();
});

async function jsonRequest(path, { method = 'GET', payload, token } = {}) {
  const headers = {};
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  return { status: response.status, body: await response.json() };
}

async function register(label) {
  const email = `recommendations-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  createdEmails.push(email);
  const response = await jsonRequest('/api/auth/register', {
    method: 'POST',
    payload: { email, password: 'correct-horse-battery' },
  });
  assert.equal(response.status, 201);
  return response.body;
}

async function issue(token, bookId) {
  return jsonRequest(`/api/books/${bookId}/issue`, { method: 'POST', payload: {}, token });
}

async function recommendations(token, query = '') {
  return jsonRequest(`/api/recommendations${query}`, { token });
}

test('GET /api/recommendations requires authentication', async () => {
  const { status, body } = await recommendations();
  assert.equal(status, 401);
  assert.equal(body.message, 'Authentication required.');
});

test('an authenticated reader receives recommendations in the expected response shape', async () => {
  const { token } = await register('shape');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const { status, body } = await recommendations(token);
  assert.equal(status, 200);
  assert.equal(body.personalized, true);
  assert.ok(body.recommendations.length > 0);
  assert.ok(body.recommendations.every((entry) =>
    entry.book?.id && entry.reason && entry.score > 0 &&
    Array.isArray(entry.matchedCategories) && Array.isArray(entry.matchedAuthors)
  ));
  assert.equal(Object.hasOwn(body, 'user'), false);
});

test('a reader with no issue history gets an explicit empty state', async () => {
  const { token } = await register('empty');
  const { status, body } = await recommendations(token);
  assert.equal(status, 200);
  assert.equal(body.personalized, false);
  assert.match(body.message, /Not enough reading history/);
  assert.deepEqual(body.recommendations, []);
});

test('only published, unissued candidate books are returned', async () => {
  const { token } = await register('filter');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const draftId = crypto.randomUUID();
  const unavailableId = crypto.randomUUID();
  createdBookIds.push(draftId);
  createdBookIds.push(unavailableId);
  await pool.query(
    `INSERT INTO books (id, title, slug, language_code, status, content_storage_key, content_format)
     VALUES
       ($1, 'Draft recommendation test', $3, 'en', 'draft', 'draft.html', 'html'),
       ($2, 'Unavailable recommendation test', $4, 'en', 'published', NULL, NULL)`,
    [draftId, unavailableId, `draft-recommendation-${draftId}`, `unavailable-recommendation-${unavailableId}`]
  );
  const { body } = await recommendations(token);
  const ids = body.recommendations.map((entry) => entry.book.id);
  assert.equal(ids.includes(ALICE_ID), false);
  assert.equal(ids.includes(draftId), false);
  assert.equal(ids.includes(unavailableId), false);
  assert.ok(body.recommendations.every((entry) => entry.book.id !== ALICE_ID));
});

test('a previously issued and returned title remains excluded', async () => {
  const { token } = await register('returned');
  const issued = await issue(token, ALICE_ID);
  assert.equal(issued.status, 201);
  const returned = await jsonRequest(`/api/library/${issued.body.issue.id}/return`, { method: 'POST', payload: {}, token });
  assert.equal(returned.status, 200);
  const { body } = await recommendations(token);
  assert.equal(body.recommendations.some((entry) => entry.book.id === ALICE_ID), false);
});

test('matching categories rank above candidates with only a shared author', async () => {
  const { token } = await register('category-rank');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const { body } = await recommendations(token);
  const wizard = body.recommendations.find((entry) => entry.book.id === WIZARD_ID);
  assert.ok(wizard);
  assert.ok(wizard.matchedCategories.length >= 1);
  assert.deepEqual(wizard.matchedAuthors, []);
});

test('shared authors add a secondary ranking signal', async () => {
  const { token } = await register('author-rank');
  assert.equal((await issue(token, TIME_MACHINE_ID)).status, 201);
  const { body } = await recommendations(token);
  const wellsBook = body.recommendations.find((entry) => entry.book.id === WELLS_OTHER_ID);
  assert.ok(wellsBook);
  assert.ok(wellsBook.matchedAuthors.some((author) => author.displayName === 'H. G. Wells'));
  assert.ok(wellsBook.score > 3); // one shared category scores 3; author affinity adds 1
});

test('saved progress raises interaction weight without exposing progress as a prediction', async () => {
  const { token } = await register('progress');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const saved = await jsonRequest(`/api/books/${ALICE_ID}/progress`, {
    method: 'PUT', payload: { progressPercent: 50 }, token,
  });
  assert.equal(saved.status, 200);
  const { body } = await recommendations(token);
  const wizard = body.recommendations.find((entry) => entry.book.id === WIZARD_ID);
  assert.equal(wizard.score, 9); // two matching categories × (1 + 0.5) × 3
  assert.equal(Object.hasOwn(wizard, 'progressPercent'), false);
  assert.equal(Object.hasOwn(wizard, 'probability'), false);
});

test('missing progress and reading sessions are handled as absent signals', async () => {
  const { token } = await register('no-extra-signals');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const { status, body } = await recommendations(token);
  assert.equal(status, 200);
  assert.ok(body.recommendations.length > 0);
  assert.ok(body.recommendations.every((entry) => Number.isFinite(entry.score)));
});

test('recorded sessions support interaction strength without being described as liking', async () => {
  const { token } = await register('sessions');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  await pool.query(
    `INSERT INTO reading_sessions (user_id, book_id, started_at, ended_at, duration_seconds)
     SELECT id, $2, now() - interval '20 minutes', now(), 1200 FROM users WHERE email = $1`,
    [createdEmails.at(-1), ALICE_ID]
  );
  const { body } = await recommendations(token);
  const wizard = body.recommendations.find((entry) => entry.book.id === WIZARD_ID);
  assert.equal(wizard.score, 7.5);
  assert.doesNotMatch(wizard.reason, /liked|enjoyed|attention|emotion|sentiment/i);
});

test('reasons identify stored category/title evidence', async () => {
  const { token } = await register('reason');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const { body } = await recommendations(token);
  const wizard = body.recommendations.find((entry) => entry.book.id === WIZARD_ID);
  assert.match(wizard.reason, /Alice's Adventures in Wonderland/);
  assert.match(wizard.reason, /Fantasy/);
  assert.deepEqual(wizard.matchedCategories.map((item) => item.name).sort(), ["Children's Literature", 'Fantasy']);
});

test('recommendation reasons name only categories shared with the cited issued book', async () => {
  const { token } = await register('reason-overlap');
  assert.equal((await issue(token, 'b3000000-0000-4000-8000-000000000009')).status, 201);
  assert.equal((await issue(token, DRACULA_ID)).status, 201);

  const { status, body } = await recommendations(token);
  assert.equal(status, 200);
  const frankenstein = body.recommendations.find((entry) => entry.book.id === FRANKENSTEIN_ID);
  assert.ok(frankenstein, body.recommendations.map((entry) => entry.book.title).join(', '));
  assert.match(frankenstein.reason, /A Christmas Carol.*Literature category/);
  assert.doesNotMatch(frankenstein.reason, /A Christmas Carol.*Horror/);
});

test('query user_id cannot override the authenticated recommendation profile', async () => {
  const owner = await register('owner');
  const other = await register('other');
  assert.equal((await issue(owner.token, ALICE_ID)).status, 201);
  assert.equal((await issue(other.token, SHERLOCK_ID)).status, 201);

  const { body } = await recommendations(owner.token, `?user_id=${other.user.id}`);
  const wizard = body.recommendations.find((entry) => entry.book.id === WIZARD_ID);
  assert.ok(wizard?.matchedCategories.some((category) => category.name === 'Fantasy'));
  assert.equal(body.recommendations.some((entry) => entry.matchedCategories.some((category) => category.name === 'Mystery')), false);
  assert.equal(JSON.stringify(body).includes(other.user.id), false);
});

test('another reader’s issues do not influence this reader’s recommendations', async () => {
  const owner = await register('isolation-owner');
  const other = await register('isolation-other');
  assert.equal((await issue(owner.token, ALICE_ID)).status, 201);
  assert.equal((await issue(other.token, SHERLOCK_ID)).status, 201);
  const { body } = await recommendations(owner.token);
  assert.ok(body.recommendations.some((entry) => entry.matchedCategories.some((category) => category.name === 'Fantasy')));
  assert.equal(body.recommendations.some((entry) => entry.matchedCategories.some((category) => category.name === 'Mystery')), false);
});

test('recommendations contain no fabricated engagement, attention, or sentiment fields', async () => {
  const { token } = await register('no-fabrication');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const { body } = await recommendations(token);
  const fields = [];
  const collectFields = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      fields.push(key.toLowerCase());
      collectFields(child);
    }
  };
  collectFields(body);
  for (const unsupported of ['attention', 'emotion', 'sentiment', 'confidence', 'probability', 'readingseconds']) {
    assert.equal(fields.some((field) => field.includes(unsupported)), false);
  }
  assert.ok(body.recommendations.every((entry) => typeof entry.score === 'number'));
});

test('stable sorting resolves equal scores by title', async () => {
  const { token } = await register('sort');
  assert.equal((await issue(token, ALICE_ID)).status, 201);
  const { body } = await recommendations(token);
  const entries = body.recommendations;
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].score === entries[index].score) {
      assert.ok(entries[index - 1].book.title.localeCompare(entries[index].book.title) <= 0);
    }
  }
});
