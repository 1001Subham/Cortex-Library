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

12. The attention engine measures visual attention/engagement signals,
not a person's true emotional or psychological state.

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
21. Future Work

==================================================
19. CURRENT DEVELOPMENT STATUS
==================================================

Last updated: 2026-08-29

PHASE: Foundation (Complete)

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
- Inside Docker Compose, services communicate via service names
- No database tables created yet; migrations folder is placeholder only

NOT YET IMPLEMENTED:
- Authentication (JWT, Google OAuth)
- Database schema and migrations
- Book catalog, categories, issuing
- In-app reader and reading progress
- Attention engine and camera capture
- Reading analytics and engagement storage
- Recommendation engine
- Business API routes beyond health checks

NEXT RECOMMENDED PHASE:
Authentication and user management (registration, login, JWT)

==================================================
20. KNOWN ISSUES
==================================================

- None identified in foundation phase.

==================================================
21. FUTURE WORK
==================================================

- User authentication and authorization
- Database schema design and initial migrations
- Book library management
- Token-based book issuing
- In-app reading interface
- Reading session and progress tracking
- Attention engine integration (OpenCV, MediaPipe)
- Reading analytics dashboard
- Personalized recommendations
