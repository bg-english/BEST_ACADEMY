-- ============================================================
-- Contenido de TEORÍA - Unidad 4 "A Normal Day"
-- Ejecutar después de theory_practice.sql. Idempotente. Contenido original A1.3.
-- ============================================================

do $$
declare g_id integer; r_id integer; h_id integer;
begin
  if exists (select 1 from topics where unit_id = 4) then
    raise notice 'La unidad 4 ya tiene temas; no se vuelve a sembrar.';
    return;
  end if;

  -- ---- TEMA 1 (gramática): Present Simple (he/she/it + s) ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    4, 1, 'grammar', 'Present Simple: He / She / It',
    'Usamos el presente simple para hablar de rutinas y cosas habituales.' || E'\n\n' ||
    'Con he / she / it el verbo lleva una terminación especial:' || E'\n' ||
    '• La mayoría de verbos: + s  →  she works, he plays, it runs.' || E'\n' ||
    '• Si termina en s, sh, ch, x, o: + es  →  she watches, he goes, she finishes.' || E'\n' ||
    '• Si termina en consonante + y: cambia y por ies  →  she studies, he carries.' || E'\n\n' ||
    'Con I / you / we / they el verbo NO cambia:  I work, they play.'
  ) returning id into g_id;

  insert into topic_examples (topic_id, order_index, text, note) values
    (g_id,1,'She works every day.','Ella trabaja todos los días.'),(g_id,2,'He plays soccer.','Él juega fútbol.'),
    (g_id,3,'It runs fast.','Corre rápido.'),(g_id,4,'She watches TV.','Ella ve televisión.'),
    (g_id,5,'He goes to school.','Él va a la escuela.'),(g_id,6,'She studies English.','Ella estudia inglés.'),
    (g_id,7,'He carries his bag.','Él lleva su mochila.'),(g_id,8,'I get up early.','Me levanto temprano.'),
    (g_id,9,'They play games.','Ellos juegan.'),(g_id,10,'My mother cooks dinner.','Mi madre cocina la cena.');

  insert into topic_practice (topic_id, order_index, question, options, correct_answer, explanation) values
    (g_id,1,'"She ___ every day." (work)','["works","work","workes"]'::jsonb,'works','Mayoría de verbos: + s.'),
    (g_id,2,'"He ___ to school." (go)','["goes","gos","go"]'::jsonb,'goes','Termina en o → + es.'),
    (g_id,3,'"She ___ English." (study)','["studies","studys","study"]'::jsonb,'studies','Consonante + y → ies.'),
    (g_id,4,'"He ___ TV." (watch)','["watches","watchs","watch"]'::jsonb,'watches','Termina en ch → + es.'),
    (g_id,5,'"I ___ soccer." (play)','["play","plays","playes"]'::jsonb,'play','Con I el verbo no cambia.');

  -- ---- TEMA 2 (vocabulario): Daily Routines ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    4, 2, 'vocabulary', 'Daily Routines',
    'Aprende frases para tu rutina diaria. Escribe el significado, mira ejemplos y crea tus oraciones.'
  ) returning id into r_id;

  insert into vocabulary_words (topic_id, order_index, word, part_of_speech, phonetic, reference_definition, examples) values
    (r_id,1,'get up','phrase','/ɡet ʌp/','to leave your bed in the morning; en español: "levantarse"',
      '["I get up at six.","She gets up early.","We get up for school.","Do you get up late?","He gets up at seven."]'::jsonb),
    (r_id,2,'have breakfast','phrase','/hæv ˈbrekfəst/','to eat the first meal of the day; en español: "desayunar"',
      '["I have breakfast at home.","She has breakfast with milk.","We have breakfast together.","He has breakfast at seven.","Do you have breakfast every day?"]'::jsonb),
    (r_id,3,'go to school','phrase','/ɡoʊ tu skuːl/','to travel to school; en español: "ir a la escuela"',
      '["I go to school by bus.","She goes to school early.","We go to school together.","He goes to school every day.","They go to school at eight."]'::jsonb),
    (r_id,4,'do homework','phrase','/duː ˈhoʊmwɜːrk/','to do school work at home; en español: "hacer la tarea"',
      '["I do my homework after school.","She does her homework at night.","We do homework together.","He does his homework fast.","Please do your homework."]'::jsonb),
    (r_id,5,'take a shower','phrase','/teɪk ə ˈʃaʊər/','to wash your body with water; en español: "ducharse"',
      '["I take a shower in the morning.","She takes a shower at night.","We take a shower every day.","He takes a quick shower.","Take a shower before school."]'::jsonb);

  -- ---- TEMA 3 (vocabulario): Parts of the House ----
  insert into topics (unit_id, order_index, kind, title, explanation) values (
    4, 3, 'vocabulary', 'Parts of the House',
    'Aprende las partes de la casa. Escribe el significado, mira ejemplos y crea tus oraciones.'
  ) returning id into h_id;

  insert into vocabulary_words (topic_id, order_index, word, part_of_speech, phonetic, reference_definition, examples) values
    (h_id,1,'kitchen','noun','/ˈkɪtʃən/','the room where you cook; en español: "cocina"',
      '["I cook in the kitchen.","The kitchen is clean.","We eat in the kitchen.","My mother is in the kitchen.","The kitchen is small."]'::jsonb),
    (h_id,2,'bedroom','noun','/ˈbedruːm/','the room where you sleep; en español: "dormitorio o recámara"',
      '["I sleep in my bedroom.","The bedroom is quiet.","Her bedroom is blue.","I study in my bedroom.","My bedroom has a big window."]'::jsonb),
    (h_id,3,'bathroom','noun','/ˈbæθruːm/','the room with a shower and toilet; en español: "baño"',
      '["I take a shower in the bathroom.","The bathroom is clean.","Where is the bathroom?","Our bathroom is small.","The bathroom is next to my room."]'::jsonb),
    (h_id,4,'living room','noun','/ˈlɪvɪŋ ruːm/','the room where the family relaxes; en español: "sala"',
      '["We watch TV in the living room.","The living room is big.","My family sits in the living room.","The sofa is in the living room.","The living room is comfortable."]'::jsonb),
    (h_id,5,'garden','noun','/ˈɡɑːrdn/','an area outside with plants and flowers; en español: "jardín"',
      '["We play in the garden.","The garden has flowers.","My grandmother loves her garden.","The garden is green.","There is a tree in the garden."]'::jsonb);

  raise notice 'Unidad 4: 3 temas de teoría sembrados.';
end $$;
