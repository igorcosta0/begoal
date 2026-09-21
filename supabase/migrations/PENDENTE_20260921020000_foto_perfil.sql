-- Pedido (21/09/2026): opção de adicionar foto na aba Perfil, que passa a
-- aparecer em todo lugar que já mostra aquele funcionário (Topbar,
-- Funcionários, Avaliação, mural "Missão" em Nosso Jeito de Ser, comentários
-- de Táticas etc.) — hoje esses lugares só mostram um círculo com a inicial
-- do nome.
--
-- Coluna nova em funcionarios_perfil_publico (migration
-- PENDENTE_20260910020000_perfil_publico.sql), não em funcionarios: mesmo
-- motivo de sempre — a policy de escrita de funcionarios exige
-- permission_level='administrador', então um funcionário comum não
-- conseguiria trocar a própria foto ali. funcionarios_perfil_publico já tem
-- RLS de "só a própria linha" pra escrita e leitura liberada pra empresa
-- toda, exatamente o que uma foto de perfil precisa.
alter table public.funcionarios_perfil_publico
  add column if not exists foto_url text;

-- Bucket de Storage pras fotos — público (serve a foto direto por URL, sem
-- token) porque não é dado sensível e simplifica muito o front-end (sem
-- signed URL pra renovar). Escrita restrita: cada usuário só grava dentro da
-- própria pasta (paths salvos como "<user_id>/arquivo.ext").
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_insert_propria_pasta" on storage.objects;
create policy "avatars_insert_propria_pasta" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_propria_pasta" on storage.objects;
create policy "avatars_update_propria_pasta" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_propria_pasta" on storage.objects;
create policy "avatars_delete_propria_pasta" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
