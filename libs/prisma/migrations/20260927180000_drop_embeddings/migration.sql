-- Remove the RAG embedding column and the pgvector extension.
ALTER TABLE "MaintenanceLog" DROP COLUMN IF EXISTS "embedding";

DROP EXTENSION IF EXISTS "vector";
