-- Add item type: thing (offering) vs request (asking for something).
-- Same table and sharing (things_to_groups) for both.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_type') then
    create type item_type as enum ('thing', 'request');
  end if;
end
$$;

alter table items add column if not exists type item_type not null default 'thing';

create index if not exists items_requests_idx on items (id) where type = 'request';
