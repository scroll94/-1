-- Supabase записывает app_metadata отдельным UPDATE после INSERT, поэтому синхронизируем роль и при обновлении.
create or replace function public.sync_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.raw_app_meta_data ->> 'role') is distinct from (old.raw_app_meta_data ->> 'role')
     and (new.raw_app_meta_data ->> 'role') in ('admin', 'teacher', 'student') then
    update public.profiles set role = (new.raw_app_meta_data ->> 'role')::public.user_role where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_role_updated on auth.users;
create trigger on_auth_user_role_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sync_profile_role();
