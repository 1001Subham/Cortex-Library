import config from '../config/index.js';
import pool from '../config/database.js';
import { HttpError } from '../middleware/httpError.js';
import {
  addWalletBalance,
  findWalletByUserId,
  findWelcomeBonus,
  insertTokenTransaction,
  insertWalletIfMissing,
  listTokenTransactions,
  lockWalletForUser,
  toPublicTransaction,
} from '../repositories/tokens.repository.js';

export const WELCOME_BONUS_TYPE = 'welcome_bonus';
export const BOOK_ISSUE_TYPE = 'book_issue';

export function getTokenConfig() {
  return {
    initialBalance: config.tokens.initialBalance,
    bookIssueCost: config.tokens.bookIssueCost,
  };
}

export async function ensureWelcomeWallet(userId, client) {
  const ownClient = !client;
  const dbClient = client || (await pool.connect());

  try {
    if (ownClient) {
      await dbClient.query('BEGIN');
    }

    await insertWalletIfMissing(userId, dbClient);
    const wallet = await lockWalletForUser(userId, dbClient);

    if (!wallet) {
      throw new HttpError(500, 'Unable to create a token wallet.');
    }

    const welcomeAmount = config.tokens.initialBalance;

    if (welcomeAmount > 0) {
      const existingWelcome = await findWelcomeBonus(userId, dbClient);

      if (!existingWelcome) {
        try {
          await insertTokenTransaction(
            {
              userId,
              amount: welcomeAmount,
              transactionType: WELCOME_BONUS_TYPE,
              description: 'Welcome token allocation',
              referenceId: null,
            },
            dbClient
          );
          await addWalletBalance(userId, welcomeAmount, dbClient);
        } catch (error) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }

    const latest = await lockWalletForUser(userId, dbClient);

    if (ownClient) {
      await dbClient.query('COMMIT');
    }

    return latest;
  } catch (error) {
    if (ownClient) {
      try {
        await dbClient.query('ROLLBACK');
      } catch {
        // Connection may already be rolled back.
      }
    }

    throw error;
  } finally {
    if (ownClient) {
      dbClient.release();
    }
  }
}

export async function getUserTokenAccount(userId) {
  await ensureWelcomeWallet(userId);
  const wallet = await findWalletByUserId(userId);
  const transactions = await listTokenTransactions(userId);

  return {
    balance: wallet?.balance ?? 0,
    issueCost: config.tokens.bookIssueCost,
    transactions: transactions.map(toPublicTransaction),
  };
}
