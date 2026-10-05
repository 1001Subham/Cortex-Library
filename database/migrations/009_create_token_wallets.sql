-- Token wallets and ledger. Forward-only; IF NOT EXISTS lets the
-- migration be re-applied safely on an existing development database.
-- XP/levels are not implemented; transaction_type includes level_reward
-- so a later phase can credit tokens without a schema redesign.

CREATE TABLE IF NOT EXISTS user_token_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_token_wallets_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_token_wallets_user_unique UNIQUE (user_id),
  CONSTRAINT user_token_wallets_balance_nonnegative_chk CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(40) NOT NULL,
  description TEXT NULL,
  reference_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT token_transactions_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT token_transactions_amount_nonzero_chk CHECK (amount <> 0),
  CONSTRAINT token_transactions_type_chk CHECK (
    transaction_type IN (
      'welcome_bonus',
      'book_issue',
      'admin_grant',
      'level_reward'
    )
  ),
  CONSTRAINT token_transactions_amount_matches_type_chk CHECK (
    (
      transaction_type IN ('welcome_bonus', 'admin_grant', 'level_reward')
      AND amount > 0
    )
    OR (
      transaction_type = 'book_issue'
      AND amount < 0
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS token_transactions_one_welcome_per_user_idx
  ON token_transactions (user_id)
  WHERE transaction_type = 'welcome_bonus';

CREATE INDEX IF NOT EXISTS token_transactions_user_created_idx
  ON token_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS token_transactions_type_idx
  ON token_transactions (transaction_type);
