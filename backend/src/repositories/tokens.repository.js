import pool from '../config/database.js';

function db(client) {
  return client || pool;
}

export async function insertWalletIfMissing(userId, client) {
  await db(client).query(
    `INSERT INTO user_token_wallets (user_id, balance)
     VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

export async function findWalletByUserId(userId, client) {
  const result = await db(client).query(
    `SELECT id, user_id, balance, created_at, updated_at
     FROM user_token_wallets
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function lockWalletForUser(userId, client) {
  const result = await db(client).query(
    `SELECT id, user_id, balance, created_at, updated_at
     FROM user_token_wallets
     WHERE user_id = $1
     FOR UPDATE`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function addWalletBalance(userId, amount, client) {
  const result = await db(client).query(
    `UPDATE user_token_wallets
     SET balance = balance + $2, updated_at = now()
     WHERE user_id = $1
       AND balance + $2 >= 0
     RETURNING id, user_id, balance, created_at, updated_at`,
    [userId, amount]
  );

  return result.rows[0] ?? null;
}

export async function findWelcomeBonus(userId, client) {
  const result = await db(client).query(
    `SELECT id
     FROM token_transactions
     WHERE user_id = $1 AND transaction_type = 'welcome_bonus'
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function insertTokenTransaction(
  { userId, amount, transactionType, description, referenceId },
  client
) {
  const result = await db(client).query(
    `INSERT INTO token_transactions (
       user_id,
       amount,
       transaction_type,
       description,
       reference_id
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, amount, transaction_type, description, reference_id, created_at`,
    [userId, amount, transactionType, description, referenceId]
  );

  return result.rows[0];
}

export async function listTokenTransactions(userId, client) {
  const result = await db(client).query(
    `SELECT amount, transaction_type, description, created_at
     FROM token_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );

  return result.rows;
}

export function toPublicTransaction(row) {
  return {
    amount: row.amount,
    transactionType: row.transaction_type,
    description: row.description,
    createdAt: row.created_at,
  };
}
