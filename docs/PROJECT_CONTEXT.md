CORTEX LIBRARY — MANDATORY DEVELOPMENT PROTOCOL

IMPORTANT: THIS RULE APPLIES TO EVERY FUTURE CODING TASK.

Before writing, modifying, deleting, refactoring, installing, migrating,
or executing ANY project code, you MUST FIRST READ:

docs/PROJECT_CONTEXT.md

This file is the SINGLE SOURCE OF TRUTH for the Cortex Library project.

==================================================
MANDATORY WORKFLOW
==================================================

For EVERY development request, follow this exact order:

STEP 1 — READ PROJECT CONTEXT

Read:

docs/PROJECT_CONTEXT.md

Do not skip this step even if:
- the requested change appears simple
- you already remember the architecture
- the same file was previously opened
- the task appears unrelated
- the user gives a short instruction such as "next", "fix this",
  "add this", or "continue"

The project context must be treated as authoritative.

--------------------------------------------------

STEP 2 — UNDERSTAND THE CURRENT STATE

After reading PROJECT_CONTEXT.md, inspect the relevant existing files.

Determine:

- current architecture
- current implementation status
- existing APIs
- existing database schema
- existing frontend routes/components
- existing backend routes/controllers/services/repositories
- existing ML service interfaces
- existing Docker configuration
- relevant Jira User Story
- relevant subtasks
- current limitations
- dependencies between components

Do not assume that something exists simply because the project plan says it should exist.

--------------------------------------------------

STEP 3 — CHECK THE TASK AGAINST THE PROJECT THEME

Before coding, explicitly verify:

1. What project objective does this task support?
2. Which Jira User Story does it belong to?
3. Which component/layer should own the functionality?
4. Does the proposed change conflict with any existing architecture rule?
5. Could the change break another completed feature?
6. Does the change require database/API/frontend/ML coordination?

If there is ambiguity or contradiction, STOP and explain it before coding.

--------------------------------------------------

STEP 4 — CREATE AN IMPLEMENTATION PLAN

Before editing files, provide:

A. Objective
B. Related Jira User Story/Subtask
C. Files to create
D. Files to modify
E. Database changes
F. Backend/API changes
G. Frontend changes
H. ML-service changes, if applicable
I. Docker/environment changes, if applicable
J. Integration risks
K. Testing plan

Do not make unrelated changes.

--------------------------------------------------

STEP 5 — IMPLEMENT IN SMALL INTEGRATED STEPS

Implement only the requested feature.

Follow:

Database
    ↓
Backend
    ↓
ML Service if required
    ↓
Frontend
    ↓
Integration
    ↓
Testing

Do not create fake/mock/random data when real persistent data is expected.

Do not create duplicate schemas, duplicate APIs, or duplicate services.

Reuse existing functionality ONLY when it belongs to the new architecture
and has been verified.

--------------------------------------------------

STEP 6 — VALIDATE

After implementation, actually test the affected functionality.

Check:

- database connectivity
- API response
- frontend integration
- authentication/authorization where relevant
- ML communication where relevant
- Docker service communication where relevant
- error handling
- persistence
- user-specific data isolation

Do not claim something is working without verification.

--------------------------------------------------

STEP 7 — UPDATE PROJECT CONTEXT

After a significant completed implementation:

Update:

docs/PROJECT_CONTEXT.md

with:

- completed functionality
- new API endpoints
- database changes
- architectural decisions
- known limitations
- integration status
- current Jira story/subtask status

Do not remove historical decisions unless they are explicitly obsolete.

--------------------------------------------------

STEP 8 — REPORT

At the end provide:

1. What was implemented
2. Files created
3. Files modified
4. Database changes
5. API changes
6. Frontend changes
7. ML changes
8. Docker changes
9. Tests performed
10. Test results
11. Known issues
12. Suggested next development step

==================================================
STRICT PROJECT RULES
==================================================

1. Cortex Library is a NEW project.

Do NOT use the previous Cortex Library implementation as the architecture.

Old code may only be used as reference when explicitly provided.

2. Do not perform destructive migrations.

Never:
- drop tables without explicit approval
- delete user data
- overwrite databases
- remove working features without explanation

3. Do not silently change API contracts.

4. Do not silently change database relationships.

5. Do not put business logic into inappropriate layers.

6. Do not put database queries directly into Express routes.

7. Do not put ML processing into Node.js.

8. Do not put backend/database logic into React components.

9. Do not hardcode credentials.

10. Do not commit .env files.

11. Do not introduce DeepFace or emotion classification.

12. Visual reading cues only estimate face visibility and coarse head
orientation; they do not measure attention, engagement, or psychology.

13. The user's camera feed must remain hidden from the reader.

14. Do not expose facial expressions or emotion labels to the reader.

15. Engagement information shown to the user should be useful and
privacy-conscious.

16. Every user-specific record must be associated with the authenticated
user.

17. Never use random engagement scores in production functionality.

18. Never fake database persistence.

19. Never claim an integration works without testing the complete path.

20. Do not rewrite large portions of the project when a targeted change
is sufficient.

==================================================
SOURCE OF TRUTH PRIORITY
==================================================

When information conflicts, use this priority:

1. Explicit current user instruction
2. docs/PROJECT_CONTEXT.md
3. Current verified project implementation
4. Jira User Story / acceptance criteria
5. Other project documentation
6. Old/reference code

Never allow old code to override the new project architecture.

==================================================
STOP CONDITIONS
==================================================

STOP before coding and ask for clarification if:

- PROJECT_CONTEXT.md conflicts with the requested feature
- database design is ambiguous
- an API contract is unclear
- the requested change could cause data loss
- authentication requirements are unclear
- two components appear to own the same responsibility
- the requested feature contradicts the project's privacy requirements
- implementing the request would require a major architecture change

Do not guess when a decision materially affects the architecture.

==================================================
CORE PROJECT THEME
==================================================

Cortex Library is an intelligent digital library and adaptive reading
ecosystem.

The central experience is:

DISCOVER BOOK
    ↓
ISSUE / ACCESS BOOK
    ↓
READ INSIDE CORTEX LIBRARY
    ↓
TRACK READING PROGRESS
    ↓
BACKGROUND ATTENTION ANALYSIS
    ↓
STORE READING INTELLIGENCE
    ↓
UNDERSTAND READING BEHAVIOUR
    ↓
PERSONALIZED BOOK RECOMMENDATIONS

The system should feel like a realistic digital library enhanced by
reading intelligence, not like a facial-recognition demonstration.

Every future implementation must support this central theme.

PROJECT_CONTEXT.md

1. Project Vision
2. Problem Statement
3. Objectives
4. Main User Stories
5. User Roles
6. System Architecture
7. Technology Stack
8. Database Design
9. API Contracts
10. Frontend Structure
11. ML/Attention Engine
12. Privacy Rules
13. Book Content Strategy
14. Authentication Strategy
15. Recommendation Strategy
16. Docker Architecture
17. Git/GitHub Rules
18. Jira Mapping
19. Current Development Status
20. Known Issues
21. Development Notes
22. Future Work

==================================================
19. CURRENT DEVELOPMENT STATUS
==================================================

Last updated: 2026-10-05

PHASE: Reading attention analysis (CORTEX-23)

JIRA:
- CORTEX-6 — US-01: Browse Digital Library (API and frontend catalog implemented)
- CORTEX-10 — Design Digital Book Catalog Interface (schema implemented in PostgreSQL)
- In-app reader — complete published HTML works served from internal storage; authenticated readers with an active issue can save and restore scroll progress and accumulate visible reading time
- Authentication — email/password register and login, Google Identity token verification, GET /api/auth/me, Cortex JWT
- Book issuing — authenticated loans with token deduction, My Library, returns without refund
- Token wallet — welcome allocation, ledger, configurable issue cost
- Reader analytics — authenticated GET /api/analytics and hash route `#/analytics` (issues, tokens, saved progress, measured reading time)
- CORTEX-20 — US-04: Reader profile view and display-name edit (`#/profile`, GET/PUT `/api/auth/profile`)
- CORTEX-21 — US-05: Save reading progress (`GET/PUT /api/books/:id/progress`, HTML scroll percent)
- CORTEX-19 — reading analytics now joins `reading_progress` and `reading_sessions` for the authenticated user
- CORTEX-22 — deterministic, explainable recommendations from the authenticated user's own issue history, progress, sessions, categories, and authors (`GET /api/recommendations`, `#/recommendations`)
- CORTEX-23 — opt-in MediaPipe/OpenCV face-visibility and approximate head-direction cues; ephemeral frames and per-session aggregate counts only

COMPLETED:
- Root monorepo structure (frontend, backend, ml-service, database, docs)
- React + Vite frontend skeleton with health status page
- Node.js + Express backend skeleton with modular architecture
- Python + FastAPI ML service skeleton
- PostgreSQL Docker service (isolated dev instance)
- Docker Compose orchestration for all four services
- Environment configuration (.env.example files per service)
- Git repository initialized with .gitignore
- Health-check endpoints:
  - Backend: GET /api/health (includes database connectivity)
  - ML Service: GET /health
- Root development scripts (docker:up, docker:down, dev:*)
- README with quick-start instructions

SERVICE PORTS (local development):
- Frontend: 5173
- Backend: 3000
- ML Service: 8000
- PostgreSQL: 5432

ARCHITECTURE DECISIONS:
- Monorepo with separate service directories
- Backend uses routes → controllers → services → repositories pattern
- ML processing isolated in Python FastAPI service (not in Node.js)
- Browser calls backend via VITE_API_URL (localhost-mapped port)
- Frontend image is built with Compose build args `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` (Vite inlines them into `dist/`). Catalog covers are served by the Vite preview middleware from `/storage`.
- Inside Docker Compose, services communicate via service names
- Catalog schema lives in `database/migrations/` and is applied to local PostgreSQL
- Database connectivity uses `pg` Pool in `backend/src/config/database.js`
- Health check runs `SELECT 1` via pool; returns 503 when connection fails
- Development logs include safe DB connection diagnostics (host/port/db/user, error code/message) but never passwords
- Authentication uses bcryptjs password hashes and jsonwebtoken access tokens
- JWT_SECRET and JWT_EXPIRES_IN come from environment configuration (Docker Compose passes them into the backend)
- requireAuth middleware reads `Authorization: Bearer <token>` and attaches `req.user` (public fields only)
- Catalog browse and book details stay public (no requireAuth)
- GET /api/books/:id/content requires a valid Cortex JWT and an active issue for that book (401 / 403 otherwise)
- Identity for content, issues, and tokens always comes from `req.user.id`; client `user_id` is ignored
- Password hashes, plaintext passwords, and JWT secrets are never returned in API bodies or logged
- Frontend JWT is stored in localStorage key `cortex.library.accessToken` (documented in `frontend/src/auth/tokenStorage.js`); the token is not kept in React state
- AuthProvider restores the session on startup with GET /api/auth/me and clears the token on 401
- Catalog, book details, and catalog search API calls from the frontend do not send the Authorization header
- Book content requests send the stored Cortex JWT
- Hash routes `#/login` and `#/register` are public; they do not gate the catalog. The reader `#/books/:id/read` is gated in the UI and enforced by the content API
- Hash route `#/analytics` is public to visit; the API requires a Cortex JWT. Query `user_id` is ignored; aggregates always use `req.user.id`
- SVG covers wrap long titles with a shared multiline helper and keep text inside a clipped safe area; catalog cards use the SVG aspect ratio (2:3) without cropping
- Token balances and issue costs come from environment (`INITIAL_TOKEN_BALANCE`, `BOOK_ISSUE_TOKEN_COST`), not scattered literals
- Book issue and token deduction run in one PostgreSQL transaction with `SELECT … FOR UPDATE` on the wallet
- Duplicate active issues return 409 before tokens are charged; a partial unique index is the second layer
- Returning a book does not refund tokens in this phase
- Google sign-in verifies the Google ID token server-side (`google-auth-library`); the frontend only sends the credential, never a claimed email
- Google OAuth-only users store `google_sub` and a NULL `password_hash`; email/password users keep a bcrypt hash
- Optional `users.display_name` is the only editable reader profile field; email remains the unique login identity
- After Google verification the API issues the same Cortex JWT as email/password login; Google tokens are not stored in localStorage

DATABASE CONNECTION (confirmed 2026-08-29):
- Backend connects to PostgreSQL using discrete env vars: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
- Inside Docker Compose: POSTGRES_HOST=postgres
- Connection pool configuration (`backend/src/config/database.js`):
  - max pool size: 10
  - connection timeout: 5 seconds
  - idle timeout: 30 seconds
- GET /api/health returns HTTP 200 with database: connected when pool can execute SELECT 1

DATABASE DESIGN (CORTEX-10, migrated 2026-08-29):
- Full specification: docs/DATABASE_DESIGN.md
- Migration files (applied, forward-only CREATE):
  - database/migrations/001_enable_extensions.sql
  - database/migrations/002_create_categories.sql
  - database/migrations/003_create_authors.sql
  - database/migrations/004_create_books.sql
  - database/migrations/005_create_book_authors.sql
  - database/migrations/006_create_book_categories.sql
  - database/migrations/007_create_users.sql
  - database/migrations/008_create_book_issues.sql
  - database/migrations/009_create_token_wallets.sql
  - database/migrations/010_add_google_oauth.sql
  - database/migrations/011_add_user_display_name.sql
  - database/migrations/012_create_reading_progress.sql
  - database/migrations/013_create_reading_sessions.sql
  - database/migrations/014_create_reading_attention.sql
- Entities created: categories, authors, books, book_authors, book_categories, users, book_issues, user_token_wallets, token_transactions, reading_progress, reading_sessions, reading_attention
- books M:N categories via book_categories (no books.primary_category_id)
- categories.parent_id for hierarchical taxonomy; no separate genres table
- language_code VARCHAR(10)
- Book content: application-managed files referenced by content_storage_key; first reader uses HTML
- No pg_trgm; gen_random_uuid() from PostgreSQL 16 core
- Development seed data (idempotent, applied 2026-08-30):
  - File: database/seeds/001_catalog_seed.sql
  - Sources/license notes: database/seeds/SOURCES.md
  - Optional file generator: database/seeds/generate-book-files.mjs
  - 11 categories (hierarchical), 9 authors, 10 published books
  - 10 book_authors, 15 book_categories
  - Complete public-domain HTML at storage/books/{book_id}/content.html (10 titles; same deterministic UUIDs)
  - Project-owned SVG covers at storage/books/{book_id}/cover.svg
  - Byte sizes, total_pages, and estimated_reading_minutes are derived from the stored files (`002_update_content_byte_sizes.sql`)
  - Re-running the seed UPSERTs by deterministic UUID; it does not create duplicate rows
  - ISBN is NULL (original editions predate ISBN)
  - Seeded texts are complete US public-domain literary works from Project Gutenberg UTF-8 plain text (not Gutenberg HTML or catalog pages). See database/seeds/SOURCES.md.
- Repeatable, resumable catalog expansion tool: `database/seeds/import-gutenberg-catalog.mjs`; retries transient HTTPS failures with a bounded policy and records page checkpoints/failures. The live catalog was verified at 100 books on 2026-10-05 (10 originals plus 90 Gutenberg imports); page 4 is currently pending upstream recovery. See `database/seeds/SOURCES.md`.

CATALOG API (CORTEX-6, 2026-08-31):
- GET /api/books — published catalog list
  - Query: page (default 1), limit (1–50, default 10), q (title ILIKE, max 200 chars), category (UUID or slug), sort (title | published_at | publication_year; default title)
  - Category filter includes descendant categories (recursive)
  - Response: { books, pagination: { page, limit, total, totalPages } }
  - List items include authors, categories, contentAvailable
  - Invalid query → 400
- GET /api/books/:id — published book details
  - :id must be a UUID → 400 otherwise
  - Includes authors, categories (with parentId), content availability (format, totalPages, estimatedReadingMinutes, byteSize)
  - Unpublished or missing → 404
- Implementation: routes → controllers → services → repositories; parameterized SQL
- Tests: backend `npm test` (node:test, src/books.api.test.js) against PostgreSQL
- Frontend catalog (CORTEX-6, 2026-08-31):
  - Hash routes: `#/` catalog, `#/books/:id` details, `#/status` health page
  - Title search (`q`), category filter (slug), pagination (8 per page)
  - Book cards: cover, title, authors, description, categories
  - Covers served by Vite middleware from `storage/books/{id}/cover.*` (read-only Docker mount at `/storage`)
  - Loading, empty, and error states

BOOK CONTENT API (2026-09-02):
- GET /api/books/:id/content — streams stored HTML for a published book that the caller has actively issued
  - requireAuth: missing/invalid JWT → 401
  - No active issue for `req.user.id` + that book → 403 `This book is not in your library.`
  - :id must be a UUID → 400 otherwise
  - Resolves file only from the book's `content_storage_key` in PostgreSQL
  - Allowed key shape: `storage/books/{same-book-id}/content.html` under BOOK_STORAGE_ROOT
  - Client path/query parameters (including `user_id`) are ignored; arbitrary filesystem paths are rejected
  - Unpublished/missing book → 404; missing or non-HTML content → 404
  - Response: text/html; charset=utf-8
- Backend Docker service mounts `./storage` read-only at `/storage` (`BOOK_STORAGE_ROOT=/storage`)

IN-APP READER (2026-09-02):
- Hash route: `#/books/:id/read`
- Public catalog and details; reading requires login and an active issue
- Logged out: login required (link to `#/login?next=/books/:id/read`)
- Logged in without an issue: "This book is not in your library." plus Issue for tokens; after issue, tokens and content refresh immediately
- Loads GET /api/books/:id (public) and GET /api/books/:id/content (authenticated)
- Shows title, authors, readable typography; back to details and My Library
- HTML is rendered from the stored article body (scripts and unsafe tags stripped)
- Saved progress is HTML scroll percentage. It is not a page number, attention score, or reading time
- GET/PUT `/api/books/:id/progress` require the same Cortex JWT and active issue as content
- Reader restores the saved position, shows “n% complete”, and may show “Resumed from n%”
- Saves are debounced on scroll, flushed on a 20s interval, visibility hidden, and reader unmount
- In-reader hash links wait for a progress/session flush before navigating so My Library and Analytics do not load a stale GET ahead of the PUT
- Restore waits for article layout and will not overwrite a saved position with 0% unless the reader actually scrolled
- My Library shows “Not started”, “n% complete”, or “Completed” from PostgreSQL `reading_progress`
- Continue reading opens the existing reader
- Visible reading time uses `POST /api/books/:id/reading-sessions/start|heartbeat|stop`; the reader pauses when the tab is hidden, the window blurs, or the reader is idle (~45s without pointer/keyboard/scroll activity) and flushes about every 25s plus lifecycle events. Session flushes are serialized so a heartbeat cannot race a stop. The Docker frontend image must be rebuilt to pick up reader/analytics UI (`docker compose build frontend`).
- Saved progress is not attention, engagement, or a recommendation score

AUTHENTICATION API (2026-08-31):
- POST /api/auth/register — create account (email + password)
  - Email stored unique and lowercased; password stored as bcrypt hash
  - Success: 201 `{ user: { id, email, createdAt, updatedAt }, token }`
  - Invalid body → 400; duplicate email → 409
- POST /api/auth/login — email + password
  - Success: 200 `{ user, token }`
  - Invalid body → 400; unknown email or wrong password → 401 (same message)
- GET /api/auth/me — current user from JWT
  - Header: `Authorization: Bearer <token>`
  - Success: 200 `{ user }`
  - Missing, invalid, or expired token → 401
- POST /api/auth/google — Google ID token → same `{ user, token }` session model
- GET /api/auth/profile — same safe user payload as `/me` (requireAuth)
- PUT /api/auth/profile — authenticated; updates `users.display_name` for `req.user.id` only
  - Body: `{ displayName }` (required string, trimmed, 1–120 chars)
  - Client `user_id` / `id` / `email` in the body are ignored
  - Success: 200 `{ user }` (no JWT in the body)
  - Invalid/empty name → 400; missing/invalid JWT → 401
- Safe user payload includes `id`, `email`, `displayName`, `createdAt`, `updatedAt`, `hasPassword`, `hasGoogle`
- password_hash, google_sub, and JWT secrets are never included in responses
- Tests: backend `npm test` runs books 12, auth 24, library 22, tokens 10, analytics 8, progress 10, reading sessions 7, recommendations 15, Gutenberg import 4 against PostgreSQL inside Docker

FRONTEND AUTH UI (2026-08-31, Google 2026-09-01):
- Hash routes: `#/login`, `#/register`, `#/profile` (plus existing catalog, details, reader, library, analytics, status)
- `#/profile` is public to visit; logged-out users see the existing login CTA with `next=/profile` and no profile data. The API requires a Cortex JWT
- Site nav: Log in / Register when signed out; Catalog, My Library, Analytics, Profile, email, token balance, and Log out when signed in
- AuthProvider (`frontend/src/context/AuthContext.jsx`) owns session: register, login, loginWithGoogle, logout, restore, updateProfile
- TokenProvider loads GET /api/tokens for the signed-in user and refreshes after issue
- Forms validate email format before calling the API (trim + lowercase; reject incomplete domains such as `abc@gmail`); backend validation is authoritative
- Duplicate email (409) and invalid credentials (401) surface the API error message
- Passwords use `type=password` and are not stored; JWT is never rendered or logged
- Continue with Google uses Google Identity Services in the browser; only `VITE_GOOGLE_CLIENT_ID` is public. Backend verifies with `GOOGLE_CLIENT_ID`. Both must be the same Web client ID; `GOOGLE_CLIENT_SECRET` is unused for this GIS button flow.

BOOK ISSUING AND MY LIBRARY (2026-08-31, tokens 2026-09-01):
- POST /api/books/:id/issue — authenticated; published books only; one active issue per user+book
  - Invalid UUID → 400; missing/unpublished → 404; duplicate active → 409
  - Requires `BOOK_ISSUE_TOKEN_COST` tokens (default 2); insufficient balance → 402
  - Deducts tokens and inserts `book_issue` + `token_transactions` (`book_issue`) atomically
  - Identity from `req.user.id` only
- GET /api/library — authenticated list of the current user's issues
  - Each issue includes `progressPercent` (number or null). Null means no saved position (Not started). This is scroll percent, not a page number.
- POST /api/library/:issueId/return — authenticated; owner only; no token refund
- Hash route `#/library`; details page Issue / Not enough tokens / Already in My Library

TOKEN WALLET API (2026-09-01):
- GET /api/tokens — authenticated `{ balance, issueCost, transactions }`
- Query `user_id` is ignored; data is always for `req.user.id`
- Transaction history omits internal ids; `password_hash` is never returned
- New accounts (email/password or Google) receive `INITIAL_TOKEN_BALANCE` (default 10) once as `welcome_bonus`
- Ledger types reserved now: `welcome_bonus`, `book_issue`, `admin_grant`, `level_reward` (level_reward is not implemented)

READER ANALYTICS API (CORTEX-19, 2026-10-03):
- GET /api/analytics — authenticated summary for `req.user.id` only; client `user_id` is ignored
- Empty report when the user has no `book_issues` (`hasIssueHistory: false`, zeroed counts, empty lists)
- Includes unique/total issues, active/returned/expired counts, tokens spent on issues, catalog page/minute estimates for issued titles, category breakdown, currently issued, recently issued, recently returned
- `readingProgress` joins `reading_progress` on `(user_id, book_id)`: booksStarted, booksCompleted, averageProgressPercent, per-book progress and measured seconds
- `readingTime` sums `reading_sessions.duration_seconds`: totalSeconds, totalMinutes, recentSessions
- Catalog minutes/pages are labeled as catalog estimates, not measured reading time
- `unavailable.attention` explains when optional visual-cue samples are unavailable; progress and sessions remain separately reported
- Does not fabricate session, progress, or attention scores
- Reader reports session startup, heartbeat, and progress load/save failures in an alert and logs the underlying error to the browser console
- Tests: `backend/src/analytics.api.test.js`, `backend/src/readingSessions.api.test.js`
- Frontend: `#/analytics` shows progress totals, per-book progress and measured time, and catalog estimates with explicit catalog labels; nav links from SiteNav and My Library

READER PROFILE (CORTEX-20, 2026-10-03):
- Hash route `#/profile` loads GET `/api/auth/profile` for the signed-in user
- Edit/Save/Cancel update PUT `/api/auth/profile` (`displayName` only)
- Sign-in methods shown as booleans (`hasPassword` / `hasGoogle`); `google_sub` is never sent to the client
- Member since uses `users.created_at`
- Logout uses the existing AuthProvider session clear

READING PROGRESS API (CORTEX-21, 2026-10-03):
- Table `reading_progress`: one row per `(user_id, book_id)` with `progress_percent` 0–100
- GET /api/books/:id/progress — requireAuth and an active issue for `req.user.id`
  - Success: 200 `{ progress: { bookId, progressPercent, updatedAt } }`
  - No row yet: `progressPercent` and `updatedAt` are null
- PUT /api/books/:id/progress — body `{ progressPercent }` (finite number, 0–100)
  - Identity from `req.user.id` only; client `user_id` is ignored
  - Upserts the caller's row; 200 `{ progress }`
  - Invalid/missing/negative/>100 → 400; missing JWT → 401; no active issue (including returned) → 403
- Progress is HTML scroll percentage. It is not a page number, attention score, or reading time.
- Tests: `backend/src/progress.api.test.js`

READING SESSION API (2026-10-03):
- Table `reading_sessions`: open or closed intervals of visible reading time per user and book
- POST /api/books/:id/reading-sessions/start — requireAuth and an active issue; reuses the open row if one exists
- POST /api/books/:id/reading-sessions/heartbeat — body `{ elapsedSeconds }` (integer 0–60); adds to the open session
- POST /api/books/:id/reading-sessions/stop — optional `{ elapsedSeconds }`; closes the open session; extra stop does not add time
- Identity from `req.user.id` only; missing JWT → 401; no active issue (including returned/expired) → 403; invalid duration → 400
- Duration is accumulated active seconds from the reader, not wall-clock time the tab was merely open
- Tests: `backend/src/readingSessions.api.test.js`

VISUAL READING CUES (CORTEX-23, 2026-10-05):
- CPU MediaPipe Face Mesh with OpenCV image decoding estimates face visibility and coarse head orientation; there is no person recognition, emotion inference, or DeepFace. MediaPipe's bundled CPU runtime uses TFLite; no TensorFlow Python package is installed directly.
- Reader camera use is opt-in through a user click and browser permission. A hidden video element is sampled every 15 seconds only while the reader tab is visible and focused.
- The camera is stopped when the reader is hidden, blurred, or left. Small JPEG frames are sent through the authenticated backend to the internal ML service; they are never written to storage, logs, or PostgreSQL.
- Authenticated `POST/GET /api/books/:id/reading-sessions/:sessionId/visual-cues`; session ownership comes from `req.user.id`, and recording requires the session and issue to remain active.
- Backend authenticates to `POST http://ml-service:8000/analyze/frame` with `ML_SERVICE_TOKEN`; the ML route requires the shared internal token.
- `reading_attention` stores per-session counts only: sample count, face detected, approximate forward-facing, turned-away, and no-face. `GET /api/analytics` aggregates only the authenticated user's counts.
- These visual cues do not establish attention, understanding, emotion, or engagement. Screen-facing/head pose is only an approximate visual proxy.
- Tests: `backend/src/readingAttention.api.test.js` and `ml-service/tests/test_visual_cues.py`.

PERSONALIZED RECOMMENDATIONS API (CORTEX-22, 2026-10-05):
- Authenticated `GET /api/recommendations`; derives user identity only from `req.user.id`
- Uses only the current user's issued-book history, saved progress, and measured session seconds plus catalog categories/authors
- Candidates must be published, have reader content metadata, and never previously issued by the current user
- Deterministic score: each matched category contributes 3 × source interaction weight; each shared author contributes 1 × source interaction weight. Source weight is 1 + progress fraction (0–1) + capped session support (0–0.25 at 20 minutes)
- Scores are ranking values, not probabilities. Reasons cite actual source titles/categories/authors; session duration is supporting interaction depth and is not treated as a like signal
- Empty/insufficient history returns an explicit state. No attention, emotion, sentiment, or cross-user popularity signals are fabricated
- No new database tables or migrations. Frontend `#/recommendations` reuses the existing book cards and catalog links

GOOGLE OAUTH API (2026-09-01):
- POST /api/auth/google — body `{ credential }` (Google ID token)
  - Verifies audience against `GOOGLE_CLIENT_ID`
  - Unverified or incomplete identity → 401; missing credential → 400; unconfigured client → 503
  - Existing `google_sub` or matching verified email logs into that user (no duplicate)
  - New Google users are created without a password hash and receive the welcome wallet once
  - Success: 200 `{ user, token }` (Cortex JWT)

BOOK CONTENT STRATEGY:
- Users read inside Cortex Library (React reader); backend serves stored files
- Do not redirect to external sites, require PDF download, or store external reading URLs
- Example key: storage/books/{book_id}/content.html
- content_format CHECK: html | epub | markdown (EPUB parsing later)
- Development catalog stores **complete public-domain works**, not excerpts
- Source: Project Gutenberg plain-text ebooks, converted to semantic HTML by `database/seeds/generate-book-files.mjs`
- HTML is article/section/h1/h2/p only; no scripts, iframes, forms, or outbound reading links
- Covers are original Cortex Library SVGs, not publisher artwork

NOT YET IMPLEMENTED:
- XP, levels, and level-up token rewards
- Premium vs standard book token pricing
- Calibrated measures of actual attention or engagement (the current cues do not claim these)
- Payments
- Google GIS is inlined at frontend image build. Docker Compose passes `VITE_GOOGLE_CLIENT_ID` (falling back to `GOOGLE_CLIENT_ID`) as a build arg. The frontend image does not receive `GOOGLE_CLIENT_SECRET`. After changing the client ID, rebuild the frontend image (`docker compose build frontend`).

NEXT RECOMMENDED PHASE:
Next work should be selected from the Jira backlog after CORTEX-23 verification. Recommendations remain deterministic and content-based; they do not infer attention, emotion, or sentiment. Token ledger already accepts a future `level_reward` type; issue cost stays centralized so premium pricing can be added later without changing the wallet schema.

==================================================
20. KNOWN ISSUES
==================================================

- The frontend Compose service serves a built image. After changing reader, library, or analytics UI, rebuild with `docker compose build frontend` (or `docker compose up --build frontend`). Backend source is bind-mounted and does not need an image rebuild for JS changes.
  - `GOOGLE_CLIENT_ID` (backend ID-token audience)
  - `VITE_GOOGLE_CLIENT_ID` (frontend GIS; public; Compose falls back to `GOOGLE_CLIENT_ID` if unset)
  - Both values must match. Do not put `GOOGLE_CLIENT_SECRET` in the frontend or in frontend build args.
  - Authorized JavaScript origins must include `http://localhost:5173`.
  - Rebuild the frontend image after changing these variables so Vite can inline `VITE_GOOGLE_CLIENT_ID`.

==================================================
21. DEVELOPMENT NOTES
==================================================

DATABASE OPERATIONS (operational guidance — not a current defect):

- `POSTGRES_PASSWORD` in `.env` is only applied when the `postgres_data` Docker volume is first created.
- Changing `POSTGRES_PASSWORD` in `.env` after the volume already exists does not automatically update the stored PostgreSQL role password.
- If credentials are changed in `.env`, align the database role password explicitly, for example:
  `ALTER USER cortex_user WITH PASSWORD 'your_password';`
- Alternatively, recreate the volume only when local data loss is acceptable.

==================================================
22. FUTURE WORK
==================================================

- XP / levels / reading-time rewards credited as `level_reward`
- Premium book classification and higher issue costs
- Evaluate cue calibration, device compatibility, and privacy/accessibility implications before using visual cues for additional personalization
- Personalized recommendations
