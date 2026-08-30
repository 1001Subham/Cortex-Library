-- Cortex Library development catalog seed (idempotent).
-- Public-domain works (US): 19th / early 20th century publications.
-- ISBN left NULL: original editions predate modern ISBN.
-- Content files: storage/books/{id}/content.html (excerpts, not complete books).
-- Covers: project-owned SVG at storage/books/{id}/cover.svg.

-- Categories (parents first)
INSERT INTO categories (id, name, slug, parent_id, description, sort_order, updated_at)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Fiction', 'fiction', NULL, 'Imaginative narrative prose.', 10, now()),
  ('c1000000-0000-4000-8000-000000000007', 'Classics', 'classics', NULL, 'Established literary works.', 20, now()),
  ('c1000000-0000-4000-8000-00000000000a', 'Children', 'children', NULL, 'Works written primarily for young readers.', 30, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO categories (id, name, slug, parent_id, description, sort_order, updated_at)
VALUES
  ('c1000000-0000-4000-8000-000000000002', 'Mystery', 'mystery', 'c1000000-0000-4000-8000-000000000001', 'Crime, detection, and suspense.', 10, now()),
  ('c1000000-0000-4000-8000-000000000003', 'Science Fiction', 'science-fiction', 'c1000000-0000-4000-8000-000000000001', 'Speculative science and future societies.', 20, now()),
  ('c1000000-0000-4000-8000-000000000004', 'Fantasy', 'fantasy', 'c1000000-0000-4000-8000-000000000001', 'Magic, wonder, and invented worlds.', 30, now()),
  ('c1000000-0000-4000-8000-000000000005', 'Adventure', 'adventure', 'c1000000-0000-4000-8000-000000000001', 'Journeys, danger, and discovery.', 40, now()),
  ('c1000000-0000-4000-8000-000000000006', 'Horror', 'horror', 'c1000000-0000-4000-8000-000000000001', 'Fear, the uncanny, and the gothic.', 50, now()),
  ('c1000000-0000-4000-8000-000000000008', 'Literature', 'literature', 'c1000000-0000-4000-8000-000000000007', 'Literary fiction and social novels.', 10, now()),
  ('c1000000-0000-4000-8000-000000000009', 'Historical', 'historical', 'c1000000-0000-4000-8000-000000000007', 'Works grounded in a historical setting or period.', 20, now()),
  ('c1000000-0000-4000-8000-00000000000b', 'Children''s Literature', 'childrens-literature', 'c1000000-0000-4000-8000-00000000000a', 'Stories composed for children.', 10, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO authors (id, display_name, slug, biography, updated_at)
VALUES
  (
    'a2000000-0000-4000-8000-000000000001',
    'Lewis Carroll',
    'lewis-carroll',
    'Charles Lutwidge Dodgson (1832–1898), known as Lewis Carroll, was an English writer and mathematician. Alice''s Adventures in Wonderland was published in 1865 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'Arthur Conan Doyle',
    'arthur-conan-doyle',
    'Sir Arthur Conan Doyle (1859–1930) was a British writer. The Adventures of Sherlock Holmes was first collected in 1892 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000003',
    'H. G. Wells',
    'hg-wells',
    'Herbert George Wells (1866–1946) was an English novelist. The Time Machine (1895) and The War of the Worlds (1898) are in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000004',
    'Robert Louis Stevenson',
    'robert-louis-stevenson',
    'Robert Louis Stevenson (1850–1894) was a Scottish novelist. Treasure Island was published in 1883 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000005',
    'Jane Austen',
    'jane-austen',
    'Jane Austen (1775–1817) was an English novelist. Pride and Prejudice was published in 1813 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000006',
    'L. Frank Baum',
    'l-frank-baum',
    'Lyman Frank Baum (1856–1919) was an American writer. The Wonderful Wizard of Oz was published in 1900 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000007',
    'Bram Stoker',
    'bram-stoker',
    'Abraham Stoker (1847–1912) was an Irish writer. Dracula was published in 1897 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000008',
    'Mary Wollstonecraft Shelley',
    'mary-shelley',
    'Mary Wollstonecraft Shelley (1797–1851) was an English novelist. Frankenstein; or, The Modern Prometheus was published in 1818 and is in the public domain in the United States.',
    now()
  ),
  (
    'a2000000-0000-4000-8000-000000000009',
    'Charles Dickens',
    'charles-dickens',
    'Charles Dickens (1812–1870) was an English novelist. A Christmas Carol was published in 1843 and is in the public domain in the United States.',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  biography = EXCLUDED.biography,
  updated_at = now();

INSERT INTO books (
  id, title, slug, description, isbn, publication_year, publisher, language_code,
  cover_image_key, content_storage_key, content_format, content_byte_size,
  total_pages, estimated_reading_minutes, status, published_at, updated_at
)
VALUES
  (
    'b3000000-0000-4000-8000-000000000001',
    'Alice''s Adventures in Wonderland',
    'alices-adventures-in-wonderland',
    'A public-domain children''s fantasy. This Cortex Library copy contains a representative excerpt of Chapter I, not the complete 1865 novel.',
    NULL,
    1865,
    'Macmillan',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000001/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000001/content.html',
    'html',
    1705,
    4,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000002',
    'The Adventures of Sherlock Holmes',
    'the-adventures-of-sherlock-holmes',
    'A public-domain collection of detective stories. This copy contains a representative excerpt of “A Scandal in Bohemia,” not the complete 1892 volume.',
    NULL,
    1892,
    'George Newnes',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000002/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000002/content.html',
    'html',
    1331,
    5,
    9,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000003',
    'The Time Machine',
    'the-time-machine',
    'A public-domain scientific romance. This copy contains a representative excerpt of Chapter I, not the complete 1895 novella.',
    NULL,
    1895,
    'William Heinemann',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000003/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000003/content.html',
    'html',
    1339,
    4,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000004',
    'Treasure Island',
    'treasure-island',
    'A public-domain adventure novel. This copy contains a representative excerpt of Chapter I, not the complete 1883 book.',
    NULL,
    1883,
    'Cassell & Company',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000004/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000004/content.html',
    'html',
    1465,
    5,
    9,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000005',
    'Pride and Prejudice',
    'pride-and-prejudice',
    'A public-domain novel of manners. This copy contains a representative excerpt of Chapter I, not the complete 1813 novel.',
    NULL,
    1813,
    'T. Egerton',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000005/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000005/content.html',
    'html',
    1228,
    4,
    7,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000006',
    'The Wonderful Wizard of Oz',
    'the-wonderful-wizard-of-oz',
    'A public-domain American children''s fantasy. This copy contains a representative excerpt of Chapter I, not the complete 1900 book.',
    NULL,
    1900,
    'George M. Hill Company',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000006/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000006/content.html',
    'html',
    1236,
    4,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000007',
    'Dracula',
    'dracula',
    'A public-domain gothic novel. This copy contains a representative excerpt of Jonathan Harker''s opening journal, not the complete 1897 novel.',
    NULL,
    1897,
    'Archibald Constable and Company',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000007/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000007/content.html',
    'html',
    1162,
    5,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000008',
    'Frankenstein',
    'frankenstein',
    'A public-domain gothic and scientific novel. This copy contains a representative excerpt of the opening letter, not the complete 1818 novel.',
    NULL,
    1818,
    'Lackington, Hughes, Harding, Mavor & Jones',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000008/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000008/content.html',
    'html',
    1132,
    4,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000009',
    'A Christmas Carol',
    'a-christmas-carol',
    'A public-domain seasonal novella. This copy contains a representative excerpt of Stave I, not the complete 1843 book.',
    NULL,
    1843,
    'Chapman & Hall',
    'en',
    'storage/books/b3000000-0000-4000-8000-000000000009/cover.svg',
    'storage/books/b3000000-0000-4000-8000-000000000009/content.html',
    'html',
    1302,
    5,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  ),
  (
    'b3000000-0000-4000-8000-00000000000a',
    'The War of the Worlds',
    'the-war-of-the-worlds',
    'A public-domain scientific romance. This copy contains a representative excerpt of Book One, Chapter I, not the complete 1898 novel.',
    NULL,
    1898,
    'William Heinemann',
    'en',
    'storage/books/b3000000-0000-4000-8000-00000000000a/cover.svg',
    'storage/books/b3000000-0000-4000-8000-00000000000a/content.html',
    'html',
    1259,
    4,
    8,
    'published',
    TIMESTAMPTZ '2026-08-30 00:00:00+00',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  isbn = EXCLUDED.isbn,
  publication_year = EXCLUDED.publication_year,
  publisher = EXCLUDED.publisher,
  language_code = EXCLUDED.language_code,
  cover_image_key = EXCLUDED.cover_image_key,
  content_storage_key = EXCLUDED.content_storage_key,
  content_format = EXCLUDED.content_format,
  content_byte_size = EXCLUDED.content_byte_size,
  total_pages = EXCLUDED.total_pages,
  estimated_reading_minutes = EXCLUDED.estimated_reading_minutes,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

INSERT INTO book_authors (book_id, author_id, author_order)
VALUES
  ('b3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 1),
  ('b3000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 1),
  ('b3000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000003', 1),
  ('b3000000-0000-4000-8000-000000000004', 'a2000000-0000-4000-8000-000000000004', 1),
  ('b3000000-0000-4000-8000-000000000005', 'a2000000-0000-4000-8000-000000000005', 1),
  ('b3000000-0000-4000-8000-000000000006', 'a2000000-0000-4000-8000-000000000006', 1),
  ('b3000000-0000-4000-8000-000000000007', 'a2000000-0000-4000-8000-000000000007', 1),
  ('b3000000-0000-4000-8000-000000000008', 'a2000000-0000-4000-8000-000000000008', 1),
  ('b3000000-0000-4000-8000-000000000009', 'a2000000-0000-4000-8000-000000000009', 1),
  ('b3000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000003', 1)
ON CONFLICT (book_id, author_id) DO UPDATE SET
  author_order = EXCLUDED.author_order;

INSERT INTO book_categories (book_id, category_id)
VALUES
  ('b3000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004'),
  ('b3000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-00000000000b'),
  ('b3000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002'),
  ('b3000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000008'),
  ('b3000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000003'),
  ('b3000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000005'),
  ('b3000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000008'),
  ('b3000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000007'),
  ('b3000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000004'),
  ('b3000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-00000000000b'),
  ('b3000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000006'),
  ('b3000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000006'),
  ('b3000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000003'),
  ('b3000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000008'),
  ('b3000000-0000-4000-8000-00000000000a', 'c1000000-0000-4000-8000-000000000003')
ON CONFLICT (book_id, category_id) DO NOTHING;
