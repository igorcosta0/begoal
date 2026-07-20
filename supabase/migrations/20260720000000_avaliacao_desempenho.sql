-- Módulo Avaliação de Desempenho (modelo 50/50 CTZ)
-- Tabelas consumidas por src/lib/queries/avaliacao.ts
-- Rode este script inteiro no SQL Editor do Supabase (projeto do begoal).

-- ── Tabelas ──────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists public.ciclos_avaliacao (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nome text not null,
  periodo smallint not null check (periodo in (1, 2)),
  ano smallint not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'encerrado')),
  created_at timestamptz not null default now()
);

create index if not exists ciclos_avaliacao_client_id_idx on public.ciclos_avaliacao (client_id);

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.ciclos_avaliacao(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  avaliador_id uuid references public.funcionarios(id) on delete set null,
  vertical text,
  status text not null default 'pendente' check (status in ('pendente', 'auto_concluida', 'gestor_concluida', 'finalizada')),
  evidencias_culturais text,
  observacoes_gerais text,
  media_cultural_auto numeric(3, 1),
  media_cultural_gestor numeric(3, 1),
  media_tecnica_auto numeric(3, 1),
  media_tecnica_gestor numeric(3, 1),
  created_at timestamptz not null default now()
);

create index if not exists avaliacoes_ciclo_id_idx on public.avaliacoes (ciclo_id);
create index if not exists avaliacoes_funcionario_id_idx on public.avaliacoes (funcionario_id);
create index if not exists avaliacoes_avaliador_id_idx on public.avaliacoes (avaliador_id);

create table if not exists public.avaliacoes_cultural (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  pilar smallint not null check (pilar between 1 and 4),
  nota_auto smallint check (nota_auto between 1 and 4),
  nota_gestor smallint check (nota_gestor between 1 and 4),
  unique (avaliacao_id, pilar)
);

create table if not exists public.avaliacoes_tecnica (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  criterio_key text not null,
  nota_auto smallint check (nota_auto between 1 and 4),
  nota_gestor smallint check (nota_gestor between 1 and 4),
  observacoes text,
  unique (avaliacao_id, criterio_key)
);

create table if not exists public.avaliacoes_pdi (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  acao text not null,
  indicador_sucesso text,
  prazo date,
  suporte_necessario text,
  created_at timestamptz not null default now()
);

create index if not exists avaliacoes_pdi_avaliacao_id_idx on public.avaliacoes_pdi (avaliacao_id);

-- ── Funções auxiliares de RLS ────────────────────────────────────────────────
-- SECURITY DEFINER para poder ler user_company_roles/funcionarios sem cair em
-- recursão de RLS; search_path fixo evita hijacking de funções.

create or replace function public.e_admin_do_ciclo(p_ciclo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ciclos_avaliacao ca
    join public.user_company_roles ucr on ucr.client_id = ca.client_id
    where ca.id = p_ciclo_id
      and ucr.user_id = auth.uid()
      and ucr.permission_level = 'administrador'
  );
$$;

create or replace function public.e_avaliado(p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.funcionarios f
    where f.id = p_funcionario_id
      and f.user_id = auth.uid()
  );
$$;

create or replace function public.pode_acessar_avaliacao(p_avaliacao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.avaliacoes a
    where a.id = p_avaliacao_id
      and (public.e_admin_do_ciclo(a.ciclo_id) or public.e_avaliado(a.funcionario_id))
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.ciclos_avaliacao enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.avaliacoes_cultural enable row level security;
alter table public.avaliacoes_tecnica enable row level security;
alter table public.avaliacoes_pdi enable row level security;

-- ciclos_avaliacao: qualquer usuário vinculado à empresa pode ver os ciclos;
-- só admin cria/edita/encerra.
create policy "ciclos_avaliacao_select" on public.ciclos_avaliacao
  for select using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
    )
  );

create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert with check (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

create policy "ciclos_avaliacao_update" on public.ciclos_avaliacao
  for update using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

create policy "ciclos_avaliacao_delete" on public.ciclos_avaliacao
  for delete using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

-- avaliacoes: admin do ciclo OU o próprio funcionário avaliado.
create policy "avaliacoes_select" on public.avaliacoes
  for select using (
    public.e_admin_do_ciclo(ciclo_id) or public.e_avaliado(funcionario_id)
  );

create policy "avaliacoes_insert" on public.avaliacoes
  for insert with check (
    public.e_admin_do_ciclo(ciclo_id)
  );

create policy "avaliacoes_update" on public.avaliacoes
  for update using (
    public.e_admin_do_ciclo(ciclo_id) or public.e_avaliado(funcionario_id)
  );

create policy "avaliacoes_delete" on public.avaliacoes
  for delete using (
    public.e_admin_do_ciclo(ciclo_id)
  );

-- avaliacoes_cultural / avaliacoes_tecnica / avaliacoes_pdi:
-- mesma regra de acesso da avaliação-pai.
create policy "avaliacoes_cultural_all" on public.avaliacoes_cultural
  for all using (
    public.pode_acessar_avaliacao(avaliacao_id)
  ) with check (
    public.pode_acessar_avaliacao(avaliacao_id)
  );

create policy "avaliacoes_tecnica_all" on public.avaliacoes_tecnica
  for all using (
    public.pode_acessar_avaliacao(avaliacao_id)
  ) with check (
    public.pode_acessar_avaliacao(avaliacao_id)
  );

create policy "avaliacoes_pdi_all" on public.avaliacoes_pdi
  for all using (
    public.pode_acessar_avaliacao(avaliacao_id)
  ) with check (
    public.pode_acessar_avaliacao(avaliacao_id)
  );
