-- Metas individuais no Desempenho (pedido do Igor, 21/10/2026): "Todos terão metas individuais na
-- parte de desempenho. Na parte de cultura, igual para todos."
--
-- Decisões (21/10/2026):
--   * opção do ciclo (ciclos_avaliacao.metas_individuais), só para ciclos novos; ciclos antigos
--     continuam com os critérios da vertical (VERTICAIS_CTZ no front);
--   * o líder (gestor no organograma) cadastra as metas dos liderados enquanto o ciclo está em
--     rascunho; quem não tem gestor (topo) fica com o administrador;
--   * ao ativar o ciclo as metas travam: depois disso só administrador corrige ("destravar");
--   * a pessoa vê as próprias metas desde a ativação (só leitura);
--   * de 1 a 5 metas por pessoa, mesmo peso, régua de notas 1-5 de hoje;
--   * Avaliação de Pares fica só com a Cultura nesses ciclos;
--   * ativar exige que todo avaliado tenha ao menos 1 meta (trigger em avaliacoes abaixo).
--
-- As notas por meta NÃO ganham tabela nova: ficam em avaliacoes_tecnica com
-- criterio_key = 'meta:<id da meta>'. Assim continuam passando pelas mesmas RPCs protegidas
-- (salvar_nota_avaliacao, get_avaliacao_tecnica, get_calibragem_ciclo_tecnica) e pelo mesmo
-- avaliacao_completude(), sem mexer na regra "cada um só vê a nota que deu".

begin;

-- ── 1. Opção do ciclo ───────────────────────────────────────────────────────

alter table public.ciclos_avaliacao
  add column if not exists metas_individuais boolean not null default false;

-- A opção só muda enquanto o ciclo está em rascunho (depois as avaliações já usam um modelo).
create or replace function public.checar_ciclo_metas_individuais()
returns trigger
language plpgsql
as $func$
begin
  if new.metas_individuais is distinct from old.metas_individuais and old.status <> 'rascunho' then
    raise exception 'A opção "metas individuais" só pode mudar enquanto o ciclo está em rascunho.';
  end if;
  return new;
end;
$func$;

drop trigger if exists ciclos_avaliacao_metas_individuais on public.ciclos_avaliacao;
create trigger ciclos_avaliacao_metas_individuais
  before update on public.ciclos_avaliacao
  for each row execute function public.checar_ciclo_metas_individuais();

-- ── 2. Tabela de metas ──────────────────────────────────────────────────────

create table if not exists public.avaliacao_metas (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.ciclos_avaliacao(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  ordem smallint not null default 0,
  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists avaliacao_metas_ciclo_funcionario_idx
  on public.avaliacao_metas (ciclo_id, funcionario_id);

-- Quem pode cadastrar/alterar/excluir: administrador da empresa (a qualquer momento antes de
-- encerrar = "destravar") ou o gestor no organograma, só com o ciclo em rascunho.
create or replace function public.pode_editar_metas(p_ciclo_id uuid, p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1
    from public.ciclos_avaliacao c
    join public.funcionarios f on f.id = p_funcionario_id and f.client_id = c.client_id
    where c.id = p_ciclo_id
      and c.metas_individuais
      and c.status <> 'encerrado'
      and (
        public.e_admin_do_ciclo(c.id)
        or (c.status = 'rascunho' and public.e_gestor_do_funcionario(p_funcionario_id))
      )
  );
$func$;

-- Quem vê: quem edita, o gestor no organograma e quem já acessa a avaliação comum da pessoa
-- naquele ciclo (o próprio avaliado, o avaliador designado, administrador e calibragem). Como a
-- avaliação só é criada na ativação, o avaliado só vê as metas depois que o ciclo ativa.
create or replace function public.pode_ver_metas(p_ciclo_id uuid, p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select public.pode_editar_metas(p_ciclo_id, p_funcionario_id)
    or public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_gestor_do_funcionario(p_funcionario_id)
    or exists (
      select 1 from public.avaliacoes a
      where a.ciclo_id = p_ciclo_id
        and a.funcionario_id = p_funcionario_id
        and a.tipo = 'padrao'
        and public.pode_acessar_avaliacao(a.id)
    );
$func$;

revoke all on function public.pode_editar_metas(uuid, uuid) from public, anon;
revoke all on function public.pode_ver_metas(uuid, uuid) from public, anon;
grant execute on function public.pode_editar_metas(uuid, uuid) to authenticated;
grant execute on function public.pode_ver_metas(uuid, uuid) to authenticated;

alter table public.avaliacao_metas enable row level security;
revoke all on public.avaliacao_metas from anon;
grant select, insert, update, delete on public.avaliacao_metas to authenticated;

drop policy if exists avaliacao_metas_select on public.avaliacao_metas;
create policy avaliacao_metas_select on public.avaliacao_metas
  for select to authenticated using (public.pode_ver_metas(ciclo_id, funcionario_id));

drop policy if exists avaliacao_metas_insert on public.avaliacao_metas;
create policy avaliacao_metas_insert on public.avaliacao_metas
  for insert to authenticated with check (public.pode_editar_metas(ciclo_id, funcionario_id));

drop policy if exists avaliacao_metas_update on public.avaliacao_metas;
create policy avaliacao_metas_update on public.avaliacao_metas
  for update to authenticated
  using (public.pode_editar_metas(ciclo_id, funcionario_id))
  with check (public.pode_editar_metas(ciclo_id, funcionario_id));

drop policy if exists avaliacao_metas_delete on public.avaliacao_metas;
create policy avaliacao_metas_delete on public.avaliacao_metas
  for delete to authenticated using (public.pode_editar_metas(ciclo_id, funcionario_id));

-- No máximo 5 metas por pessoa no ciclo; meta não troca de pessoa nem de ciclo.
create or replace function public.checar_avaliacao_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if tg_op = 'UPDATE' and (new.ciclo_id <> old.ciclo_id or new.funcionario_id <> old.funcionario_id) then
    raise exception 'Uma meta não pode mudar de pessoa nem de ciclo.';
  end if;
  if tg_op = 'INSERT' and (
    select count(*) from public.avaliacao_metas
    where ciclo_id = new.ciclo_id and funcionario_id = new.funcionario_id
  ) >= 5 then
    raise exception 'Cada pessoa pode ter no máximo 5 metas no ciclo.';
  end if;
  new.updated_at := now();
  return new;
end;
$func$;

drop trigger if exists avaliacao_metas_checar on public.avaliacao_metas;
create trigger avaliacao_metas_checar
  before insert or update on public.avaliacao_metas
  for each row execute function public.checar_avaliacao_meta();

-- Meta criada ou excluída depois da ativação (correção do administrador): mantém as linhas de nota
-- em avaliacoes_tecnica e as médias técnicas da avaliação em dia. Sem isso, uma meta nova não
-- entraria em avaliacao_completude() e uma meta excluída deixaria nota órfã contando na média.
create or replace function public.sincronizar_notas_da_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  a record;
begin
  if tg_op = 'INSERT' then
    insert into public.avaliacoes_tecnica (avaliacao_id, criterio_key)
    select av.id, 'meta:' || new.id
    from public.avaliacoes av
    where av.ciclo_id = new.ciclo_id and av.funcionario_id = new.funcionario_id and av.tipo = 'padrao'
    on conflict (avaliacao_id, criterio_key) do nothing;
    return new;
  end if;

  -- Exclusão em cascata (ciclo ou funcionário apagado): as avaliações vão junto, nada a sincronizar.
  if not exists (select 1 from public.ciclos_avaliacao where id = old.ciclo_id)
     or not exists (select 1 from public.funcionarios where id = old.funcionario_id) then
    return old;
  end if;

  for a in
    select av.id from public.avaliacoes av
    where av.ciclo_id = old.ciclo_id and av.funcionario_id = old.funcionario_id and av.tipo = 'padrao'
  loop
    delete from public.avaliacoes_tecnica where avaliacao_id = a.id and criterio_key = 'meta:' || old.id;
    update public.avaliacoes set
      media_tecnica_auto = (select avg(nota_auto) from public.avaliacoes_tecnica where avaliacao_id = a.id and criterio_key like 'meta:%'),
      media_tecnica_gestor = (select avg(nota_gestor) from public.avaliacoes_tecnica where avaliacao_id = a.id and criterio_key like 'meta:%'),
      media_tecnica_calibragem = (select avg(nota_calibragem) from public.avaliacoes_tecnica where avaliacao_id = a.id and criterio_key like 'meta:%')
    where id = a.id;
  end loop;
  return old;
end;
$func$;

drop trigger if exists avaliacao_metas_sincronizar on public.avaliacao_metas;
create trigger avaliacao_metas_sincronizar
  after insert or delete on public.avaliacao_metas
  for each row execute function public.sincronizar_notas_da_meta();

-- ── 3. Ativação exige metas ─────────────────────────────────────────────────
-- A avaliação comum de quem não tem nenhuma meta não é criada (a montagem do ciclo já avisa antes;
-- isto é a trava no servidor).
create or replace function public.checar_avaliacao_tem_metas()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_nome text;
begin
  if new.tipo = 'padrao'
     and exists (select 1 from public.ciclos_avaliacao where id = new.ciclo_id and metas_individuais)
     and not exists (
       select 1 from public.avaliacao_metas
       where ciclo_id = new.ciclo_id and funcionario_id = new.funcionario_id
     ) then
    select full_name into v_nome from public.funcionarios where id = new.funcionario_id;
    raise exception '% ainda não tem metas cadastradas neste ciclo.', coalesce(v_nome, 'Esta pessoa');
  end if;
  return new;
end;
$func$;

drop trigger if exists avaliacoes_checar_metas on public.avaliacoes;
create trigger avaliacoes_checar_metas
  before insert on public.avaliacoes
  for each row execute function public.checar_avaliacao_tem_metas();

commit;

-- ── DESFAZER ────────────────────────────────────────────────────────────────
-- drop trigger if exists avaliacoes_checar_metas on public.avaliacoes;
-- drop function if exists public.checar_avaliacao_tem_metas();
-- drop table if exists public.avaliacao_metas;   -- leva os triggers dela junto
-- drop function if exists public.sincronizar_notas_da_meta();
-- drop function if exists public.checar_avaliacao_meta();
-- drop function if exists public.pode_ver_metas(uuid, uuid);
-- drop function if exists public.pode_editar_metas(uuid, uuid);
-- drop trigger if exists ciclos_avaliacao_metas_individuais on public.ciclos_avaliacao;
-- drop function if exists public.checar_ciclo_metas_individuais();
-- alter table public.ciclos_avaliacao drop column if exists metas_individuais;
-- (notas com criterio_key 'meta:%' em avaliacoes_tecnica ficam órfãs; apagar à mão se preciso)
