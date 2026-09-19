-- Create a profile for every real Supabase Auth account, including existing accounts.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  student_name text;
begin
  student_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Student'), 80);
  insert into public.profiles (id, display_name, initials)
  values (new.id::text, student_name, upper(left(student_name, 2)))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name, initials)
select id::text,
  left(coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1), 'Student'), 80),
  upper(left(coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1), 'Student'), 2))
from auth.users on conflict (id) do nothing;

-- Mutations go through the transactional RPCs, preventing capacity bypasses.
revoke insert, update on public.sessions from authenticated;
revoke insert on public.session_members from authenticated;
revoke insert, update, delete on public.availability from authenticated;
