-- ============================================================
-- BEST Academy - Esquema completo alineado con el frontend
-- Ejecutar UNA vez en: Supabase Dashboard -> SQL Editor -> New query
-- Seguro de re-ejecutar: borra y recrea (las tablas estaban vacías).
-- ============================================================

-- 1) Limpieza (en orden de dependencias)
drop view  if exists student_area_performance cascade;
drop table if exists student_responses cascade;
drop table if exists student_badges    cascade;
drop table if exists student_progress  cascade;
drop table if exists activities         cascade;
drop table if exists badges             cascade;
drop table if exists units              cascade;
drop table if exists students           cascade;

-- 2) Tablas
create table students (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text unique,
  avatar_url     text,
  total_xp       integer not null default 0,
  current_streak integer not null default 0,
  level          integer not null default 1,
  created_at     timestamptz not null default now()
);

create table units (
  id             serial primary key,
  number         integer not null,
  title          text not null,
  description    text,
  duration_hours integer default 1,
  xp_reward      integer default 100,
  created_at     timestamptz default now()
);

create table activities (
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

create table student_progress (
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

create table student_responses (
  id              serial primary key,
  student_id      uuid references students(id) on delete cascade,
  activity_id     integer references activities(id) on delete cascade,
  selected_answer text,
  is_correct      boolean not null default false,
  xp_earned       integer not null default 0,
  created_at      timestamptz default now()
);

create table badges (
  id              serial primary key,
  name            text not null,
  description     text,
  icon            text,
  condition_type  text,
  condition_value integer,
  created_at      timestamptz default now()
);

create table student_badges (
  id         serial primary key,
  student_id uuid references students(id) on delete cascade,
  badge_id   integer references badges(id) on delete cascade,
  earned_at  timestamptz default now(),
  unique (student_id, badge_id)
);

-- 3) Vista de rendimiento por área (la consume el dashboard del profesor)
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

-- 4) Permisos + RLS
--    La app no usa Supabase Auth: todo entra con la anon key.
--    Por eso se abre acceso al rol anon (app de aula, sin datos sensibles).
grant usage on schema public to anon, authenticated;
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['students','units','activities','student_progress','student_responses','badges','student_badges']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists public_all on %I;', t);
    execute format('create policy public_all on %I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- 5) Datos semilla --------------------------------------------------

insert into units (number, title, description, duration_hours, xp_reward) values
  (1, 'Greetings & Introductions', 'Say hello, introduce yourself and ask basic questions.', 2, 100),
  (2, 'School & Classroom',        'Classroom objects, instructions and school vocabulary.',  2, 100),
  (3, 'Family & Friends',          'Talk about your family, friends and relationships.',       2, 100),
  (4, 'Daily Routine & Time',      'Tell the time and describe your everyday routine.',        2, 100);

-- Actividades (unit 1)
insert into activities (unit_id, area, type, difficulty, xp_reward, question, options, correct_answer, explanation) values
  (1,'vocabulary','multiple_choice',1,10,'Which word is a greeting?', '["Hello","Table","Blue","Run"]','Hello','"Hello" is a common greeting.'),
  (1,'grammar','multiple_choice',1,10,'Complete: "___ name is Ana."', '["My","Me","I","Mine"]','My','We use the possessive "My" before a noun.'),
  (1,'grammar','multiple_choice',2,15,'Choose the correct question: ', '["What is your name?","What you name?","Your name what?","Name your what?"]','What is your name?','Correct word order for a Wh- question.'),
  (1,'listening','multiple_choice',1,10,'A person says "Goodbye". What do they mean?', '["They are leaving","They are hungry","They are happy","They are tired"]','They are leaving','"Goodbye" is said when leaving.');

-- Actividades (unit 2)
insert into activities (unit_id, area, type, difficulty, xp_reward, question, options, correct_answer, explanation) values
  (2,'vocabulary','multiple_choice',1,10,'You write with a...', '["pen","door","window","floor"]','pen','A pen is used to write.'),
  (2,'vocabulary','multiple_choice',1,10,'Where do students sit?', '["chair","cloud","river","shoe"]','chair','Students sit on a chair.'),
  (2,'grammar','multiple_choice',2,15,'Plural of "book": ', '["books","bookes","book","books''"]','books','Regular plural adds -s.'),
  (2,'writing','multiple_choice',2,15,'Which sentence is correct?', '["I have a pencil.","I has a pencil.","I having pencil.","Me have pencil."]','I have a pencil.','Subject + have + object.');

-- Actividades (unit 3)
insert into activities (unit_id, area, type, difficulty, xp_reward, question, options, correct_answer, explanation) values
  (3,'vocabulary','multiple_choice',1,10,'Your mother''s son is your...', '["brother","sister","father","cousin"]','brother','Your mother''s son is your brother.'),
  (3,'grammar','multiple_choice',2,15,'Complete: "She ___ two sisters."', '["has","have","is","are"]','has','Third person singular uses "has".'),
  (3,'speaking','multiple_choice',1,10,'How do you ask about family size?', '["How many people are in your family?","How much family you?","Family how big?","You family many?"]','How many people are in your family?','Correct, natural question form.'),
  (3,'writing','multiple_choice',2,15,'Choose the correct sentence:', '["My family is big.","My family are big number.","Family my big.","Is big my family."]','My family is big.','Subject + verb + adjective.');

-- Actividades (unit 4)
insert into activities (unit_id, area, type, difficulty, xp_reward, question, options, correct_answer, explanation) values
  (4,'vocabulary','multiple_choice',1,10,'What time concept is "morning"?', '["Early in the day","Late at night","A type of food","A place"]','Early in the day','Morning is the early part of the day.'),
  (4,'grammar','multiple_choice',2,15,'Complete: "I ___ up at 7 a.m."', '["get","gets","getting","got up now"]','get','Present simple, first person: "I get up".'),
  (4,'listening','multiple_choice',2,15,'"It''s half past six." What time is it?', '["6:30","6:15","5:30","7:00"]','6:30','"Half past six" = 6:30.'),
  (4,'speaking','multiple_choice',1,10,'Ask the time politely:', '["What time is it, please?","Time what is?","You have time what?","Is what the time you?"]','What time is it, please?','Natural, polite question form.');

-- Badges
insert into badges (name, description, icon, condition_type, condition_value) values
  ('First Steps', 'Complete your first activity.', '👟', 'activities_completed', 1),
  ('Rising Star', 'Earn 100 XP.',                  '⭐', 'total_xp', 100),
  ('On Fire',     'Reach a 3-day streak.',          '🔥', 'current_streak', 3),
  ('Scholar',     'Earn 500 XP.',                   '🎓', 'total_xp', 500);
