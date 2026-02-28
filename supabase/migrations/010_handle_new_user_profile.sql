-- Create profile on signup with display name from auth user metadata (signUp options.data.full_name).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(trim(new.raw_user_meta_data->>'full_name'), '')
  )
  on conflict (id) do update set
    full_name = coalesce(trim(excluded.full_name), profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
