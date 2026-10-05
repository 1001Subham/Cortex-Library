import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from './app.js';
import config from './config/index.js';
import { closeDatabasePool } from './config/database.js';
import pool from './config/database.js';

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const createdEmails = [];
const SEEDED_BOOK_ID = 'b3000000-0000-4000-8000-000000000001';
const OTHER_SEEDED_BOOK_ID = 'b3000000-0000-4000-8000-000000000002';
const THIRD_SEEDED_BOOK_ID = 'b3000000-0000-4000-8000-000000000003';
const welcomeAmount = config.tokens.initialBalance;
const issueCost = config.tokens.bookIssueCost;

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
  const email = `token-test-${label}-${Date.now()}-${Math.random()
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

test('unauthenticated GET /api/tokens returns 401', async () => {
  const { status, body } = await getJson('/api/tokens');
  assert.equal(status, 401);
  assert.equal(body.status, 'error');
  assertNoSecretFields(body);
});

test('authenticated user can view own token balance', async () => {
  const { token, user } = await registerUser('balance');
  const { status, body } = await getJson('/api/tokens', token);

  assert.equal(status, 200);
  assert.equal(body.balance, welcomeAmount);
  assert.equal(body.issueCost, issueCost);
  assert.ok(Array.isArray(body.transactions));
  assert.equal(body.transactions.length, 1);
  assert.equal(body.transactions[0].transactionType, 'welcome_bonus');
  assert.equal(body.transactions[0].amount, welcomeAmount);
  assert.equal(JSON.stringify(body).includes(user.id), false);
  assert.equal(Object.hasOwn(body.transactions[0] || {}, 'id'), false);
  assertNoSecretFields(body);
});

test('token endpoint ignores another user id from the query string', async () => {
  const owner = await registerUser('owner-tokens');
  const other = await registerUser('other-tokens');

  const { status, body } = await getJson(
    `/api/tokens?user_id=${other.user.id}&userId=${other.user.id}`,
    owner.token
  );

  assert.equal(status, 200);
  assert.equal(body.balance, welcomeAmount);
  assert.ok(
    body.transactions.every((row) => row.transactionType === 'welcome_bonus')
  );
  assert.equal(JSON.stringify(body).includes(other.user.id), false);
  assert.equal(JSON.stringify(body).includes(other.email), false);
});

test('newly registered user receives the welcome allocation exactly once', async () => {
  const { token, user } = await registerUser('welcome-once');

  const first = await getJson('/api/tokens', token);
  const second = await getJson('/api/tokens', token);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.balance, welcomeAmount);
  assert.equal(second.body.balance, welcomeAmount);

  const ledger = await pool.query(
    `SELECT amount, transaction_type
     FROM token_transactions
     WHERE user_id = $1
     ORDER BY created_at`,
    [user.id]
  );

  const welcomes = ledger.rows.filter(
    (row) => row.transaction_type === 'welcome_bonus'
  );
  assert.equal(welcomes.length, 1);
  assert.equal(Number(welcomes[0].amount), welcomeAmount);

  const wallets = await pool.query(
    'SELECT id FROM user_token_wallets WHERE user_id = $1',
    [user.id]
  );
  assert.equal(wallets.rows.length, 1);
});

test('sufficient tokens allow a book issue and deduct the configured cost', async () => {
  const { token, user } = await registerUser('issue-cost');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);

  assert.equal(issued.status, 201);
  assert.equal(issued.body.issue.book.id, SEEDED_BOOK_ID);

  const tokens = await getJson('/api/tokens', token);
  assert.equal(tokens.body.balance, welcomeAmount - issueCost);
  assert.ok(
    tokens.body.transactions.some(
      (row) => row.transactionType === 'book_issue' && row.amount === -issueCost
    )
  );

  const issues = await pool.query(
    'SELECT id FROM book_issues WHERE user_id = $1 AND book_id = $2 AND status = $3',
    [user.id, SEEDED_BOOK_ID, 'active']
  );
  assert.equal(issues.rows.length, 1);
});

test('insufficient tokens returns 402 and does not create an issue or deduct', async () => {
  const { token, user } = await registerUser('insufficient');

  await pool.query(
    'UPDATE user_token_wallets SET balance = $2 WHERE user_id = $1',
    [user.id, Math.max(issueCost - 1, 0)]
  );

  const before = await getJson('/api/tokens', token);
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);

  assert.equal(issued.status, 402);
  assert.equal(issued.body.status, 'error');
  assert.match(issued.body.message, /not enough tokens/i);

  const after = await getJson('/api/tokens', token);
  assert.equal(after.body.balance, before.body.balance);

  const issues = await pool.query(
    'SELECT id FROM book_issues WHERE user_id = $1',
    [user.id]
  );
  assert.equal(issues.rows.length, 0);

  const spends = await pool.query(
    `SELECT id FROM token_transactions
     WHERE user_id = $1 AND transaction_type = 'book_issue'`,
    [user.id]
  );
  assert.equal(spends.rows.length, 0);
});

test('duplicate active issue returns 409 and does not charge tokens', async () => {
  const { token } = await registerUser('duplicate-charge');
  const first = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(first.status, 201);

  const afterFirst = await getJson('/api/tokens', token);
  const second = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(second.status, 409);

  const afterSecond = await getJson('/api/tokens', token);
  assert.equal(afterSecond.body.balance, afterFirst.body.balance);
  assert.equal(
    afterSecond.body.transactions.filter((row) => row.transactionType === 'book_issue')
      .length,
    1
  );
});

test('returning a book does not refund tokens', async () => {
  const { token } = await registerUser('no-refund');
  const issued = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  assert.equal(issued.status, 201);

  const afterIssue = await getJson('/api/tokens', token);
  const returned = await postJson(
    `/api/library/${issued.body.issue.id}/return`,
    {},
    token
  );
  assert.equal(returned.status, 200);

  const afterReturn = await getJson('/api/tokens', token);
  assert.equal(afterReturn.body.balance, afterIssue.body.balance);
  assert.equal(
    afterReturn.body.transactions.some((row) => row.amount > 0 && row.transactionType !== 'welcome_bonus'),
    false
  );
});

test('concurrent duplicate issues cannot make the balance negative', async () => {
  const { token, user } = await registerUser('concurrent');

  const [first, second] = await Promise.all([
    postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token),
    postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, [201, 409]);

  const tokens = await getJson('/api/tokens', token);
  assert.equal(tokens.body.balance >= 0, true);
  assert.equal(tokens.body.balance, welcomeAmount - issueCost);

  const issues = await pool.query(
    'SELECT id FROM book_issues WHERE user_id = $1 AND book_id = $2',
    [user.id, SEEDED_BOOK_ID]
  );
  assert.equal(issues.rows.length, 1);

  const spends = await pool.query(
    `SELECT amount FROM token_transactions
     WHERE user_id = $1 AND transaction_type = 'book_issue'`,
    [user.id]
  );
  assert.equal(spends.rows.length, 1);
});

test('issuing a second distinct book deducts tokens again', async () => {
  const { token } = await registerUser('two-books');
  const first = await postJson(`/api/books/${SEEDED_BOOK_ID}/issue`, {}, token);
  const second = await postJson(
    `/api/books/${OTHER_SEEDED_BOOK_ID}/issue`,
    {},
    token
  );
  const third = await postJson(
    `/api/books/${THIRD_SEEDED_BOOK_ID}/issue`,
    {},
    token
  );

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(third.status, 201);

  const tokens = await getJson('/api/tokens', token);
  assert.equal(tokens.body.balance, welcomeAmount - issueCost * 3);
});
