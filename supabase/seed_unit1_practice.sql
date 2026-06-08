-- ============================================================
-- Contenido de PRÁCTICA - Unidad 1 "Getting to Know You"
-- Ejecutar después de theory_practice.sql. Idempotente a nivel de unidad.
-- Ejercicios originales A1.3 (verb to be + saludos). Auto-corregibles (sin IA).
-- Niveles 1-3 sin tiempo; 4-5 con tiempo (dominio = responder rápido).
-- ============================================================

do $$
begin
  if exists (select 1 from practice_exercises where unit_id = 1) then
    raise notice 'La unidad 1 ya tiene práctica; no se vuelve a sembrar.';
    return;
  end if;

  insert into practice_exercises (unit_id, area, level, type, timed, time_limit_seconds, prompt, payload, correct_answer, explanation, xp_reward) values
  -- ---- NIVEL 1: opción múltiple (verb to be) ----
  (1,'grammar',1,'multiple_choice',false,null,'Completa: "I ___ a student."','{"options":["am","is","are"]}'::jsonb,'am','Con "I" usamos "am".',10),
  (1,'grammar',1,'multiple_choice',false,null,'Completa: "She ___ happy."','{"options":["is","am","are"]}'::jsonb,'is','He / She / It usan "is".',10),
  (1,'grammar',1,'multiple_choice',false,null,'Completa: "They ___ my friends."','{"options":["are","is","am"]}'::jsonb,'are','You / We / They usan "are".',10),
  (1,'grammar',1,'multiple_choice',false,null,'Completa: "He ___ from Brazil."','{"options":["is","am","are"]}'::jsonb,'is','He usa "is".',10),
  (1,'grammar',1,'multiple_choice',false,null,'Completa: "We ___ ready."','{"options":["are","is","am"]}'::jsonb,'are','We usa "are".',10),

  -- ---- NIVEL 2: opción múltiple + verdadero/falso (mezcla) ----
  (1,'grammar',2,'multiple_choice',false,null,'Forma corta de "I am":','{"options":["I''m","Im","I''re"]}'::jsonb,'I''m','"I am" se contrae como "I''m".',10),
  (1,'vocabulary',2,'multiple_choice',false,null,'¿Cuál es un saludo?','{"options":["Hello","Table","Run"]}'::jsonb,'Hello','"Hello" significa "hola".',10),
  (1,'vocabulary',2,'true_false',false,null,'"Goodbye" se usa cuando llegas.','{}'::jsonb,'false','"Goodbye" (adiós) se usa cuando te vas.',10),
  (1,'vocabulary',2,'true_false',false,null,'Un "teacher" es una persona que enseña.','{}'::jsonb,'true','"Teacher" = profesor/profesora.',10),
  (1,'vocabulary',2,'multiple_choice',false,null,'Cuando te vas dices:','{"options":["Goodbye","Name","Friend"]}'::jsonb,'Goodbye','"Goodbye" = adiós.',10),

  -- ---- NIVEL 3: escribir la respuesta (fill blank) ----
  (1,'grammar',3,'fill_blank',false,null,'Completa con el verbo to be: "I ___ from Colombia."','{}'::jsonb,'am','Con "I" siempre "am".',15),
  (1,'grammar',3,'fill_blank',false,null,'Completa: "She ___ my teacher."','{}'::jsonb,'is','He / She / It → "is".',15),
  (1,'grammar',3,'fill_blank',false,null,'Escribe la contracción de "They are":','{"accept":["theyre"]}'::jsonb,'They''re','"They are" → "They''re".',15),
  (1,'grammar',3,'fill_blank',false,null,'Completa: "You ___ very kind."','{}'::jsonb,'are','You → "are".',15),
  (1,'vocabulary',3,'fill_blank',false,null,'En inglés, una persona con quien compartes y te llevas bien es un/una ___ :','{}'::jsonb,'friend','"friend" = amigo/amiga.',15),

  -- ---- NIVEL 4: ordenar palabras (con tiempo, 30s) ----
  (1,'writing',4,'reorder',true,30,'Ordena para formar la oración:','{"words":["am","I","a","student"]}'::jsonb,'I am a student','Sujeto + to be + complemento.',20),
  (1,'writing',4,'reorder',true,30,'Ordena para formar la oración:','{"words":["is","She","my","teacher"]}'::jsonb,'She is my teacher','She + is + complemento.',20),
  (1,'writing',4,'reorder',true,30,'Ordena para formar la oración:','{"words":["from","They","are","Mexico"]}'::jsonb,'They are from Mexico','They + are + from + lugar.',20),
  (1,'writing',4,'reorder',true,30,'Ordena para formar la oración:','{"words":["name","My","is","Ana"]}'::jsonb,'My name is Ana','"My name is ..." para presentarte.',20),
  (1,'writing',4,'reorder',true,30,'Ordena para formar la oración:','{"words":["are","We","friends"]}'::jsonb,'We are friends','We + are + complemento.',20),

  -- ---- NIVEL 5: mezcla rápida (con tiempo, 15s) ----
  (1,'grammar',5,'multiple_choice',true,15,'Rápido: "He ___ tired."','{"options":["is","am","are"]}'::jsonb,'is','He → "is".',20),
  (1,'grammar',5,'true_false',true,15,'"I are happy" es correcto.','{}'::jsonb,'false','Lo correcto es "I am happy".',20),
  (1,'grammar',5,'fill_blank',true,15,'Rápido: "It ___ a blue pen."','{}'::jsonb,'is','It → "is".',20),
  (1,'vocabulary',5,'multiple_choice',true,15,'"Hello" significa…','{"options":["un saludo","un adiós","un nombre"]}'::jsonb,'un saludo','"Hello" = hola (saludo).',20),
  (1,'writing',5,'reorder',true,15,'Ordena rápido:','{"words":["are","You","my","friend"]}'::jsonb,'You are my friend','You + are + complemento.',20);

  raise notice 'Unidad 1: 25 ejercicios de práctica sembrados (5 niveles).';
end $$;
