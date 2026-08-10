-- Biblioteca de documentos da empresa (código de cultura, revisões estratégicas,
-- materiais de pessoas, etc. — PDFs e afins).
-- Tabela consumida por src/lib/queries/biblioteca.ts
-- Rode este script inteiro no SQL Editor do Supabase (projeto do begoal).

create extension if not exists pgcrypto;

-- ── Tabela ───────────────────────────────────────────────────────────────────

create table if not exists public.biblioteca_documentos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nome text not null,
  categoria text not null default 'Outros',
  storage_path text not null unique,
  tamanho_bytes bigint,
  content_type text,
  autor_nome text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists biblioteca_documentos_client_id_idx on public.biblioteca_documentos (client_id);

alter table public.biblioteca_documentos enable row level security;

-- Qualquer usuário vinculado à empresa pode ver os documentos.
drop policy if exists "biblioteca_documentos_select" on public.biblioteca_documentos;
create policy "biblioteca_documentos_select" on public.biblioteca_documentos
  for select using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = biblioteca_documentos.client_id
        and ucr.user_id = auth.uid()
    )
  );

-- Só administrador/gestor enviam ou removem documentos.
drop policy if exists "biblioteca_documentos_insert" on public.biblioteca_documentos;
create policy "biblioteca_documentos_insert" on public.biblioteca_documentos
  for insert with check (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = biblioteca_documentos.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

drop policy if exists "biblioteca_documentos_delete" on public.biblioteca_documentos;
create policy "biblioteca_documentos_delete" on public.biblioteca_documentos
  for delete using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = biblioteca_documentos.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

-- ── Storage: bucket privado "biblioteca" ────────────────────────────────────
-- Arquivos ficam salvos em `{client_id}/{arquivo}`; as políticas abaixo usam o
-- 1º segmento do caminho como client_id para decidir quem lê/envia/remove.
-- Download é sempre via signed URL (bucket não é público).

insert into storage.buckets (id, name, public)
values ('biblioteca', 'biblioteca', false)
on conflict (id) do nothing;

-- Não precisa (e não dá: "must be owner of table objects") rodar
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY — o Supabase já
-- deixa RLS ligado por padrão nessa tabela em todo projeto novo.

drop policy if exists "biblioteca_storage_select" on storage.objects;
create policy "biblioteca_storage_select" on storage.objects
  for select using (
    bucket_id = 'biblioteca'
    and exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = (storage.foldername(name))[1]::uuid
        and ucr.user_id = auth.uid()
    )
  );

drop policy if exists "biblioteca_storage_insert" on storage.objects;
create policy "biblioteca_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'biblioteca'
    and exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = (storage.foldername(name))[1]::uuid
        and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

drop policy if exists "biblioteca_storage_delete" on storage.objects;
create policy "biblioteca_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'biblioteca'
    and exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = (storage.foldername(name))[1]::uuid
        and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );
