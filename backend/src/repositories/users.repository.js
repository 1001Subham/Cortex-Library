import pool from '../config/database.js';
import { HttpError } from '../middleware/httpError.js';

export function toPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, email, password_hash, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createUser({ email, passwordHash }) {
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at, updated_at`,
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
