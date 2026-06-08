-- ============================================================
-- BEST Academy - Esquema SEGURO (Supabase Auth + RLS)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- Re-ejecutable. Cierra el acceso anónimo a los datos de alumnos.
-- ============================================================

-- 1) Tablas de contenido y de alumnos -----------------------
create table if not exists units (
  id             serial primary key,
  number         integer not null,
  title          text not null,
  description    text,
  duration_hours integer default 1,
  xp_reward      integer default 100,
  created_at     timestamptz default now()
);

create table if not exists activities (
  id             serial primary key,
  unit_id        integer references units(id) on delete cascade,
  area           text not null,
  type           text not null default 'multiple_choice',
  difficulty     integer default 1,
  xp_reward      integer default 10,
  question       text not null,
  options        jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation    text,
  created_at     timestamptz default now()
);

create table if not exists badges (
  id              serial primary key,
  name            text not null,
  description     text,
  icon            text,
  condition_type  text,
  condition_value integer,
  created_at      timestamptz default now()
);

-- students.id = el id del usuario en auth.users (vínculo 1:1 con Supabase Auth)
create table if not exists students (
  id             uuid primary key,
  name           text not null,
  email          text unique,
  avatar_url     text,
  age            integer,
  total_xp       integer not null default 0,
  current_streak integer not null default 0,
  level          integer not null default 1,
  created_at     timestamptz not null default now()
);
-- Si la tabla ya existía sin estas columnas, añadirlas:
alter table students add column if not exists age integer;
alter table students add column if not exists total_xp integer not null default 0;
alter table students add column if not exists current_streak integer not null default 0;
alter table students add column if not exists level integer not null default 1;

create table if not exists student_progress (
  id                  serial primary key,
  student_id          uuid references students(id) on delete cascade,
  unit_id             integer references units(id) on delete cascade,
  area                text not null,
  total_attempts      integer not null default 0,
  correct_attempts    integer not null default 0,
  accuracy_percentage integer not null default 0,
  last_activity_at    timestamptz default now(),
  unique (student_id, unit_id, area)
);

create table if not exists student_responses (
  id              serial primary key,
  student_id      uuid references students(id) on delete cascade,
  activity_id     integer references activities(id) on delete cascade,
  selected_answer text,
  is_correct      boolean not null default false,
  xp_earned       integer not null default 0,
  created_at      timestamptz default now()
);

create table if not exists student_badges (
  id         serial primary key,
  student_id uuid references students(id) on delete cascade,
  badge_id   integer references badges(id) on delete cascade,
  earned_at  timestamptz default now(),
  unique (student_id, badge_id)
);

-- 2) Profesores: quién tiene rol de profesor --------------------
create table if not exists teachers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz default now()
);

-- Helper: ¿el usuario actual es profesor?
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.teachers t where t.user_id = auth.uid());
$$;

-- 3) Vista de rendimiento por área (respeta RLS del invocador) ----
create or replace view student_area_performance as
select
  sp.student_id,
  sp.area,
  sum(sp.total_attempts)::int   as total_attempts,
  sum(sp.correct_attempts)::int as correct_attempts,
  case when sum(sp.total_attempts) > 0
       then round(100.0 * sum(sp.correct_attempts) / sum(sp.total_attempts))::int
       else 0 end               as accuracy
from student_progress sp
group by sp.student_id, sp.area;

alter view student_area_performance set (security_invoker = on);

-- 4) Permisos base de roles ------------------------------------
grant usage on schema public to anon, authenticated;

-- Quitar el acceso amplio que pudiera haber de una configuración previa:
revoke all on all tables in schema public from anon;

-- Contenido: lectura pública; escritura solo usuarios autenticados (RLS = profesor)
grant select on units, activities, badges to anon, authenticated;
grant insert, update, delete on units, activities, badges to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Datos de alumnos: NADA para anon; el acceso de authenticated lo filtra RLS
grant select, insert, update, delete on
  students, student_progress, student_responses, student_badges to authenticated;
grant select on student_area_performance to authenticated;

-- 5) RLS -------------------------------------------------------
alter table units             enable row level security;
alter table activities        enable row level security;
alter table badges            enable row level security;
alter table students          enable row level security;
alter table student_progress  enable row level security;
alter table student_responses enable row level security;
alter table student_badges    enable row level security;
alter table teachers          enable row level security;

-- Limpiar políticas previas (incluida la permisiva "public_all")
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('units','activities','badges','students',
                        'student_progress','student_responses','student_badges','teachers')
  loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end $$;

-- Contenido (units/activities/badges): todos leen; solo profesor escribe
create policy content_read_units   on units      for select to anon, authenticated using (true);
create policy content_read_act     on activities for select to anon, authenticated using (true);
create policy content_read_badges  on badges     for select to anon, authenticated using (true);
create policy content_write_units  on units      for all to authenticated using (is_teacher()) with check (is_teacher());
create policy content_write_act    on activities for all to authenticated using (is_teacher()) with check (is_teacher());
create policy content_write_badges on badges     for all to authenticated using (is_teacher()) with check (is_teacher());

-- students: cada alumno ve/edita su fila; el profesor ve/edita todas
create policy students_self_select on students for select to authenticated
  using (id = auth.uid() or is_teacher());
create policy students_self_update on students for update to authenticated
  using (id = auth.uid() or is_teacher()) with check (id = auth.uid() or is_teacher());
create policy students_teacher_all on students for all to authenticated
  using (is_teacher()) with check (is_teacher());

-- student_progress: el alumno solo lo suyo; profesor todo
create policy progress_self on student_progress for all to authenticated
  using (student_id = auth.uid() or is_teacher())
  with check (student_id = auth.uid() or is_teacher());

-- student_responses: igual
create policy responses_self on student_responses for all to authenticated
  using (student_id = auth.uid() or is_teacher())
  with check (student_id = auth.uid() or is_teacher());

-- student_badges: igual
create policy badges_self on student_badges for all to authenticated
  using (student_id = auth.uid() or is_teacher())
  with check (student_id = auth.uid() or is_teacher());

-- teachers: cada quien ve su propia fila (para comprobar su rol)
create policy teachers_self on teachers for select to authenticated
  using (user_id = auth.uid());

-- 6) RPC pública para el selector de login de alumnos ----------
--    Devuelve solo nombre + email sintético (sin edad ni datos sensibles)
--    para que el alumno elija su nombre y luego escriba su PIN.
create or replace function public.class_roster()
returns table (name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.email from public.students s order by s.name;
$$;

revoke all on function public.class_roster() from public;
grant execute on function public.class_roster() to anon, authenticated;

-- 7) Datos semilla de CONTENIDO (idempotente) ------------------
insert into units (number, title, description, duration_hours, xp_reward)
select * from (values
  (1, 'Getting to Know You', 'The verb to be, the alphabet, personal information and classroom English.', 6, 100),
  (2, 'My Classroom', 'The verb to be, a/an articles, demonstratives, nationalities and classroom objects.', 6, 100),
  (3, 'My Family', 'Possessive adjectives and pronouns, family members, adjectives and telling the time.', 10, 100),
  (4, 'A Normal Day', 'Present simple, daily routines, parts of the house and life styles.', 7, 100)
) as v(number,title,description,duration_hours,xp_reward)
where not exists (select 1 from units);

insert into activities (unit_id, area, type, difficulty, xp_reward, question, options, correct_answer, explanation)
select * from (values
  (1,'grammar','multiple_choice',1,10,'Complete: "I ___ a student."', '["am","is","are","be"]'::jsonb,'am','With the pronoun ''I'' we always use ''am''.'),
  (1,'grammar','multiple_choice',1,10,'Complete: "She ___ from Italy."', '["is","am","are","be"]'::jsonb,'is','Third person singular (she/he/it) uses ''is''.'),
  (1,'grammar','multiple_choice',2,15,'Choose the correct contraction of "you are":', '["you''re","your","youre","you''s"]'::jsonb,'you''re','''you are'' contracts to ''you''re''.'),
  (1,'grammar','multiple_choice',2,15,'Complete: "They ___ not teachers."', '["are","is","am","be"]'::jsonb,'are','''They'' uses ''are'' (negative: aren''t).'),
  (1,'vocabulary','multiple_choice',1,10,'In class, what does "circle" mean?', '["Draw a circle around a word","Speak aloud","Sit down","Close your book"]'::jsonb,'Draw a circle around a word','To ''circle'' a word means to draw a circle around it.'),
  (1,'speaking','multiple_choice',1,10,'How do you ask someone''s name?', '["What''s your name?","How you name?","Where name you?","Who you name?"]'::jsonb,'What''s your name?','The correct question is ''What''s your name?'''),
  (1,'listening','multiple_choice',1,10,'Choose the correct spelling:', '["computer","conputer","computor","compyuter"]'::jsonb,'computer','The correct spelling is ''computer''.'),
  (1,'writing','multiple_choice',2,15,'Which sentence is written correctly?', '["My name is Ana.","my name is ana","Name my is Ana.","is my name Ana"]'::jsonb,'My name is Ana.','Sentences start with a capital letter and end with a period.'),
  (2,'grammar','multiple_choice',1,10,'Choose: "Can I have ___ apple?"', '["an","a","the","one"]'::jsonb,'an','Use ''an'' before vowel sounds (a, e, i, o, u).'),
  (2,'grammar','multiple_choice',1,10,'Choose: "She is ___ teacher."', '["a","an","the","some"]'::jsonb,'a','Use ''a'' before consonant sounds.'),
  (2,'grammar','multiple_choice',2,15,'Plural of "child":', '["children","childs","childes","child"]'::jsonb,'children','''child'' is irregular: the plural is ''children''.'),
  (2,'grammar','multiple_choice',2,15,'Plural of "foot":', '["feet","foots","feets","footes"]'::jsonb,'feet','''foot'' is irregular: the plural is ''feet''.'),
  (2,'grammar','multiple_choice',2,15,'This is near me. Complete: "___ is my book."', '["This","That","Those","These"]'::jsonb,'This','''This'' is for something singular and near.'),
  (2,'vocabulary','multiple_choice',1,10,'Someone from Germany is ___.', '["German","Germany","Germanish","Germanic"]'::jsonb,'German','The nationality for Germany is ''German''.'),
  (2,'vocabulary','multiple_choice',1,10,'You write on the ___ with a marker.', '["board","floor","window","chair"]'::jsonb,'board','In class you write on the board.'),
  (2,'listening','multiple_choice',1,10,'Choose the correct spelling:', '["Thursday","Thusday","Thirsday","Thrusday"]'::jsonb,'Thursday','The day is spelled ''Thursday''.'),
  (3,'grammar','multiple_choice',1,10,'Complete: "I have a sister. ___ name is Susan."', '["Her","His","Their","My"]'::jsonb,'Her','For a female (sister) we use ''Her''.'),
  (3,'grammar','multiple_choice',2,15,'Complete: "The books are ___." (we)', '["ours","our","us","our''s"]'::jsonb,'ours','After the verb we use the possessive pronoun ''ours''.'),
  (3,'grammar','multiple_choice',2,15,'Complete: "He has a dog. ___ dog is big."', '["His","Her","Its","Their"]'::jsonb,'His','For a male (he) we use ''His''.'),
  (3,'vocabulary','multiple_choice',1,10,'Your mother''s brother is your ___.', '["uncle","aunt","cousin","nephew"]'::jsonb,'uncle','Your mother''s (or father''s) brother is your uncle.'),
  (3,'vocabulary','multiple_choice',1,10,'Opposite of "handsome / beautiful":', '["ugly","tall","happy","rich"]'::jsonb,'ugly','The opposite of beautiful/handsome is ''ugly''.'),
  (3,'vocabulary','multiple_choice',2,15,'What time is 6:30?', '["Half past six","Quarter past six","Six o''clock","Half past seven"]'::jsonb,'Half past six','6:30 is ''half past six''.'),
  (3,'speaking','multiple_choice',1,10,'How do you ask someone''s age?', '["How old are you?","How many years you?","What age you have?","How much old you?"]'::jsonb,'How old are you?','The correct question is ''How old are you?'''),
  (3,'writing','multiple_choice',2,15,'Choose the correct sentence:', '["My family is big.","My family are big number.","Family my big.","Is big my family."]'::jsonb,'My family is big.','Subject + verb ''is'' + adjective.'),
  (4,'grammar','multiple_choice',2,15,'Present simple: "I finish -> she ___."', '["finishes","finishs","finish","finiches"]'::jsonb,'finishes','Verbs ending in -sh add ''-es'': finishes.'),
  (4,'grammar','multiple_choice',2,15,'Present simple: "I carry -> she ___."', '["carries","carrys","carryes","caries"]'::jsonb,'carries','Consonant + y changes to ''-ies'': carries.'),
  (4,'grammar','multiple_choice',1,10,'Present simple: "I go -> she ___."', '["goes","gos","goees","go"]'::jsonb,'goes','''go'' adds -es: goes.'),
  (4,'grammar','multiple_choice',1,10,'Present simple: "I play -> she ___."', '["plays","plaies","playes","play"]'::jsonb,'plays','Vowel + y just adds ''-s'': plays.'),
  (4,'vocabulary','multiple_choice',1,10,'In the morning I ___ up at 6 a.m.', '["get","take","do","make"]'::jsonb,'get','The phrasal verb is ''get up''.'),
  (4,'vocabulary','multiple_choice',1,10,'You cook in the ___.', '["kitchen","bedroom","bathroom","attic"]'::jsonb,'kitchen','You cook in the kitchen.'),
  (4,'vocabulary','multiple_choice',1,10,'You sleep in the ___.', '["bedroom","kitchen","garage","laundry"]'::jsonb,'bedroom','You sleep in the bedroom.'),
  (4,'listening','multiple_choice',1,10,'Complete: "I ___ a shower every morning."', '["take","do","make","give"]'::jsonb,'take','The phrase is ''take a shower''.')
) as v(unit_id,area,type,difficulty,xp_reward,question,options,correct_answer,explanation)
where not exists (select 1 from activities);

insert into badges (name, description, icon, condition_type, condition_value)
select * from (values
  ('First Steps', 'Complete your first activity.', '👟', 'activities_completed', 1),
  ('Rising Star', 'Earn 100 XP.',                  '⭐', 'total_xp', 100),
  ('On Fire',     'Reach a 3-day streak.',          '🔥', 'current_streak', 3),
  ('Scholar',     'Earn 500 XP.',                   '🎓', 'total_xp', 500)
) as v(name,description,icon,condition_type,condition_value)
where not exists (select 1 from badges);
