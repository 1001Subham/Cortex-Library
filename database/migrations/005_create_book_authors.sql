CREATE TABLE book_authors (
  book_id UUID NOT NULL,
  author_id UUID NOT NULL,
  author_order SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT book_authors_pkey PRIMARY KEY (book_id, author_id),
  CONSTRAINT book_authors_book_fk
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
  CONSTRAINT book_authors_author_fk
    FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE RESTRICT,
  CONSTRAINT book_authors_order_check CHECK (author_order >= 1)
);

CREATE INDEX book_authors_author_id_idx ON book_authors (author_id);
