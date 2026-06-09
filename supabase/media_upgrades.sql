-- ============================================================
-- BEST Academy - Recursos de TEORÍA (video, infografía, slides)
-- Ejecutar una vez en Supabase -> SQL Editor. Idempotente.
-- El frontend muestra cada recurso SOLO si existe (sin huecos vacíos).
-- ============================================================

-- 1) Campos opcionales de media por tema
alter table topics add column if not exists video_url text;     -- YouTube o archivo de video
alter table topics add column if not exists image_url text;     -- infografía
alter table topics add column if not exists slides jsonb;       -- [{image_url, title, text}]

-- 2) Bucket público para subir archivos (infografías, imágenes de slides, video)
insert into storage.buckets (id, name, public)
values ('theory-media', 'theory-media', true)
on conflict (id) do nothing;

-- 3) Políticas del bucket: lectura pública, escritura solo profesor
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'theory_media_%'
  loop
    execute format('drop policy if exists %I on storage.objects;', r.policyname);
  end loop;
end $$;

create policy theory_media_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'theory-media');
create policy theory_media_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'theory-media' and public.is_teacher());
create policy theory_media_update on storage.objects
  for update to authenticated using (bucket_id = 'theory-media' and public.is_teacher());
create policy theory_media_delete on storage.objects
  for delete to authenticated using (bucket_id = 'theory-media' and public.is_teacher());
