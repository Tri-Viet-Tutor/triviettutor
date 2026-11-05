-- One-off repair of the Supabase Flyway history (project fwoxupsupabpepgveqhr, checked 2026-10-30).
-- State before: history stops at V18, has a stray V8 "add google id to users" (no V8 file exists;
-- V20 now adds users.google_id with IF NOT EXISTS) and V19's tables already exist without a history row.
-- After this script, `scripts/migrate-database.ps1 -Action Migrate` applies V20..V26 normally.
-- Back up the database first. The script is idempotent and aborts if the schema is not what it expects.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '18' AND success) THEN
        RAISE EXCEPTION 'Expected V18 to be applied; aborting.';
    END IF;
    IF EXISTS (SELECT 1 FROM flyway_schema_history WHERE version::text ~ '^[0-9]+$' AND version::int > 19) THEN
        RAISE EXCEPTION 'History already contains versions above V19; nothing to repair.';
    END IF;
    IF to_regclass('public.subjects') IS NULL OR to_regclass('public.orders') IS NULL
        OR to_regclass('public.order_request_keys') IS NULL THEN
        RAISE EXCEPTION 'V19 tables are missing; let Flyway run V19 instead of marking it applied.';
    END IF;
END $$;

-- The stray V8 entries have no migration file, so Flyway validation rejects them.
DELETE FROM flyway_schema_history WHERE version = '8';

-- V19's schema already matches V19__create_subject_cart_orders.sql exactly; record it as applied.
INSERT INTO flyway_schema_history
    (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT (SELECT max(installed_rank) + 1 FROM flyway_schema_history), '19', 'create subject cart orders', 'SQL',
       'V19__create_subject_cart_orders.sql', 821392035, current_user, now(), 0, true
WHERE NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '19');

COMMIT;
