-- User location: one location per user (stored in profiles).
-- Run in Supabase SQL Editor if your profiles table exists.

alter table profiles add column if not exists latitude double precision;
alter table profiles add column if not exists longitude double precision;
