-- Optional: drop item location columns (location is now per-user in profiles).
-- Run in Supabase SQL Editor if you want to remove these columns from items.

alter table items drop column if exists latitude;
alter table items drop column if exists longitude;
