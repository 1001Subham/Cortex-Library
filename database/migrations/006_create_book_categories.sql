CREATE TABLE book_categories (
  book_id UUID NOT NULL,
  category_id UUID NOT NULL,
  CONSTRAINT book_categories_pkey PRIMARY KEY (book_id, category_id),
  CONSTRAINT book_categories_book_fk
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
  CONSTRAINT book_categories_category_fk
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

CREATE INDEX book_categories_category_id_idx ON book_categories (category_id);
