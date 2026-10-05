# Cortex Library — Digital Book Catalog Database Design

**Jira:** CORTEX-6 (US-01: Browse Digital Library) / CORTEX-10 (Design Digital Book Catalog Interface)

**Status:** Catalog schema migrated. Users support email/password and Google OAuth (`google_sub`, nullable `password_hash`) plus an optional `display_name` for the reader profile. Book issues, token wallets, token ledger, reading progress, reading sessions, and visual-cue aggregates migrated. The catalog contains 100 US public-domain works with local HTML and covers. Catalog, content, auth, issuing, library, token, reader analytics, profile, reading-progress, reading-session, personalized recommendation, and visual-cue APIs implemented. Recommendations are computed from the current authenticated reader's existing history; there is no recommendation table or raw-camera storage.

**Scope:** Catalog metadata, internal content references, authenticated users, book issues, token wallets/ledger, saved HTML scroll progress, measured active reading sessions, deterministic content-based recommendations, and per-session aggregates of opt-in face-visibility/head-direction cues. XP/levels and premium pricing remain out of scope.

---

## 1. Final entity list

| Entity | Purpose |
|--------|---------|
| `categories` | Hierarchical browse taxonomy (Fiction → Mystery). No separate genres table. |
| `authors` | People credited on books; reusable across titles. |
| `books` | Catalog record, cover reference, and internal content reference. |
| `book_authors` | Many-to-many: books ↔ authors, with credit order. |
| `book_categories` | Many-to-many: books ↔ categories. **No** `books.primary_category_id`. |
| `users` | Authenticated accounts (email/password and/or Google) with optional `display_name`. |
| `book_issues` | Authenticated loans of published books (active / returned / expired). |
| `user_token_wallets` | One token balance per user. |
| `token_transactions` | Ledger of token credits and debits (welcome, issues, future rewards). |
| `reading_progress` | One saved HTML scroll position per user and book (0–100%). |
| `reading_sessions` | Measured active reading time per user and book (open or closed intervals). |
| `reading_attention` | Aggregate counts of opt-in face visibility and approximate head direction per reading session; camera frames are not persisted. |

Not created in this phase: raw `attention_measurements`, `recommendations`, XP/level tables.

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
| `email` | VARCHAR(254) | Unique; stored lowercased and trimmed; not editable from the reader profile |
| `password_hash` | VARCHAR(255) NULL | bcrypt hash for email/password accounts; NULL for Google-only accounts; never plaintext; never returned by APIs |
| `google_sub` | VARCHAR(255) NULL | Google subject from a verified ID token; unique when present; never returned by APIs |
| `display_name` | VARCHAR(120) NULL | Optional reader profile name; trimmed; empty string is not stored |
| `created_at` | TIMESTAMPTZ NOT NULL | Default `now()` |
| `updated_at` | TIMESTAMPTZ NOT NULL | Default `now()` |

**Auth methods:** at least one of `password_hash` or `google_sub` must be present. An existing email/password user can be linked to Google when the verified Google email matches. Profile editing updates `display_name` only; identity always comes from `users.id` on the authenticated JWT.

### `book_issues`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | FK → users |
| `book_id` | UUID NOT NULL | FK → books |
| `issued_at` | TIMESTAMPTZ NOT NULL | Default `now()` |
| `due_at` | TIMESTAMPTZ NOT NULL | After `issued_at` (application default 14 days) |
| `returned_at` | TIMESTAMPTZ NULL | Set when status is `returned` |
| `status` | VARCHAR(20) NOT NULL | `active`, `returned`, `expired` |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | |

Partial unique index: one **active** issue per `(user_id, book_id)`.

### `reading_progress`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | FK → users |
| `book_id` | UUID NOT NULL | FK → books |
| `progress_percent` | NUMERIC(5,2) NOT NULL | HTML scroll position 0–100; not a page number |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | |

Unique `(user_id, book_id)`. GET/PUT require an active `book_issues` row for that pair. The row may remain after return so a later re-issue can resume; the progress API still returns 403 while there is no active issue. This is not attention, engagement, or reading time.

### `reading_sessions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | FK → users |
| `book_id` | UUID NOT NULL | FK → books |
| `started_at` | TIMESTAMPTZ NOT NULL | Default `now()` |
| `ended_at` | TIMESTAMPTZ NULL | NULL while the session is open |
| `duration_seconds` | INTEGER NOT NULL | Accumulated visible reading time; CHECK `>= 0` |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | |

Partial unique index: at most one open session (`ended_at IS NULL`) per `(user_id, book_id)`. Duration is client-reported elapsed active seconds, capped at 60 per request, added only to the open row. Duplicate stop does not add time to an already-closed session. This is not catalog `estimated_reading_minutes` and is not attention.

### `reading_attention`

| Column | Type | Notes |
|--------|------|-------|
| `session_id` | UUID PRIMARY KEY | FK → `reading_sessions`; one aggregate per session |
| `user_id` | UUID NOT NULL | FK → `users`; comes from the authenticated request |
| `book_id` | UUID NOT NULL | FK → `books` |
| `sample_count` | INTEGER NOT NULL | Successfully analyzed frames |
| `face_detected_count` | INTEGER NOT NULL | Frames where a face was visible |
| `forward_facing_count` | INTEGER NOT NULL | Approximate head direction within configured pose thresholds |
| `turned_away_count` | INTEGER NOT NULL | Approximate head direction outside those thresholds |
| `no_face_count` | INTEGER NOT NULL | Frames with no face detected |
| `created_at`, `updated_at` | TIMESTAMPTZ NOT NULL | Aggregate timestamps |

The backend updates counts only after analysis while the session and issue are active. The raw JPEG exists only in request memory during analysis; it is not written to logs, files, or PostgreSQL. These cues do not measure attention, comprehension, emotion, or engagement.

### `user_token_wallets`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | Unique; one wallet per user |
| `balance` | INTEGER NOT NULL | Default 0; CHECK `>= 0` |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | |

### `token_transactions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID | Default `gen_random_uuid()` |
| `user_id` | UUID NOT NULL | FK → users |
| `amount` | INTEGER NOT NULL | Non-zero; positive credits, negative spends |
| `transaction_type` | VARCHAR(40) NOT NULL | `welcome_bonus`, `book_issue`, `admin_grant`, `level_reward` |
| `description` | TEXT NULL | Human-readable ledger note |
| `reference_id` | UUID NULL | e.g. `book_issues.id` for spends |
| `created_at` | TIMESTAMPTZ NOT NULL | |

Partial unique index: at most one `welcome_bonus` per user. `level_reward` is reserved; XP/levels are not implemented. Returns do **not** insert a refund row in this phase.

---

## 3. Relationships

```
categories.parent_id ──► categories.id          (optional tree)
books ◄──► authors     via book_authors        (M:N)
books ◄──► categories  via book_categories     (M:N)
users ──► book_issues ──► books
users ──► user_token_wallets   (1:1)
users ──► token_transactions   (1:N)
users ──► reading_progress ──► books  (1 per user+book)
users ──► reading_sessions ──► books  (N per user+book; one open)
users ──► reading_attention ──► reading_sessions (0/1 aggregate per session)
```

- One book, many authors; one author, many books.
- One book, many categories (including a parent and a child if desired); one category, many books.
- A category may have one parent; cycles must be prevented in application logic (CHECK cannot easily forbid all cycles).
- One user, many issues; one published book may be issued to many users.
- One user, one wallet; many ledger rows. Token spend and issue insert happen in one database transaction.

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
| `book_issues` | `id` (UUID) |
| `user_token_wallets` | `id` (UUID) |
| `token_transactions` | `id` (UUID) |
| `reading_progress` | `id` (UUID) |
| `reading_sessions` | `id` (UUID) |
| `reading_attention` | `session_id` (UUID) |

---

## 5. Foreign keys

| Table | Column | References | On delete |
|-------|--------|------------|-----------|
| `categories` | `parent_id` | `categories(id)` | `ON DELETE SET NULL` (orphan becomes top-level) |
| `book_authors` | `book_id` | `books(id)` | `ON DELETE CASCADE` |
| `book_authors` | `author_id` | `authors(id)` | `ON DELETE RESTRICT` (do not drop authors still credited) |
| `book_categories` | `book_id` | `books(id)` | `ON DELETE CASCADE` |
| `book_categories` | `category_id` | `categories(id)` | `ON DELETE RESTRICT` |
| `book_issues` | `user_id` | `users(id)` | `ON DELETE CASCADE` |
| `book_issues` | `book_id` | `books(id)` | `ON DELETE RESTRICT` |
| `user_token_wallets` | `user_id` | `users(id)` | `ON DELETE CASCADE` |
| `token_transactions` | `user_id` | `users(id)` | `ON DELETE CASCADE` |
| `reading_progress` | `user_id` | `users(id)` | `ON DELETE CASCADE` |
| `reading_progress` | `book_id` | `books(id)` | `ON DELETE RESTRICT` |
| `reading_sessions` | `user_id` | `users(id)` | `ON DELETE CASCADE` |
| `reading_sessions` | `book_id` | `books(id)` | `ON DELETE RESTRICT` |
| `reading_attention` | `session_id` | `reading_sessions(id)` | `ON DELETE CASCADE` |
| `reading_attention` | `user_id` | `users(id)` | `ON DELETE CASCADE` |
| `reading_attention` | `book_id` | `books(id)` | `ON DELETE RESTRICT` |

---

## 6. Constraints

**Uniqueness**

- `categories.slug`
- `authors.slug`
- `books.slug`
- `books.isbn` UNIQUE where `isbn IS NOT NULL`
- `users.email`
- `users.google_sub` UNIQUE where `google_sub IS NOT NULL`
- `reading_progress(user_id, book_id)`
- partial unique `reading_sessions(user_id, book_id)` WHERE `ended_at IS NULL`
- `user_token_wallets.user_id`
- partial unique `book_issues(user_id, book_id)` WHERE `status = 'active'`
- partial unique `token_transactions(user_id)` WHERE `transaction_type = 'welcome_bonus'`

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
- `users.display_name` is NULL or trimmed and non-empty
- `users.password_hash` is NULL or non-empty
- `users.google_sub` is NULL or non-empty
- `users`: `password_hash IS NOT NULL OR google_sub IS NOT NULL`
- `reading_progress.progress_percent` between 0 and 100
- `reading_sessions.duration_seconds >= 0`
- `reading_sessions.ended_at` NULL or `>= started_at`
- `reading_attention` counts are nonnegative; face-direction counts do not exceed detected-face counts, and categorized counts do not exceed all samples
- `book_issues.status` IN (`active`, `returned`, `expired`)
- `book_issues.due_at > issued_at`
- `user_token_wallets.balance >= 0`
- `token_transactions.amount <> 0` and sign matches type (credits positive, `book_issue` negative)

**Not-null:** titles, slugs, status, language_code, user email, timestamps as listed above. `password_hash` is required only for email/password-only accounts.

**UUID generation:** PostgreSQL 16 provides `gen_random_uuid()` in core. `pgcrypto` is **not required** for this catalog. Do **not** enable `pg_trgm` in the first migration.

---

## 7. Indexes

**Unique (also serve lookups)**

- `categories(slug)`
- `authors(slug)`
- `books(slug)`
- partial unique `books(isbn)` WHERE `isbn IS NOT NULL`
- `users(email)`
- partial unique `users(google_sub)` WHERE `google_sub IS NOT NULL`
- `user_token_wallets(user_id)`

**Foreign keys / filters**

- `categories(parent_id)`
- `book_authors(author_id)` (PK already covers `book_id`)
- `book_categories(category_id)` (PK already covers `book_id`)

**Catalog browse**

- `books(status, published_at DESC)` WHERE `status = 'published'`
- `books(language_code)` for language filter
- `book_issues(user_id, issued_at DESC)`
- `book_issues(book_id)`
- `token_transactions(user_id, created_at DESC)`
- `token_transactions(transaction_type)`
- `reading_progress(book_id)`
- `reading_progress(user_id, updated_at DESC)`
- `reading_sessions(book_id)`
- `reading_sessions(user_id, started_at DESC)`
- `reading_attention(user_id, updated_at DESC)`

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
- **Users own issues and wallets:** `book_issues` and token tables reference `users.id`; catalog tables stay independent of auth.

---

## 10. Future compatibility

| Future feature | How this schema supports it |
|----------------|------------------------------|
| In-app reader | `content_storage_key`, `content_format`, `total_pages` |
| Resume / progress | `reading_progress(user_id, book_id, progress_percent)` — HTML scroll percent |
| Measured reading time | `reading_sessions` duration accumulated from visible reader time |
| Visual reading cues | `reading_attention` stores per-session aggregates only; raw camera frames are not retained |
| Book issues / tokens | `book_issues`, `user_token_wallets`, `token_transactions` |
| XP / level rewards | Reuse `token_transactions.transaction_type = 'level_reward'` |
| Premium issue cost | Application config / later book flags; wallet schema unchanged |
| Recommendations | Join `book_categories` + future reading history |
| Search | Add `pg_trgm` later without changing entity list |
| EPUB | Same files + `content_format`; parser later |
| Auth | `users` email/password + `google_sub`; Cortex JWT |

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
8. `008_create_book_issues.sql`
9. `009_create_token_wallets.sql`
10. `010_add_google_oauth.sql`
11. `011_add_user_display_name.sql`
12. `012_create_reading_progress.sql`
13. `013_create_reading_sessions.sql`
14. `014_create_reading_attention.sql`

Development seed (idempotent): `database/seeds/001_catalog_seed.sql`

---

## Implementation note

Catalog tables contain 100 published public-domain works with local HTML. Browse APIs: `GET /api/books` and `GET /api/books/:id` (public). Content API: `GET /api/books/:id/content` requires a Cortex JWT and an active issue for that book. Catalog UI is public; in-app HTML reader is gated. `users` supports email/password, Google OAuth, and optional `display_name`. Authenticated issuing charges tokens atomically; My Library lists and returns issues without refunding tokens. `GET /api/analytics` aggregates the authenticated user's issues, `reading_progress`, measured `reading_sessions` time, per-session visual-cue aggregates, and token spends. Reader profile uses `GET /api/auth/me`, `GET /api/auth/profile`, and `PUT /api/auth/profile`. Reading progress uses `GET /api/books/:id/progress` and `PUT /api/books/:id/progress` (`reading_progress.progress_percent`). Reading time uses `POST /api/books/:id/reading-sessions/start|heartbeat|stop`. Optional visual cues use authenticated `POST/GET /api/books/:id/reading-sessions/:sessionId/visual-cues`; the backend forwards a transient image to the internal token-protected ML endpoint and stores only aggregate counts.
