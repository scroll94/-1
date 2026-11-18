-- Коды для вступления в класс (ученик вводит код при регистрации или в кабинете)
create or replace function public.gen_join_code()
returns text language sql volatile as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))
$$;

alter table public.classes add column if not exists join_code text;
update public.classes set join_code = public.gen_join_code() where join_code is null;
alter table public.classes alter column join_code set default public.gen_join_code();
alter table public.classes alter column join_code set not null;
create unique index if not exists classes_join_code_key on public.classes (join_code);
