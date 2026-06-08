-- ============================================================
-- BEST Academy - UPGRADES (rachas, logros, ranking)
-- Ejecutar una vez en Supabase -> SQL Editor (después de los esquemas).
-- Idempotente.
-- ============================================================

-- 1) Racha: necesitamos saber la última fecha activa del alumno
alter table students add column if not exists last_active date;

-- 2) RPC de ranking de clase (solo nombre + XP + nivel; sin datos sensibles)
create or replace function public.class_leaderboard()
returns table (name text, total_xp integer, level integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.total_xp, s.level
  from public.students s
  order by s.total_xp desc, s.name
  limit 50;
$$;
revoke all on function public.class_leaderboard() from public;
grant execute on function public.class_leaderboard() to anon, authenticated;

-- 3) Logros (insignias). Reseteamos a un set limpio (nadie las ha ganado aún).
delete from student_badges;
delete from badges;
insert into badges (name, description, icon, condition_type, condition_value) values
  ('Primeros pasos', 'Completa tu primer tema.',        '👟', 'topics_done',     1),
  ('Estrella',       'Gana 100 XP.',                     '⭐', 'total_xp',        100),
  ('Erudito',        'Gana 500 XP.',                     '🎓', 'total_xp',        500),
  ('Campeón',        'Gana 1000 XP.',                    '👑', 'total_xp',        1000),
  ('En racha',       'Alcanza una racha de 3 días.',     '🔥', 'current_streak',  3),
  ('Imparable',      'Alcanza una racha de 7 días.',     '⚡', 'current_streak',  7),
  ('Maestro de palabras', 'Domina 10 palabras.',         '📚', 'vocab_done',      10),
  ('Pro de la práctica',  'Supera 10 niveles.',          '🏋️', 'levels_done',     10);
