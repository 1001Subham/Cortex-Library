CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(520) NOT NULL,
  description TEXT NULL,
  isbn VARCHAR(20) NULL,
  publication_year SMALLINT NULL,
  publisher VARCHAR(200) NULL,
  language_code VARCHAR(10) NOT NULL,
  cover_image_key VARCHAR(500) NULL,
  content_storage_key VARCHAR(500) NULL,
  content_format VARCHAR(20) NULL,
  content_byte_size INTEGER NULL,
  total_pages INTEGER NULL,
  estimated_reading_minutes INTEGER NULL,
  status VARCHAR(20) NOT NULL,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT books_slug_unique UNIQUE (slug),
  CONSTRAINT books_language_code_check CHECK (
    char_length(btrim(language_code)) BETWEEN 2 AND 10
  ),
  CONSTRAINT books_content_format_check CHECK (
    content_format IS NULL OR content_format IN ('html', 'epub', 'markdown')
  ),
  CONSTRAINT books_status_check CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT books_publication_year_check CHECK (
    publication_year IS NULL OR publication_year BETWEEN 1 AND 9999
  ),
  CONSTRAINT books_total_pages_check CHECK (
    total_pages IS NULL OR total_pages > 0
  ),
  CONSTRAINT books_content_byte_size_check CHECK (
    content_byte_size IS NULL OR content_byte_size >= 0
  ),
  CONSTRAINT books_estimated_reading_minutes_check CHECK (
    estimated_reading_minutes IS NULL OR estimated_reading_minutes >= 0
  )
);

CREATE UNIQUE INDEX books_isbn_unique ON books (isbn) WHERE isbn IS NOT NULL;

CREATE INDEX books_published_catalog_idx
  ON books (status, published_at DESC)
  WHERE status = 'published';

CREATE INDEX books_language_code_idx ON books (language_code);
