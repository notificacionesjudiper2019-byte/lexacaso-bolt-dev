/*
# Extend cases table with case-specific columns

## Purpose
Adds columns for legal representation, category, location, authority,
entity, case number, and document type — all part of the extended case form.

## Existing Columns (unchanged)
- id, user_id, title, facts, status, priority, created_at, updated_at

## New Columns (all nullable — optional fields, no data loss)
- acting_as: 'own' or 'representative' (default 'own')
- representative_relationship: text (nullable)
- represented_person_name: text (nullable)
- represented_person_cedula: text (nullable)
- represented_person_phone: text (nullable)
- represented_person_address: text (nullable)
- legal_category: text (nullable) — filled in stage 4b with full catalog
- legal_subcategory: text (nullable)
- department: text (nullable)
- municipality: text (nullable)
- authority_type: text (nullable)
- authority_name: text (nullable)
- entity: text (nullable)
- dependency: text (nullable)
- case_number: text (nullable)
- document_type_received: text (nullable)

## Security
- No RLS policy changes needed — existing policies already scope by auth.uid() = user_id.
- New columns are nullable, so existing INSERT/UPDATE policies continue to work.
- No DROP, no type changes, no renames — purely additive.
*/

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS acting_as text DEFAULT 'own',
  ADD COLUMN IF NOT EXISTS representative_relationship text,
  ADD COLUMN IF NOT EXISTS represented_person_name text,
  ADD COLUMN IF NOT EXISTS represented_person_cedula text,
  ADD COLUMN IF NOT EXISTS represented_person_phone text,
  ADD COLUMN IF NOT EXISTS represented_person_address text,
  ADD COLUMN IF NOT EXISTS legal_category text,
  ADD COLUMN IF NOT EXISTS legal_subcategory text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS municipality text,
  ADD COLUMN IF NOT EXISTS authority_type text,
  ADD COLUMN IF NOT EXISTS authority_name text,
  ADD COLUMN IF NOT EXISTS entity text,
  ADD COLUMN IF NOT EXISTS dependency text,
  ADD COLUMN IF NOT EXISTS case_number text,
  ADD COLUMN IF NOT EXISTS document_type_received text;
