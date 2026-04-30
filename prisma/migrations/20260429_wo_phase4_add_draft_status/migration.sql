-- Workflow Overhaul Phase WO-4 — add DRAFT to AssignmentStatus.
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'CREATED';
