-- Cortex Library catalog migrations
-- PostgreSQL 16 provides gen_random_uuid() in core.
-- pg_trgm is intentionally not enabled in this phase (search will add it later).
-- pgcrypto is not required for UUID generation on this stack.

SELECT 1;
