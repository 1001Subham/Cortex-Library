CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  parent_id UUID NULL,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_no_self_parent CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT categories_parent_fk
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);
