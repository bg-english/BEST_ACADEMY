-- ============================================================
-- BEST Academy - Motor de TEORÍA y PRÁCTICA (aditivo)
-- Ejecutar en Supabase -> SQL Editor (después de schema.sql).
-- Re-ejecutable. Depende del helper is_teacher() de schema.sql.
-- ============================================================

-- 1) CONTENIDO DE TEORÍA -----------------------------------

-- Temas dentro de una unidad (gramática o vocabulario)
create table if not exists topics (
  id          serial primary key,
  unit_id     integer references units(id) on delete cascade,
  order_index integer not null default 0,
  kind        text not null default 'grammar',   -- 'grammar' | 'vocabulary'
  title       text not null,
  explanation text,                               -- explicación visual (markdown ligero): qué/cómo/cuándo/por qué
  created_at  timestamptz default now()
);

-- ~10 ejemplos por tema (para temas de gramática)
create table if not exists topic_examples (
  id          serial primary key,
  topic_id    integer references topics(id) on delete cascade,
  order_index integer not null default 0,
  text        text not null,                      -- el ejemplo en inglés
  note        text                                -- traducción/aclaración en español (opcional)
);

-- ~5 ejercicios de validación por tema (opción múltiple)
create table if not exists topic_practice (
  id             serial primary key,
  topic_id       integer references topics(id) on delete cascade,
  order_index    integer not null default 0,
  question       text not null,
  options        jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation    text
);

-- Palabras de vocabulario (para temas kind='vocabulary')
-- reference_definition y examples son SECRETOS: solo el servidor (service_role)
-- los lee, para que el alumno no copie la respuesta desde la base de datos.
create table if not exists vocabulary_words (
  id                   serial primary key,
  topic_id             integer references topics(id) on delete cascade,
  order_index          integer not null default 0,
  word                 text not null,
  part_of_speech       text,                      -- noun | verb | adjective | adverb | ...
  phonetic             text,
  reference_definition text,                      -- SECRETO: referencia para el calificador IA
  examples             jsonb not null default '[]'::jsonb  -- SECRETO: 5 ejemplos, se muestran al acertar
);

-- 2) CONTENIDO DE PRÁCTICA ---------------------------------

-- Ejercicios de práctica con niveles, tipos variados y (en niveles altos) tiempo
create table if not exists practice_exercises (
  id             serial primary key,
  unit_id        integer references units(id) on delete cascade,
  area           text not null,                   -- vocabulary | grammar | listening | speaking | writing
  level          integer not null default 1,      -- 1..N (dificultad creciente)
  type           text not null default 'multiple_choice',  -- multiple_choice | fill_blank | true_false | reorder
  timed          boolean not null default false,
  time_limit_seconds integer,                      -- solo si timed
  prompt         text not null,                   -- enunciado/instrucción
  payload        jsonb not null default '{}'::jsonb, -- datos según tipo (options, words, etc.)
  correct_answer text not null,                   -- respuesta correcta (texto u orden serializado)
  explanation    text,
  xp_reward      integer not null default 10,
  created_at     timestamptz default now()
);

-- 3) PROGRESO DEL ALUMNO -----------------------------------

create table if not exists student_topic_progress (
  id           serial primary key,
  student_id   uuid references students(id) on delete cascade,
  topic_id     integer references topics(id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique (student_id, topic_id)
);

-- Definiciones y oraciones que escribe el alumno por palabra
create table if not exists student_vocab (
  id            serial primary key,
  student_id    uuid references students(id) on delete cascade,
  word_id       integer references vocabulary_words(id) on delete cascade,
  definition    text,
  definition_ok boolean not null default false,
  sentences     jsonb not null default '[]'::jsonb,
  sentences_ok  boolean not null default false,
  updated_at    timestamptz default now(),
  unique (student_id, word_id)
);

create table if not exists student_practice_attempts (
  id               serial primary key,
  student_id       uuid references students(id) on delete cascade,
  exercise_id      integer references practice_exercises(id) on delete cascade,
  is_correct       boolean not null default false,
  time_taken_seconds integer,
  created_at       timestamptz default now()
);

-- Estadística por (alumno, unidad, área): nivel alcanzado y dominio
create table if not exists student_practice_stats (
  id             serial primary key,
  student_id     uuid references students(id) on delete cascade,
  unit_id        integer references units(id) on delete cascade,
  area           text not null,
  level_reached  integer not null default 1,
  total_answered integer not null default 0,
  total_correct  integer not null default 0,
  updated_at     timestamptz default now(),
  unique (student_id, unit_id, area)
);

-- 4) PERMISOS + RLS ----------------------------------------
grant usage on schema public to anon, authenticated;

do $$
declare t text;
begin
  -- Quitar acceso por defecto en las tablas nuevas y reconfigurar con precisión
  foreach t in array array[
    'topics','topic_examples','topic_practice','vocabulary_words','practice_exercises',
    'student_topic_progress','student_vocab','student_practice_attempts','student_practice_stats'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('revoke all on table %I from anon, authenticated;', t);
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;

-- Contenido visible para alumnos (lectura). OJO: en vocabulary_words se conceden
-- solo columnas no secretas (sin reference_definition ni examples).
grant select on topics, topic_examples, topic_practice, practice_exercises to anon, authenticated;
grant select (id, topic_id, order_index, word, part_of_speech, phonetic)
  on vocabulary_words to anon, authenticated;

-- Escritura de contenido: solo profesor (vía service_role en /api, o RLS para profesor autenticado)
grant insert, update, delete on
  topics, topic_examples, topic_practice, vocabulary_words, practice_exercises to authenticated;

-- Tablas de progreso: el alumno gestiona lo suyo; el profesor ve todo
grant select, insert, update, delete on
  student_topic_progress, student_vocab, student_practice_attempts, student_practice_stats
  to authenticated;

-- Políticas
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname='public' and tablename in (
      'topics','topic_examples','topic_practice','vocabulary_words','practice_exercises',
      'student_topic_progress','student_vocab','student_practice_attempts','student_practice_stats')
  loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end $$;

-- Contenido: todos leen; solo profesor escribe
create policy t_read   on topics             for select to anon, authenticated using (true);
create policy t_write  on topics             for all to authenticated using (is_teacher()) with check (is_teacher());
create policy te_read  on topic_examples     for select to anon, authenticated using (true);
create policy te_write on topic_examples     for all to authenticated using (is_teacher()) with check (is_teacher());
create policy tp_read  on topic_practice     for select to anon, authenticated using (true);
create policy tp_write on topic_practice     for all to authenticated using (is_teacher()) with check (is_teacher());
create policy vw_read  on vocabulary_words   for select to anon, authenticated using (true);
create policy vw_write on vocabulary_words   for all to authenticated using (is_teacher()) with check (is_teacher());
create policy pe_read  on practice_exercises for select to anon, authenticated using (true);
create policy pe_write on practice_exercises for all to authenticated using (is_teacher()) with check (is_teacher());

-- Progreso: el alumno solo lo suyo; el profesor todo
create policy stp_self on student_topic_progress for all to authenticated
  using (student_id = auth.uid() or is_teacher()) with check (student_id = auth.uid() or is_teacher());
create policy sv_self  on student_vocab for all to authenticated
  using (student_id = auth.uid() or is_teacher()) with check (student_id = auth.uid() or is_teacher());
create policy spa_self on student_practice_attempts for all to authenticated
  using (student_id = auth.uid() or is_teacher()) with check (student_id = auth.uid() or is_teacher());
create policy sps_self on student_practice_stats for all to authenticated
  using (student_id = auth.uid() or is_teacher()) with check (student_id = auth.uid() or is_teacher());
