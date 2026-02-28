-- Add created_at to items for sorting (newest/oldest).
alter table items add column if not exists created_at timestamptz default now();
