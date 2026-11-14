-- =====================================================================
--  Онлайн-школа: схема базы данных
--  Запускать ОДИН раз в новом проекте: Supabase → SQL Editor → New query →
--  вставить весь файл → Run.
-- =====================================================================

-- ---------- Роли и профили ----------
create type public.user_role as enum ('admin', 'teacher', 'student');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  email      text,
  role       public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- Профиль создаётся автоматически при создании пользователя.
-- Роль берётся из app_metadata (его может задать только сервер/админ, не сам пользователь).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Классы ----------
create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.class_students (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  primary key (class_id, student_id)
);

-- ---------- Курсы, уроки, материалы ----------
create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  title       text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table public.lessons (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  title      text not null,
  content    text not null default '',
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table public.materials (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  kind         text not null check (kind in ('video', 'file', 'link')),
  name         text not null,
  storage_path text,          -- путь в хранилище (bucket "materials")
  url          text,          -- для ссылок (YouTube и т.п.)
  created_at   timestamptz not null default now()
);

-- ---------- Домашние задания и сдачи ----------
create table public.assignments (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes (id) on delete cascade,
  lesson_id       uuid references public.lessons (id) on delete set null,
  title           text not null,
  description     text not null default '',
  due_at          timestamptz,
  max_score       int not null default 5 check (max_score > 0),
  attachment_path text,
  attachment_name text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  answer_text   text not null default '',
  file_path     text,
  file_name     text,
  -- submitted = ждёт проверки, graded = оценено, returned = отправлено на доработку
  status        text not null default 'submitted' check (status in ('submitted', 'graded', 'returned')),
  score         int,
  feedback      text,
  graded_by     uuid references public.profiles (id) on delete set null,
  graded_at     timestamptz,
  submitted_at  timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create index on public.class_students (student_id);
create index on public.courses (class_id);
create index on public.lessons (course_id);
create index on public.materials (lesson_id);
create index on public.assignments (class_id);
create index on public.submissions (assignment_id);
create index on public.submissions (student_id);

-- ---------- Вспомогательные функции для прав доступа ----------
create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.can_edit_class(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.classes where id = cid and teacher_id = auth.uid())
$$;

create or replace function public.can_view_class(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_edit_class(cid)
      or exists (select 1 from public.class_students where class_id = cid and student_id = auth.uid())
$$;

create or replace function public.course_class(course uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select class_id from public.courses where id = course
$$;

create or replace function public.lesson_class(lesson uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select c.class_id from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson
$$;

create or replace function public.assignment_class(assignment uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select class_id from public.assignments where id = assignment
$$;

-- ---------- Row Level Security ----------
alter table public.profiles       enable row level security;
alter table public.classes        enable row level security;
alter table public.class_students enable row level security;
alter table public.courses        enable row level security;
alter table public.lessons        enable row level security;
alter table public.materials      enable row level security;
alter table public.assignments    enable row level security;
alter table public.submissions    enable row level security;

-- profiles: имена видят все вошедшие; менять может только админ
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_admin_update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- classes
create policy "classes_select" on public.classes for select to authenticated
  using (public.can_view_class(id));
create policy "classes_admin_all" on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- class_students
create policy "class_students_select" on public.class_students for select to authenticated
  using (student_id = auth.uid() or public.can_edit_class(class_id));
create policy "class_students_admin_all" on public.class_students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- courses
create policy "courses_select" on public.courses for select to authenticated
  using (public.can_view_class(class_id));
create policy "courses_edit" on public.courses for all to authenticated
  using (public.can_edit_class(class_id)) with check (public.can_edit_class(class_id));

-- lessons
create policy "lessons_select" on public.lessons for select to authenticated
  using (public.can_view_class(public.course_class(course_id)));
create policy "lessons_edit" on public.lessons for all to authenticated
  using (public.can_edit_class(public.course_class(course_id)))
  with check (public.can_edit_class(public.course_class(course_id)));

-- materials
create policy "materials_select" on public.materials for select to authenticated
  using (public.can_view_class(public.lesson_class(lesson_id)));
create policy "materials_edit" on public.materials for all to authenticated
  using (public.can_edit_class(public.lesson_class(lesson_id)))
  with check (public.can_edit_class(public.lesson_class(lesson_id)));

-- assignments
create policy "assignments_select" on public.assignments for select to authenticated
  using (public.can_view_class(class_id));
create policy "assignments_edit" on public.assignments for all to authenticated
  using (public.can_edit_class(class_id)) with check (public.can_edit_class(class_id));

-- submissions: ученик видит/сдаёт свои, учитель класса видит и оценивает все
create policy "submissions_select" on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.can_edit_class(public.assignment_class(assignment_id)));
create policy "submissions_student_insert" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.class_students cs
      where cs.student_id = auth.uid() and cs.class_id = public.assignment_class(assignment_id)
    )
  );
create policy "submissions_student_update" on public.submissions for update to authenticated
  using (student_id = auth.uid() and status <> 'graded')
  with check (student_id = auth.uid());
create policy "submissions_teacher_update" on public.submissions for update to authenticated
  using (public.can_edit_class(public.assignment_class(assignment_id)))
  with check (public.can_edit_class(public.assignment_class(assignment_id)));
create policy "submissions_teacher_delete" on public.submissions for delete to authenticated
  using (public.can_edit_class(public.assignment_class(assignment_id)));

-- Ученик не может сам поставить себе оценку: защищаем поля проверки.
create or replace function public.guard_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.can_edit_class(public.assignment_class(new.assignment_id)) then
    return new;  -- учитель/админ
  end if;
  if tg_op = 'INSERT' then
    new.score := null; new.feedback := null; new.graded_by := null; new.graded_at := null;
  else
    new.score := old.score; new.feedback := old.feedback;
    new.graded_by := old.graded_by; new.graded_at := old.graded_at;
    new.assignment_id := old.assignment_id; new.student_id := old.student_id;
  end if;
  new.status := 'submitted';
  new.submitted_at := now();
  return new;
end $$;

create trigger submissions_guard
  before insert or update on public.submissions
  for each row execute function public.guard_submission();

-- ---------- Хранилище файлов ----------
-- materials: видео/файлы уроков и вложения к заданиям
-- submissions: файлы, которые сдают ученики (папка = id ученика)
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false), ('submissions', 'submissions', false)
on conflict (id) do nothing;

create policy "materials_read" on storage.objects for select to authenticated
  using (bucket_id = 'materials');
create policy "materials_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.my_role() in ('admin', 'teacher'));
create policy "materials_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.my_role() in ('admin', 'teacher'));

create policy "submissions_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() in ('admin', 'teacher'))
  );
create policy "submissions_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
