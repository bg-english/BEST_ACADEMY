-- ============================================================
-- Contenido de TEORÍA - Unidad 1 "Getting to Know You"
-- Ejecutar después de theory_practice.sql. Idempotente a nivel de unidad.
-- Contenido original adaptado a A1.3 (no copia material con copyright).
-- ============================================================

do $$
declare g_id integer; v_id integer;
begin
  if exists (select 1 from topics where unit_id = 1) then
    raise notice 'La unidad 1 ya tiene temas; no se vuelve a sembrar.';
    return;
  end if;

  -- ---- TEMA 1 (gramática): The verb TO BE ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    1, 1, 'grammar', 'The verb TO BE',
    'En inglés usamos el verbo "to be" (ser / estar) para decir quién eres, cómo estás o cómo es algo.' || E'\n\n' ||
    'Tiene tres formas en presente:' || E'\n' ||
    '• I am  →  yo soy / estoy' || E'\n' ||
    '• He / She / It is  →  él / ella / eso es' || E'\n' ||
    '• You / We / They are  →  tú / nosotros / ellos son' || E'\n\n' ||
    'Formas cortas (contracciones), muy comunes al hablar:' || E'\n' ||
    '• I am → I''m     • She is → She''s     • They are → They''re' || E'\n\n' ||
    'Para negar, añadimos "not":' || E'\n' ||
    '• I am not (I''m not)     • He is not (He isn''t)     • We are not (We aren''t)' || E'\n\n' ||
    '¿Cuándo se usa? Para presentarte (I am Ana), decir tu origen (I am from Colombia), tu edad (I am 12) o describir algo (The book is red).'
  ) returning id into g_id;

  insert into topic_examples (topic_id, order_index, text, note) values
    (g_id, 1,  'I am a student.',        'Yo soy estudiante.'),
    (g_id, 2,  'She is my teacher.',     'Ella es mi profesora.'),
    (g_id, 3,  'They are my friends.',   'Ellos son mis amigos.'),
    (g_id, 4,  'He is from Mexico.',     'Él es de México.'),
    (g_id, 5,  'We are happy today.',    'Estamos felices hoy.'),
    (g_id, 6,  'I''m twelve years old.', 'Tengo doce años.'),
    (g_id, 7,  'The classroom is big.',  'El salón es grande.'),
    (g_id, 8,  'You are very kind.',     'Tú eres muy amable.'),
    (g_id, 9,  'It is a blue pen.',      'Es un bolígrafo azul.'),
    (g_id, 10, 'I''m not tired.',        'No estoy cansado.');

  insert into topic_practice (topic_id, order_index, question, options, correct_answer, explanation) values
    (g_id, 1, 'Completa: "I ___ a student."', '["am","is","are","be"]'::jsonb, 'am', 'Con el pronombre "I" siempre usamos "am".'),
    (g_id, 2, 'Completa: "She ___ my teacher."', '["is","am","are","be"]'::jsonb, 'is', 'He / She / It usan "is".'),
    (g_id, 3, 'Completa: "They ___ my friends."', '["are","is","am","be"]'::jsonb, 'are', 'You / We / They usan "are".'),
    (g_id, 4, 'Forma corta de "He is":', '["He''s","His","Hes","He''re"]'::jsonb, 'He''s', '"He is" se contrae como "He''s".'),
    (g_id, 5, 'Completa el negativo: "We ___ not ready."', '["are","is","am","be"]'::jsonb, 'are', 'Con "We" usamos "are" (We are not / We aren''t).');

  -- ---- TEMA 2 (vocabulario): Greetings & Personal Information ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    1, 2, 'vocabulary', 'Greetings & Personal Information',
    'Aprende palabras para saludar y presentarte. Primero escribe con tus palabras qué significa cada una; después verás ejemplos y crearás tus propias oraciones.'
  ) returning id into v_id;

  insert into vocabulary_words (topic_id, order_index, word, part_of_speech, phonetic, reference_definition, examples) values
    (v_id, 1, 'hello', 'interjection', '/həˈloʊ/',
      'a word you say to greet someone; en español: "hola"',
      '["Hello! How are you?","She says hello to the teacher.","Hello, my name is Ana.","We say hello in the morning.","Hello, nice to meet you!"]'::jsonb),
    (v_id, 2, 'goodbye', 'interjection', '/ˌɡʊdˈbaɪ/',
      'a word you say when you leave; en español: "adiós"',
      '["Goodbye! See you tomorrow.","He waves goodbye to his friend.","Goodbye, have a nice day!","I say goodbye to my family.","It is time to say goodbye."]'::jsonb),
    (v_id, 3, 'name', 'noun', '/neɪm/',
      'the word that tells who you are; en español: "nombre"',
      '["My name is Luis.","What is your name?","Her name is Maria.","Please write your name here.","His name is Carlos."]'::jsonb),
    (v_id, 4, 'friend', 'noun', '/frend/',
      'a person you like and spend time with; en español: "amigo o amiga"',
      '["She is my best friend.","I have two friends.","My friend is from Spain.","He is a good friend.","We are friends."]'::jsonb),
    (v_id, 5, 'teacher', 'noun', '/ˈtiːtʃər/',
      'a person who teaches at school; en español: "profesor o profesora"',
      '["My teacher is very kind.","The teacher writes on the board.","She is an English teacher.","Our teacher helps us a lot.","Mr. Ortiz is my teacher."]'::jsonb);

  raise notice 'Unidad 1: 2 temas de teoría sembrados.';
end $$;
