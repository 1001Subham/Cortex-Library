import pool from '../config/database.js';
import { HttpError } from '../middleware/httpError.js';

const USER_COLUMNS = `id, email, display_name, password_hash, google_sub, created_at, updated_at`;

export function toPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasPassword: Boolean(row.password_hash),
    hasGoogle: Boolean(row.google_sub),
  };
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT ${USER_COLUMNS}
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT ${USER_COLUMNS}
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function findUserByGoogleSub(googleSub) {
  const result = await pool.query(
    `SELECT ${USER_COLUMNS}
     FROM users
     WHERE google_sub = $1
     LIMIT 1`,
    [googleSub]
  );

  return result.rows[0] ?? null;
}

export async function createUser({ email, passwordHash }) {
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING ${USER_COLUMNS}`,
      [email, passwordHash]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    throw error;
  }
}

export async function createGoogleUser({ email, googleSub, displayName = null }) {
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, google_sub, display_name)
       VALUES ($1, NULL, $2, $3)
       RETURNING ${USER_COLUMNS}`,
      [email, googleSub, displayName]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    throw error;
  }
}

export async function linkGoogleSub(userId, googleSub) {
  try {
    const result = await pool.query(
      `UPDATE users
       SET google_sub = $2, updated_at = now()
       WHERE id = $1 AND (google_sub IS NULL OR google_sub = $2)
       RETURNING ${USER_COLUMNS}`,
      [userId, googleSub]
    );

    return result.rows[0] ?? null;
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    throw error;
  }
}

export async function updateUserDisplayName(userId, displayName) {
  const result = await pool.query(
    `UPDATE users
     SET display_name = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${USER_COLUMNS}`,
    [userId, displayName]
  );

  return result.rows[0] ?? null;
}
