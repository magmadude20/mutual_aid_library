-- Drop items.is_public: app no longer uses it. Update RLS so visibility = owner OR shared via group.

-- 1. Update item_visible_to_user: remove is_public check (visible if owner or in a group that has the thing)
create or replace function item_visible_to_user(item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from items i
    where i.id = item_id
    and (
      i.user_id = auth.uid()
      or exists (
        select 1 from things_to_groups tg
        join group_members gm on gm.group_id = tg.group_id and gm.user_id = auth.uid()
        where tg.thing_id = i.id
      )
    )
  );
$$;

-- 2. Update things_to_groups select policy: remove is_public (visible if owner or group member)
drop policy if exists "things_to_groups_select_visible" on things_to_groups;

create policy "things_to_groups_select_visible"
  on things_to_groups for select
  using (
    exists (select 1 from items i where i.id = things_to_groups.thing_id and i.user_id = auth.uid())
    or exists (
      select 1 from group_members gm
      where gm.group_id = things_to_groups.group_id and gm.user_id = auth.uid()
    )
  );

-- 3. Drop the column
alter table items drop column if exists is_public;
