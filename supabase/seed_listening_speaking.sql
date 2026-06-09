-- Listening + Speaking (todas las unidades). Original A1.3. Idempotente.
do $$
begin
  if exists (select 1 from practice_exercises where type in ('listening','speaking')) then
    raise notice 'Listening/Speaking ya sembrado.'; return;
  end if;
  insert into practice_exercises (unit_id, area, level, type, timed, time_limit_seconds, prompt, payload, correct_answer, explanation, xp_reward) values
  (1, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"I am a student.","options":["I am a teacher.","You are a student.","I am a student."]}'::jsonb, 'I am a student.', '', 15),
  (1, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"She is from Mexico.","options":["She is from Mexico.","He is from Mexico.","She is from Brazil."]}'::jsonb, 'She is from Mexico.', '', 15),
  (1, 'listening', 3, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"They are my friends.","options":["They are my teachers.","We are my friends.","They are my friends."]}'::jsonb, 'They are my friends.', '', 15),
  (1, 'listening', 3, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"Hello, my name is Ana.","options":["Goodbye, my name is Ana.","Hello, my name is Emma.","Hello, my name is Ana."]}'::jsonb, 'Hello, my name is Ana.', '', 15),
  (1, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"hello"}'::jsonb, 'hello', '', 15),
  (1, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"teacher"}'::jsonb, 'teacher', '', 15),
  (1, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"Hello, my name is Ana."}'::jsonb, 'Hello, my name is Ana.', '', 20),
  (1, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"I am a student."}'::jsonb, 'I am a student.', '', 20),
  (1, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"She is my teacher."}'::jsonb, 'She is my teacher.', '', 20),
  (1, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"Nice to meet you."}'::jsonb, 'Nice to meet you.', '', 20),
  (1, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"I am from Colombia."}'::jsonb, 'I am from Colombia.', '', 20),
  (1, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"Goodbye!"}'::jsonb, 'Goodbye!', '', 20),
  (2, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"This is a book.","options":["This is a book.","This is a pen.","That is a book."]}'::jsonb, 'This is a book.', '', 15),
  (2, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"These are pencils.","options":["These are pens.","These are pencils.","Those are pencils."]}'::jsonb, 'These are pencils.', '', 15),
  (2, 'listening', 3, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"Can I have an apple?","options":["Can I have a pen?","Can I have an apple?","Can I have an orange?"]}'::jsonb, 'Can I have an apple?', '', 15),
  (2, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"pencil"}'::jsonb, 'pencil', '', 15),
  (2, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"window"}'::jsonb, 'window', '', 15),
  (2, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"This is my book."}'::jsonb, 'This is my book.', '', 20),
  (2, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"Can I have a pen, please?"}'::jsonb, 'Can I have a pen, please?', '', 20),
  (2, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"These are my pencils."}'::jsonb, 'These are my pencils.', '', 20),
  (2, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"Open your book."}'::jsonb, 'Open your book.', '', 20),
  (2, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"It is an apple."}'::jsonb, 'It is an apple.', '', 20),
  (3, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"My mother is a teacher.","options":["My mother is a doctor.","My father is a teacher.","My mother is a teacher."]}'::jsonb, 'My mother is a teacher.', '', 15),
  (3, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"It''s half past three.","options":["It''s half past two.","It''s half past three.","It''s a quarter past three."]}'::jsonb, 'It''s half past three.', '', 15),
  (3, 'listening', 3, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"Her brother is tall.","options":["His brother is tall.","Her sister is tall.","Her brother is tall."]}'::jsonb, 'Her brother is tall.', '', 15),
  (3, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"brother"}'::jsonb, 'brother', '', 15),
  (3, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"family"}'::jsonb, 'family', '', 15),
  (3, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"This is my family."}'::jsonb, 'This is my family.', '', 20),
  (3, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"My mother is very kind."}'::jsonb, 'My mother is very kind.', '', 20),
  (3, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"What time is it?"}'::jsonb, 'What time is it?', '', 20),
  (3, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"I have two sisters."}'::jsonb, 'I have two sisters.', '', 20),
  (3, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"Her name is Maria."}'::jsonb, 'Her name is Maria.', '', 20),
  (4, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"She goes to school.","options":["She goes to school.","He goes to school.","She goes to work."]}'::jsonb, 'She goes to school.', '', 15),
  (4, 'listening', 2, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"I get up at six.","options":["I go to bed at six.","I get up at six.","I get up at seven."]}'::jsonb, 'I get up at six.', '', 15),
  (4, 'listening', 3, 'listening', false, null, 'Escucha y elige lo que oíste:', '{"audio":"He watches TV.","options":["He watches TV.","He watches a movie.","She watches TV."]}'::jsonb, 'He watches TV.', '', 15),
  (4, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"kitchen"}'::jsonb, 'kitchen', '', 15),
  (4, 'listening', 4, 'listening', false, null, 'Escucha y escribe la palabra:', '{"audio":"bedroom"}'::jsonb, 'bedroom', '', 15),
  (4, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"I get up early every day."}'::jsonb, 'I get up early every day.', '', 20),
  (4, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"She studies English."}'::jsonb, 'She studies English.', '', 20),
  (4, 'speaking', 3, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"We have breakfast at home."}'::jsonb, 'We have breakfast at home.', '', 20),
  (4, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"I take a shower in the morning."}'::jsonb, 'I take a shower in the morning.', '', 20),
  (4, 'speaking', 5, 'speaking', false, null, 'Di la frase en voz alta:', '{"target":"He goes to school by bus."}'::jsonb, 'He goes to school by bus.', '', 20);
  raise notice 'Listening/Speaking: 42 ejercicios.';
end $$;
