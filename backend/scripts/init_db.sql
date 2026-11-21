-- FrontierAtlas Database Initialization Script
-- This runs on first PostgreSQL container startup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create indexes for better performance (will be created by Alembic migrations)
-- This is a placeholder for any initial data or custom setup

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE frontieratlas TO postgres;