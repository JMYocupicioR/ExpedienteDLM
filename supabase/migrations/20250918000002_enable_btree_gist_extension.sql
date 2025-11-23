-- Ensure required extensions for enhanced appointments system
-- Note: Indexes for appointments table will be created when appointments system is enabled

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
