/*
# Add visible_to_client column to case_documents

## Purpose
Allows the system to differentiate between documents the client can see/download
and internal documents that should never be exposed to the client.

## New Column
- visible_to_client: boolean NOT NULL DEFAULT true
  - Existing documents default to true (preserving current behavior where
    the owner can see all their own documents).
  - When an admin marks a document as internal, visible_to_client = false.
  - RLS will enforce that non-owner users (clients in future admin scenarios)
    cannot see documents where visible_to_client = false.

## Security
- No RLS policy changes needed in this migration — current policies already
  scope by auth.uid() = user_id (owner sees their own documents).
- Future admin policies will use visible_to_client to filter what clients see.
- The column is NOT NULL with a safe default, so existing rows are backfilled.
*/

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS visible_to_client boolean NOT NULL DEFAULT true;
