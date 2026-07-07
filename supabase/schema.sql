-- S.GENCER DERS TAKİP — Supabase şeması
-- Bu dosyayı Supabase projenizde SQL Editor'e yapıştırıp çalıştırın.

create extension if not exists "uuid-ossp";

-- ============ STUDENTS ============
create table if not exists students (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  school text default '',
  subject text default '',
  parent_name text default '',
  phone text default '',
  email text default '',
  fee numeric default 0,
  color text default '#2563eb',
  active boolean default true,
  notes text default '',
  created_at timestamptz default now()
);

-- ============ PLANNED (planlanan / tekrarlayan dersler) ============
create table if not exists planned (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id bigint not null references students(id) on delete cascade,
  lesson_date date not null,
  lesson_time text not null, -- 'HH:MM'
  fee numeric default 0,
  note text default '',
  recurring boolean default false,
  weekday int,
  recurrence_end date,
  parent_plan_id bigint references planned(id) on delete cascade,
  materialized_lesson_id bigint,
  status text default 'planned' -- 'planned' | 'done'
);

-- ============ LESSONS (yapılan / kayıtlı dersler) ============
create table if not exists lessons (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id bigint not null references students(id) on delete cascade,
  lesson_date date not null,
  lesson_time text not null, -- 'HH:MM'
  duration_min int default 90,
  topic text default '',
  fee numeric default 0,
  paid boolean default false,
  notes text default '',
  planned_id bigint references planned(id) on delete set null
);

alter table planned
  add constraint planned_materialized_lesson_fk
  foreign key (materialized_lesson_id) references lessons(id) on delete set null;

create index if not exists idx_students_user on students(user_id);
create index if not exists idx_planned_user on planned(user_id);
create index if not exists idx_planned_date on planned(lesson_date);
create index if not exists idx_lessons_user on lessons(user_id);
create index if not exists idx_lessons_date on lessons(lesson_date);

-- ============ ROW LEVEL SECURITY ============
-- Her kullanıcı sadece kendi verisini görür/değiştirir.
-- Tek kullanıcılı kullanacaksanız bile (sadece siz), bu yine de verinizi
-- internetten korumak için gereklidir.

alter table students enable row level security;
alter table planned enable row level security;
alter table lessons enable row level security;

create policy "students_owner_select" on students for select using (auth.uid() = user_id);
create policy "students_owner_insert" on students for insert with check (auth.uid() = user_id);
create policy "students_owner_update" on students for update using (auth.uid() = user_id);
create policy "students_owner_delete" on students for delete using (auth.uid() = user_id);

create policy "planned_owner_select" on planned for select using (auth.uid() = user_id);
create policy "planned_owner_insert" on planned for insert with check (auth.uid() = user_id);
create policy "planned_owner_update" on planned for update using (auth.uid() = user_id);
create policy "planned_owner_delete" on planned for delete using (auth.uid() = user_id);

create policy "lessons_owner_select" on lessons for select using (auth.uid() = user_id);
create policy "lessons_owner_insert" on lessons for insert with check (auth.uid() = user_id);
create policy "lessons_owner_update" on lessons for update using (auth.uid() = user_id);
create policy "lessons_owner_delete" on lessons for delete using (auth.uid() = user_id);
