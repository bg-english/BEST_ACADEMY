-- ============================================================
-- BEST Academy - Actividades DISCOVER (teoría interactiva)
-- Ejecutar una vez en Supabase -> SQL Editor. Idempotente.
-- Contenido original A1.3.
-- ============================================================

alter table topics add column if not exists discover jsonb;

-- UNIDAD 1: clasificar pronombre -> forma del verbo to be
insert into topics (unit_id, order_index, kind, title, explanation, discover)
select 1, 5, 'discover', 'Descubre: el verbo TO BE',
  'Clasifica cada pronombre con su forma correcta del verbo to be y descubre la regla.',
  '{"type":"sort","instructions":"Toca un pronombre y luego su forma correcta.","categories":["am","is","are"],"items":[{"text":"I","category":"am"},{"text":"He","category":"is"},{"text":"She","category":"is"},{"text":"It","category":"is"},{"text":"You","category":"are"},{"text":"We","category":"are"},{"text":"They","category":"are"}],"conclusion":"Con I usamos am; con he/she/it usamos is; con you/we/they usamos are."}'::jsonb
where not exists (select 1 from topics where unit_id = 1 and kind = 'discover');

-- UNIDAD 2: clasificar sustantivos en a / an
insert into topics (unit_id, order_index, kind, title, explanation, discover)
select 2, 5, 'discover', 'Descubre: a o an',
  'Clasifica cada palabra segun lleve a o an, y descubre por que.',
  '{"type":"sort","instructions":"Toca una palabra y luego a o an.","categories":["a","an"],"items":[{"text":"apple","category":"an"},{"text":"book","category":"a"},{"text":"egg","category":"an"},{"text":"pen","category":"a"},{"text":"orange","category":"an"},{"text":"teacher","category":"a"},{"text":"umbrella","category":"an"},{"text":"chair","category":"a"}],"conclusion":"Usamos an antes de sonido de vocal (a, e, i, o, u) y a antes de consonante."}'::jsonb
where not exists (select 1 from topics where unit_id = 2 and kind = 'discover');

-- UNIDAD 3: tocar y descubrir los posesivos en una oracion
insert into topics (unit_id, order_index, kind, title, explanation, discover)
select 3, 5, 'discover', 'Descubre: los posesivos',
  'Toca las palabras que indican DE QUIEN es algo.',
  '{"type":"tap","instructions":"Toca las palabras posesivas en la oracion.","sentence":"My brother and her sister are very tall","targets":[{"word":"My","label":"posesivo (de mi)","note":"Va antes del sustantivo: my brother."},{"word":"her","label":"posesivo (de ella)","note":"Va antes del sustantivo: her sister."}],"conclusion":"Los posesivos (my, your, his, her, its, our, their) van antes de un sustantivo."}'::jsonb
where not exists (select 1 from topics where unit_id = 3 and kind = 'discover');

-- UNIDAD 4: clasificar verbos por su terminacion en presente simple (he/she/it)
insert into topics (unit_id, order_index, kind, title, explanation, discover)
select 4, 5, 'discover', 'Descubre: present simple (he/she/it)',
  'Clasifica cada verbo segun como cambia con he/she/it.',
  '{"type":"sort","instructions":"Toca un verbo y luego su terminacion.","categories":["+s","+es","+ies"],"items":[{"text":"work","category":"+s"},{"text":"go","category":"+es"},{"text":"study","category":"+ies"},{"text":"play","category":"+s"},{"text":"watch","category":"+es"},{"text":"carry","category":"+ies"},{"text":"read","category":"+s"},{"text":"finish","category":"+es"}],"conclusion":"La mayoria +s; si termina en s/sh/ch/x/o +es; consonante + y cambia a +ies."}'::jsonb
where not exists (select 1 from topics where unit_id = 4 and kind = 'discover');
