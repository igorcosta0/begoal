-- Sinal vital pode ser ligado a um KR (além do objetivo, que já existia).
-- Rodar ANTES do deploy: a página de Sinais Vitais passa a ler krs!kr_id.
-- Excluir o KR só desfaz o vínculo (on delete set null), não apaga o sinal vital.
-- RLS de sinais_vitais não muda (a coluna nova segue as policies da tabela).

alter table public.sinais_vitais
  add column if not exists kr_id uuid references public.krs(id) on delete set null;

create index if not exists sinais_vitais_kr_id_idx on public.sinais_vitais (kr_id);

-- Verificação: deve devolver 1 linha.
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'sinais_vitais' and column_name = 'kr_id';

-- DESFAZER:
-- alter table public.sinais_vitais drop column if exists kr_id;
