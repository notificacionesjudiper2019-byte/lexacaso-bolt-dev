/*
# Add deadline/term columns to cases table

## Purpose
Supports "Términos y vencimientos" — allows users to indicate whether
their case has a legal deadline, and if so, record the duration,
start date, and end date.

## New Columns (all nullable, additive — no data loss)
- has_deadline: text, default 'unknown' — values: 'yes', 'no', 'unknown'
- term_duration: text — e.g. "3 días", "5 días", "30 días", "Otro: 45 días"
- term_start_date: date — when the term begins
- term_end_date: date — calculated or manual end date

## Security
- No RLS changes needed — existing policies scope by auth.uid() = user_id.
- All columns nullable, existing INSERT/UPDATE policies continue to work.
*/

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS has_deadline text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS term_duration text,
  ADD COLUMN IF NOT EXISTS term_start_date date,
  ADD COLUMN IF NOT EXISTS term_end_date date;
