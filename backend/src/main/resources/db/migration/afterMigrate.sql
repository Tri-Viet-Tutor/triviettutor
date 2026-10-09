-- Flyway holds a schema-history lock during versioned migrations. Protect its
-- own table only after that lock has been released to avoid blocking migration.
SET LOCAL lock_timeout = '15s';
ALTER TABLE flyway_schema_history ENABLE ROW LEVEL SECURITY;
