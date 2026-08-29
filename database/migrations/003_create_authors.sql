CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  biography TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT authors_slug_unique UNIQUE (slug)
);
