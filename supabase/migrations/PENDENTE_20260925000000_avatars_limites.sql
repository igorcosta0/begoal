-- Pente fino (M6, 25/09/2026): o bucket público "avatars" aceitava qualquer
-- arquivo de qualquer tamanho — dava pra hospedar HTML/SVG com script numa URL
-- pública do Supabase. E foto_url aceitava qualquer endereço gravado direto
-- pela API (imagem de fora, rastreador etc.).
--
-- Só restringe; não mexe em nenhuma foto já enviada (todas são JPG/PNG
-- enviadas pela tela de Perfil, que já limitava a 5MB).

-- 1) Bucket: até 5MB e só formatos de imagem comuns (sem SVG).
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'avatars';

-- 2) foto_url só pode apontar para o próprio bucket avatars deste projeto.
--    NOT VALID + VALIDATE separado: se alguma linha antiga não bater, a
--    validação falha com a mensagem e nada fica aplicado pela metade — nesse
--    caso rode a consulta de conferência abaixo e me mande o resultado.
alter table public.funcionarios_perfil_publico
  drop constraint if exists funcionarios_perfil_publico_foto_url_avatars;
alter table public.funcionarios_perfil_publico
  add constraint funcionarios_perfil_publico_foto_url_avatars
  check (foto_url is null or foto_url ~ '^https://[^/]+/storage/v1/object/public/avatars/')
  not valid;
alter table public.funcionarios_perfil_publico
  validate constraint funcionarios_perfil_publico_foto_url_avatars;

-- Conferência (opcional):
-- select id, name, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
-- select foto_url from public.funcionarios_perfil_publico
--   where foto_url is not null and foto_url !~ '^https://[^/]+/storage/v1/object/public/avatars/';

-- DESFAZER:
-- update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'avatars';
-- alter table public.funcionarios_perfil_publico drop constraint if exists funcionarios_perfil_publico_foto_url_avatars;
