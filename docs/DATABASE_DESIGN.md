# Cortex Library — Digital Book Catalog Database Design

**Jira:** CORTEX-6 (US-01: Browse Digital Library) / CORTEX-10 (Design Digital Book Catalog Interface)

**Status:** Catalog schema migrated. Users table migrated for email/password JWT auth. Development seed data applied (10 public-domain excerpts). Catalog browse APIs implemented (`GET /api/books`, `GET /api/books/:id`). Content serving: `GET /api/books/:id/content`. Catalog UI and in-app HTML reader implemented. Auth APIs: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.

**Scope:** Catalog metadata, internal content references, and the minimal `users` table for authentication. Issues, sessions, attention, and recommendations remain out of scope.

---

## 1. Final entity list

| Entity | Purpose |
|--------|---------|
| `categories` | Hierarchical browse taxonomy (Fiction → Mystery). No separate genres table. |
| `authors` | People credited on books; reusable across titles. |
| `books` | Catalog record, cover reference, and internal content reference. |
| `book_authors` | Many-to-many: books ↔ authors, with credit order. |
| `book_categories` | Many-to-many: books ↔ categories. **No** `books.primary_category_id`. |
| `users` | Authenticated accounts (email + password hash). No profile fields yet. |

Not created in this phase: `book_issues`, `reading_sessions`, `reading_progress`, `attention_measurements`, `recommendations`.

---

## 2. Final attributes

### `categories`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `name` | VARCHAR(120) | Display name |
| `slug` | VARCHAR(140) | Unique, URL-safe |
| `parent_id` | UUID NULL | Self-FK; NULL = top-level (e.g. Fiction) |
| `description` | TEXT NULL | Optional browse copy |
| `sort_order` | INTEGER NOT NULL DEFAULT 0 | Sibling ordering in the tree |
| `created_at` | TIMESTAMPTZ NOT NULL | Default `now()` |
| `updated_at` | TIMESTAMPTZ NOT NULL | Default `now()` |

**Deviation:** `sort_order` is not on the book field list; it is needed so sibling categories (Mystery vs Fantasy under Fiction) have a stable UI order.

### `authors`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `display_name` | VARCHAR(200) | How the name appears in the catalog |
| `slug` | VARCHAR(220) | Unique |
| `biography` | TEXT NULL | Optional author page later |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | |

**Deviation:** `display_name` instead of a split first/last name. Academic catalogs often have single-string names (including organizations). Split names can be added later without blocking CORTEX-6.

### `books`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `title` | VARCHAR(500) | Required |
| `slug` | VARCHAR(520) | Unique catalog URL |
| `description` | TEXT NULL | Details page blurb |
| `isbn` | VARCHAR(20) NULL | Unique when present |
| `publication_year` | SMALLINT NULL | Calendar year only |
| `publisher` | VARCHAR(200) NULL | Simple string; no publishers table yet |
| `language_code` | VARCHAR(10) NOT NULL | e.g. `en`, `en-US`, `hi` |
| `cover_image_key` | VARCHAR(500) NULL | Internal key, e.g. `storage/books/{id}/cover.jpg` |
| `content_storage_key` | VARCHAR(500) NULL | Internal key, e.g. `storage/books/{id}/content.html` |
| `content_format` | VARCHAR(20) NULL | Constrained: `html`, `epub`, `markdown` |
| `content_byte_size` | INTEGER NULL | Bytes of stored file; useful for serving |
| `total_pages` | INTEGER NULL | Progress / reader pagination later |
| `estimated_reading_minutes` | INTEGER NULL | Catalog / analytics later |
| `status` | VARCHAR(20) NOT NULL | Constrained: `draft`, `published`, `archived` |
| `published_at` | TIMESTAMPTZ NULL | When the title became visible |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | |

**Removed vs earlier draft:** `primary_category_id`. Categories are only via `book_categories`.

**Kept as specified:** content columns and `total_pages` so the in-app reader can resolve files without external URLs.

**Not added:** `external_url`, PDF download path, or public HTTP URLs for content.

### `book_authors`

| Column | Type | Notes |
|--------|------|--------|
| `book_id` | UUID NOT NULL | FK → books |
| `author_id` | UUID NOT NULL | FK → authors |
| `author_order` | SMALLINT NOT NULL DEFAULT 1 | 1 = first credited author |

**Deviation:** `author_order` is required for “Author A, Author B” display. Composite PK `(book_id, author_id)`.

### `book_categories`

| Column | Type | Notes |
|--------|------|--------|
| `book_id` | UUID NOT NULL | FK → books |
| `category_id` | UUID NOT NULL | FK → categories |

Composite PK `(book_id, category_id)`.

**Not added:** `is_primary` on the junction. Browse can order by category tree or name. A display-primary flag can be added later without changing `books`.

### `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `email` | VARCHAR(254) | Unique; stored lowercased and trimmed |
| `password_hash` | VARCHAR(255) | bcrypt hash only; never plaintext; never returned by APIs |
| `created_at` | TIMESTAMPTZ NOT NULL | Default `now()` |
| `updated_at` | TIMESTAMPTZ NOT NULL | Default `now()` |

**Not added:** display name, roles, OAuth provider ids, or email-verified flags. Google OAuth can add nullable columns later without rewriting this table.

---

## 3. Relationships

```
categories.parent_id ──► categories.id          (optional tree)
books ◄──► authors     via book_authors        (M:N)
books ◄──► categories  via book_categories     (M:N)
users                                 (independent; no catalog FKs yet)
```

- One book, many authors; one author, many books.
- One book, many categories (including a parent and a child if desired); one category, many books.
- A category may have one parent; cycles must be prevented in application logic (CHECK cannot easily forbid all cycles).
- Users are not linked to books yet. Future `book_issues` / `reading_progress` will reference `users.id` and `books.id`.

---

## 4. Primary keys

| Table | Primary key |
|-------|-------------|
| `categories` | `id` (UUID) |
| `authors` | `id` (UUID) |
| `books` | `id` (UUID) |
| `book_authors` | `(book_id, author_id)` |
| `book_categories` | `(book_id, category_id)` |
| `users` | `id` (UUID) |

---

## 5. Foreign keys

| Table | Column | References | On delete |
|-------|--------|------------|-----------|
| `categories` | `parent_id` | `categories(id)` | `ON DELETE SET NULL` (orphan becomes top-level) |
| `book_authors` | `book_id` | `books(id)` | `ON DELETE CASCADE` |
| `book_authors` | `author_id` | `authors(id)` | `ON DELETE RESTRICT` (do not drop authors still credited) |
| `book_categories` | `book_id` | `books(id)` | `ON DELETE CASCADE` |
| `book_categories` | `category_id` | `categories(id)` | `ON DELETE RESTRICT` |

---

## 6. Constraints

**Uniqueness**

- `categories.slug`
- `authors.slug`
- `books.slug`
- `books.isbn` UNIQUE where `isbn IS NOT NULL`
- `users.email`

**Checks**

- `books.language_code`: length 2–10, non-empty after trim
- `books.content_format` NULL or IN (`html`, `epub`, `markdown`)
- `books.status` IN (`draft`, `published`, `archived`)
- `books.publication_year` NULL or between 1 and 9999
- `books.total_pages` NULL or `> 0`
- `books.content_byte_size` NULL or `>= 0`
- `books.estimated_reading_minutes` NULL or `>= 0`
- `book_authors.author_order` `>= 1`
- `categories`: `parent_id IS DISTINCT FROM id` (no self-parent)
- `users.email` equals `lower(trim(email))` and is non-empty
- `users.password_hash` is non-empty

**Not-null:** titles, slugs, status, language_code, user email/password_hash, timestamps as listed above.

**UUID generation:** PostgreSQL 16 provides `gen_random_uuid()` in core. `pgcrypto` is **not required** for this catalog. Do **not** enable `pg_trgm` in the first migration.

---

## 7. Indexes

**Unique (also serve lookups)**

- `categories(slug)`
- `authors(slug)`
- `books(slug)`
- partial unique `books(isbn)` WHERE `isbn IS NOT NULL`
- `users(email)`

**Foreign keys / filters**

- `categories(parent_id)`
- `book_authors(author_id)` (PK already covers `book_id`)
- `book_categories(category_id)` (PK already covers `book_id`)

**Catalog browse**

- `books(status, published_at DESC)` WHERE `status = 'published'`
- `books(language_code)` for language filter

**Not in first migration**

- `pg_trgm` / GIN on `title` / `description` — add when search is implemented.

---

## 8. Book content strategy

**Requirement:** Read inside Cortex Library. No external site, no forced PDF download, no outbound reading links.

**Approach:** Application-managed files on disk (Docker volume in development), referenced by opaque keys in `books`.

| Concern | Decision |
|---------|----------|
| First reader | HTML at `storage/books/{book_id}/content.html` |
| Later | Same columns; `content_format = 'epub'` possible; no EPUB parser now |
| Covers | `cover_image_key` e.g. `storage/books/{book_id}/cover.jpg` |
| Serving | Backend streams/serves files to the React reader; keys never stored as public third-party URLs |

**Rejected for this project (now):** object-store-only design (extra infra); chapter-per-row tables (premature); storing full HTML in PostgreSQL (large rows, poor streaming).

`content_storage_key` may be NULL for `draft` titles that are catalogued before files exist. Published books used by the reader should have a key and format set (enforced in application / later CHECK if needed).

---

## 9. Normalization decisions

- **3NF for catalog:** title/ISBN live on `books`; names live on `authors`/`categories`; junctions hold only associations plus `author_order`.
- **Categories vs genres:** one hierarchy via `parent_id`. Avoids duplicate Fiction/Mystery taxonomies.
- **M:N categories:** a title can be Mystery and Historical; recommendations can use multiple tags later.
- **Publisher as VARCHAR:** a `publishers` table is not needed for CORTEX-6.
- **Users are independent of catalog:** issuing and progress stay future tables with FKs to `users.id` and `books.id`.

---

## 10. Future compatibility

| Future feature | How this schema supports it |
|----------------|------------------------------|
| In-app reader | `content_storage_key`, `content_format`, `total_pages` |
| Resume / progress | New table `reading_progress(user_id, book_id, position, …)` |
| Book issues / tokens | New table referencing `users.id` and `books.id` |
| Recommendations | Join `book_categories` + future reading history |
| Search | Add `pg_trgm` later without changing entity list |
| EPUB | Same files + `content_format`; parser later |
| Auth | `users` table; JWT in the API; Google OAuth later |

---

## 11. Migration order

Applied to local Docker PostgreSQL (forward-only CREATE):

1. `001_enable_extensions.sql` — documents that no extra extensions are required; does not enable `pg_trgm`.
2. `002_create_categories.sql`
3. `003_create_authors.sql`
4. `004_create_books.sql`
5. `005_create_book_authors.sql`
6. `006_create_book_categories.sql`
7. `007_create_users.sql`

Development seed (idempotent): `database/seeds/001_catalog_seed.sql`

---

## Implementation note

Catalog tables exist and contain development seed data (10 published books, HTML excerpts). Browse APIs: `GET /api/books` and `GET /api/books/:id`. Content API: `GET /api/books/:id/content` (key-constrained HTML files only). Catalog UI and in-app HTML reader are implemented (public, no login). `users` exists for email/password registration and JWT login; catalog and reader routes stay unauthenticated.
