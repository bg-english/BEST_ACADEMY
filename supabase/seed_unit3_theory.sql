-- ============================================================
-- Contenido de TEORÍA - Unidad 3 "My Family"
-- Ejecutar después de theory_practice.sql. Idempotente. Contenido original A1.3.
-- ============================================================

do $$
declare p_id integer; t_id integer; v_id integer;
begin
  if exists (select 1 from topics where unit_id = 3) then
    raise notice 'La unidad 3 ya tiene temas; no se vuelve a sembrar.';
    return;
  end if;

  -- ---- TEMA 1 (gramática): Possessive Adjectives ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    3, 1, 'grammar', 'Possessive Adjectives',
    'Los adjetivos posesivos dicen DE QUIÉN es algo. Van SIEMPRE antes de un sustantivo.' || E'\n\n' ||
    '• I → my (mi):  This is my book.' || E'\n' ||
    '• you → your (tu):  That is your pen.' || E'\n' ||
    '• he → his (su, de él):  His name is Luis.' || E'\n' ||
    '• she → her (su, de ella):  Her dog is cute.' || E'\n' ||
    '• it → its (su, de eso):  The cat eats its food.' || E'\n' ||
    '• we → our (nuestro):  Our school is big.' || E'\n' ||
    '• they → their (su, de ellos):  Their house is new.'
  ) returning id into p_id;

  insert into topic_examples (topic_id, order_index, text, note) values
    (p_id,1,'This is my pencil.','Este es mi lápiz.'),(p_id,2,'Your book is on the desk.','Tu libro está en el pupitre.'),
    (p_id,3,'His name is Carlos.','Su nombre (de él) es Carlos.'),(p_id,4,'Her sister is tall.','Su hermana (de ella) es alta.'),
    (p_id,5,'Our teacher is kind.','Nuestra profesora es amable.'),(p_id,6,'Their dog is big.','Su perro (de ellos) es grande.'),
    (p_id,7,'The bird eats its food.','El pájaro come su comida.'),(p_id,8,'My family is happy.','Mi familia es feliz.'),
    (p_id,9,'Is this your phone?','¿Es este tu teléfono?'),(p_id,10,'We love our school.','Amamos nuestra escuela.');

  insert into topic_practice (topic_id, order_index, question, options, correct_answer, explanation) values
    (p_id,1,'"I have a cat. ___ cat is black."','["My","Your","His"]'::jsonb,'My','I → my.'),
    (p_id,2,'"She has a brother. ___ brother is tall."','["Her","His","My"]'::jsonb,'Her','she → her.'),
    (p_id,3,'"He has a dog. ___ dog is friendly."','["His","Her","Their"]'::jsonb,'His','he → his.'),
    (p_id,4,'"We have a teacher. ___ teacher is nice."','["Our","My","Your"]'::jsonb,'Our','we → our.'),
    (p_id,5,'"They have a house. ___ house is new."','["Their","His","Her"]'::jsonb,'Their','they → their.');

  -- ---- TEMA 2 (gramática): Telling the Time ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    3, 2, 'grammar', 'Telling the Time',
    'Para decir la hora en inglés:' || E'\n\n' ||
    '• En punto:  "It''s three o''clock."  (3:00)' || E'\n' ||
    '• Y media (30):  "It''s half past three."  (3:30)' || E'\n' ||
    '• Y cuarto (15):  "It''s a quarter past three."  (3:15)' || E'\n' ||
    '• Cuarto para (45):  "It''s a quarter to four."  (3:45)' || E'\n\n' ||
    'Pregunta:  "What time is it?"  →  "It''s ..."'
  ) returning id into t_id;

  insert into topic_examples (topic_id, order_index, text, note) values
    (t_id,1,'It''s six o''clock.','Son las seis en punto.'),(t_id,2,'It''s half past two.','Son las dos y media.'),
    (t_id,3,'It''s a quarter past nine.','Son las nueve y cuarto.'),(t_id,4,'It''s a quarter to five.','Un cuarto para las cinco.'),
    (t_id,5,'What time is it?','¿Qué hora es?'),(t_id,6,'It''s seven o''clock.','Son las siete en punto.'),
    (t_id,7,'It''s half past ten.','Son las diez y media.'),(t_id,8,'I get up at six o''clock.','Me levanto a las seis.');

  insert into topic_practice (topic_id, order_index, question, options, correct_answer, explanation) values
    (t_id,1,'3:00 es:','["three o''clock","half past three","a quarter past three"]'::jsonb,'three o''clock','En punto = o''clock.'),
    (t_id,2,'4:30 es:','["half past four","four o''clock","a quarter to four"]'::jsonb,'half past four','30 = half past.'),
    (t_id,3,'9:15 es:','["a quarter past nine","half past nine","nine o''clock"]'::jsonb,'a quarter past nine','15 = a quarter past.'),
    (t_id,4,'¿Cómo preguntas la hora?','["What time is it?","What is the time it?","How time?"]'::jsonb,'What time is it?','Pregunta correcta.'),
    (t_id,5,'5:45 es:','["a quarter to six","a quarter past five","half past five"]'::jsonb,'a quarter to six','45 = a quarter to (la siguiente hora).');

  -- ---- TEMA 3 (vocabulario): Family Members ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    3, 3, 'vocabulary', 'Family Members',
    'Aprende los miembros de la familia. Escribe el significado, mira ejemplos y crea tus oraciones.'
  ) returning id into v_id;

  insert into vocabulary_words (topic_id, order_index, word, part_of_speech, phonetic, reference_definition, examples) values
    (v_id,1,'mother','noun','/ˈmʌðər/','your female parent; en español: "madre o mamá"',
      '["My mother is a teacher.","Her mother cooks dinner.","I love my mother.","His mother is very kind.","My mother''s name is Ana."]'::jsonb),
    (v_id,2,'father','noun','/ˈfɑːðər/','your male parent; en español: "padre o papá"',
      '["My father works in an office.","His father is tall.","I help my father.","Her father drives a car.","My father reads every day."]'::jsonb),
    (v_id,3,'brother','noun','/ˈbrʌðər/','a boy with the same parents as you; en español: "hermano"',
      '["My brother is ten years old.","Her brother plays soccer.","I have one brother.","His brother is funny.","My brother likes games."]'::jsonb),
    (v_id,4,'sister','noun','/ˈsɪstər/','a girl with the same parents as you; en español: "hermana"',
      '["My sister is a student.","Her sister sings well.","I have two sisters.","His sister is tall.","My sister loves cats."]'::jsonb),
    (v_id,5,'grandmother','noun','/ˈɡrænmʌðər/','your mother''s or father''s mother; en español: "abuela"',
      '["My grandmother makes cookies.","Her grandmother is very kind.","I visit my grandmother on Sundays.","His grandmother tells nice stories.","My grandmother lives near us."]'::jsonb);

  raise notice 'Unidad 3: 3 temas de teoría sembrados.';
end $$;
