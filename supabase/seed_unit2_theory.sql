-- ============================================================
-- Contenido de TEORÍA - Unidad 2 "My Classroom"
-- Ejecutar después de theory_practice.sql. Idempotente a nivel de unidad.
-- Contenido original A1.3 (no copia material con copyright).
-- ============================================================

do $$
declare a_id integer; d_id integer; v_id integer;
begin
  if exists (select 1 from topics where unit_id = 2) then
    raise notice 'La unidad 2 ya tiene temas; no se vuelve a sembrar.';
    return;
  end if;

  -- ---- TEMA 1 (gramática): Articles a / an ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    2, 1, 'grammar', 'Articles: a / an',
    'En inglés "a" y "an" significan "un / una" (artículo indefinido: algo no específico).' || E'\n\n' ||
    '• Usa A antes de sonido de consonante: a book, a pen, a teacher, a dog.' || E'\n' ||
    '• Usa AN antes de sonido de vocal (a, e, i, o, u): an apple, an egg, an orange, an umbrella.' || E'\n\n' ||
    'Truco: escucha el primer SONIDO de la palabra, no solo la letra.'
  ) returning id into a_id;

  insert into topic_examples (topic_id, order_index, text, note) values
    (a_id,1,'a book','un libro'),(a_id,2,'an apple','una manzana'),
    (a_id,3,'a pen','un bolígrafo'),(a_id,4,'an egg','un huevo'),
    (a_id,5,'a teacher','un profesor'),(a_id,6,'an orange','una naranja'),
    (a_id,7,'a chair','una silla'),(a_id,8,'an umbrella','un paraguas'),
    (a_id,9,'a student','un estudiante'),(a_id,10,'an idea','una idea');

  insert into topic_practice (topic_id, order_index, question, options, correct_answer, explanation) values
    (a_id,1,'Elige: "___ apple"','["an","a"]'::jsonb,'an','"apple" empieza con sonido vocal → an.'),
    (a_id,2,'Elige: "___ book"','["a","an"]'::jsonb,'a','"book" empieza con consonante → a.'),
    (a_id,3,'Elige: "___ orange"','["an","a"]'::jsonb,'an','"orange" empieza con vocal → an.'),
    (a_id,4,'Elige: "___ teacher"','["a","an"]'::jsonb,'a','"teacher" empieza con consonante → a.'),
    (a_id,5,'Elige: "___ egg"','["an","a"]'::jsonb,'an','"egg" empieza con vocal → an.');

  -- ---- TEMA 2 (gramática): This / That / These / Those ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    2, 2, 'grammar', 'This / That / These / Those',
    'Los demostrativos señalan cosas según la distancia y la cantidad.' || E'\n\n' ||
    '• THIS = esto/esta → 1 cosa, CERCA.  This is my pen.' || E'\n' ||
    '• THAT = eso/esa → 1 cosa, LEJOS.  That is your book.' || E'\n' ||
    '• THESE = estos/estas → VARIAS, cerca.  These are my pens.' || E'\n' ||
    '• THOSE = esos/esas → VARIAS, lejos.  Those are your books.' || E'\n\n' ||
    'Cerca = this / these.  Lejos = that / those.  Singular = this / that.  Plural = these / those.'
  ) returning id into d_id;

  insert into topic_examples (topic_id, order_index, text, note) values
    (d_id,1,'This is a pen.','Esto es un bolígrafo.'),(d_id,2,'That is a book.','Eso es un libro.'),
    (d_id,3,'These are pencils.','Estos son lápices.'),(d_id,4,'Those are chairs.','Esas son sillas.'),
    (d_id,5,'This is my friend.','Este es mi amigo.'),(d_id,6,'That is the teacher.','Ese es el profesor.'),
    (d_id,7,'These are my books.','Estos son mis libros.'),(d_id,8,'Those are windows.','Esas son ventanas.');

  insert into topic_practice (topic_id, order_index, question, options, correct_answer, explanation) values
    (d_id,1,'1 cosa cerca: "___ is my pen."','["This","These","Those"]'::jsonb,'This','Singular + cerca = This.'),
    (d_id,2,'Varias cerca: "___ are my books."','["These","This","That"]'::jsonb,'These','Plural + cerca = These.'),
    (d_id,3,'1 cosa lejos: "___ is your chair."','["That","Those","This"]'::jsonb,'That','Singular + lejos = That.'),
    (d_id,4,'Varias lejos: "___ are your pens."','["Those","This","These"]'::jsonb,'Those','Plural + lejos = Those.'),
    (d_id,5,'Singular y cerca usamos:','["This","These","Those"]'::jsonb,'This','This = singular, cerca.');

  -- ---- TEMA 3 (vocabulario): Classroom Objects ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    2, 3, 'vocabulary', 'Classroom Objects',
    'Aprende los objetos del salón de clases. Escribe el significado, mira ejemplos y crea tus oraciones.'
  ) returning id into v_id;

  insert into vocabulary_words (topic_id, order_index, word, part_of_speech, phonetic, reference_definition, examples) values
    (v_id,1,'pen','noun','/pen/','a thing you write with, using ink; en español: "bolígrafo"',
      '["I have a blue pen.","Can I use your pen?","The pen is on the desk.","She writes with a pen.","This pen is red."]'::jsonb),
    (v_id,2,'pencil','noun','/ˈpensl/','a thing you write or draw with, made of wood; en español: "lápiz"',
      '["I draw with a pencil.","Where is my pencil?","The pencil is short.","He has two pencils.","This is a yellow pencil."]'::jsonb),
    (v_id,3,'book','noun','/bʊk/','a thing with pages that you read; en español: "libro"',
      '["I read a book.","Open your book, please.","The book is interesting.","She has many books.","This book is new."]'::jsonb),
    (v_id,4,'chair','noun','/tʃer/','a thing you sit on; en español: "silla"',
      '["Sit on the chair.","The chair is brown.","I need a chair.","This chair is comfortable.","There are five chairs."]'::jsonb),
    (v_id,5,'desk','noun','/desk/','a table where you study or work; en español: "pupitre o escritorio"',
      '["My books are on the desk.","The desk is big.","She sits at her desk.","Please clean your desk.","This is my desk."]'::jsonb);

  raise notice 'Unidad 2: 3 temas de teoría sembrados.';
end $$;
