-- Fix (21/09/2026): upload de foto de perfil falhando com "new row violates
-- row-level security policy" — causa raiz confirmada via consulta direta ao
-- banco (nenhuma linha em storage.objects pro bucket "avatars", ou seja, o
-- INSERT nunca chegou a se efetivar) e pela documentação do Supabase: como
-- o upload usa upsert:true, a API de Storage faz o INSERT com
-- "ON CONFLICT ... DO UPDATE ... RETURNING *" — o RETURNING exige uma
-- policy de SELECT na linha, mesmo em upload novo, e a migration
-- PENDENTE_20260921020000_foto_perfil.sql só tinha criado INSERT/UPDATE/
-- DELETE pro bucket "avatars", sem SELECT. Faltou esse detalhe: bucket
-- "public" só dispensa RLS pra leitura via URL pública
-- (/storage/v1/object/public/...), não pra chamadas autenticadas que leem a
-- própria linha (como o upload faz por baixo).
--
-- Sem risco em liberar SELECT geral pro bucket — ele já é público por design
-- (fotos de perfil não são dado sensível, qualquer um com a URL já
-- conseguia ver a foto de qualquer jeito).
drop policy if exists "avatars_select_todos" on storage.objects;
create policy "avatars_select_todos" on storage.objects
  for select
  using (bucket_id = 'avatars');
