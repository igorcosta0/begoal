-- Táticas sem campos obrigatórios na BeHive (pedido do Igor, 25/10/2026).
-- O banco passa a aceitar tática sem KR e sem descrição. Só afrouxa a regra:
-- nas outras empresas o formulário continua exigindo os dois campos.
-- As regras de acesso de `taticas` já aceitam tática sem KR: a política
-- "Usuários autenticados podem gerenciar taticas" vale pelo "Client_Id".

alter table public.taticas alter column kr_id drop not null;
alter table public.taticas alter column descricao drop not null;

-- DESFAZER (só funciona se nenhuma tática estiver sem KR ou sem descrição):
-- alter table public.taticas alter column kr_id set not null;
-- alter table public.taticas alter column descricao set not null;
