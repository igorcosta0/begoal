# Contexto do projeto — begoal (CTZ)

> Carregado automaticamente pelo Claude Code em toda sessão nesta pasta. Fica **curto de propósito**:
> só o que vale para qualquer sessão (como trabalhar, regras do banco, estado atual dos módulos,
> pendências). O detalhe de cada sessão vai para `docs/historico-sessoes.md`: **acrescentar a entrada
> no fim daquele arquivo, não aqui**. Aqui, só atualizar uma seção quando um fato ou uma regra mudar.
> Commitar este arquivo e o histórico junto do trabalho da sessão (edição solta já se perdeu uma vez).

## v1 e v2

- **v1** = este repositório (`C:\dev\begoal`), em produção na CTZ e nas empresas do grupo BMG.
- **v2** = reescrita do zero, em `C:\dev\begoal-v2` (repo privado `igorcosta0/begoal-v2`, branch
  `main`, sem deploy). **O andamento da v2 NÃO fica neste arquivo**: está na memória do Claude
  (`begoal-v2-decisoes.md`, seção do código, a partir de 14/10) e no Notion (página "Begoal v2":
  Roadmap, Paridade, Diário). **Para trabalhar na v2, abrir a sessão aqui em `C:\dev\begoal`** (é
  onde está a memória do Claude; uma sessão aberta em `C:\dev\begoal-v2` começa sem ela) e mexer nos
  arquivos de `C:\dev\begoal-v2`.
- O que entra na v1 precisa ser reproduzido na v2: registrar na Paridade do Notion.

## Como trabalhar aqui

- **Repositório**: `https://github.com/igorcosta0/begoal.git`, pasta `C:\dev\begoal`. O usuário do
  Windows é `IGOR` (era `igorc` antes da formatação de out/2026; caminhos antigos no histórico usam
  `igorc`). Memória do Claude: `C:\Users\IGOR\.claude\projects\C--dev-begoal\memory\`.
- **A branch que importa é `master`, não `main`** (`main` é uma v1 antiga, quase vazia). **Todo
  `git push` para `master` faz deploy em produção na Vercel**: confirmar antes de enviar o que não
  deveria ir para o ar.
- **Validar antes do push**: `npm run type-check` (`tsc --noEmit`). `npm run lint` também está
  configurado, e `next build` passa localmente (o build roda o lint).
- **Não dá para ver as telas logadas no localhost** (o middleware manda para `/login`, e não temos
  sessão nem service role key aqui). Para conferir o visual, usar o Chrome do Igor (Claude in Chrome)
  em produção, ou montar uma prévia com dados fictícios e apagar depois.
- **Avisar o Igor ANTES de instalar qualquer coisa** e baixar só o necessário. Depois de instalar,
  a sessão aberta não pega o PATH novo: somar à mão (`$env:PATH = "C:\Program Files\Git\cmd;" + $env:PATH`)
  ou reiniciar a sessão.
- **`git push` bloqueado pelo auto mode classifier** (acontece às vezes, mesmo com o Igor confirmando
  no chat): só ele libera, de fora da sessão. Pedir para trocar o modo para **Accept Edits**
  (`Shift+Tab`); se não resolver, Bypass Permissions. Não tentar contornar editando `settings.json`.
  A credencial do GitHub está no Windows Credential Manager e funciona direto.
- **Formatação do notebook (18/10/2026)**: restaurado em 19/10 nos mesmos caminhos. O backup local
  foi apagado; a única cópia é o zip que o Igor guardou fora do notebook. Se faltar `.env.local`,
  `Adições futuras/` ou a memória do Claude, pedir esse zip a ele.
- **`Adições futuras/` fica fora do Git de propósito** (planilhas, scripts de carga, dados reais de
  pessoas, material com direitos autorais). Scripts SQL de carga e relatórios vão para lá.

## Banco (Supabase)

- **Migrations são aplicadas à mão**: os arquivos em `supabase/migrations/` não rodam sozinhos. A
  tabela de histórico de migrations do Supabase está vazia, então o repositório é o único registro.
- **Toda migration nova leva o prefixo `PENDENTE_`** antes da data (ex.:
  `PENDENTE_20261016000000_algo.sql`). O prefixo nunca é removido, então **não indica se a migration
  já rodou**: conferir no banco. Ao criar uma, avisar o Igor para rodar ANTES do push que depende dela.
- **Rodar SQL pelo Chrome**: o SQL Editor do Supabase abre logado no Chrome do Igor; o texto entra
  com `window.monaco.editor.getModels()[0].setValue(...)` e o resultado sai com `get_page_text`.
  Gravações às vezes são barradas pelo auto mode: aí o Igor roda o script. Para script grande, servir
  o arquivo numa página local (Node) e redirecionar para `.../sql/new#x=<texto codificado>`, lendo
  `location.hash` no editor (o Supabase bloqueia `fetch` para 127.0.0.1).
- **No SQL Editor, não usar `create temp table ... on commit drop`** para passar dados entre comandos
  (dá erro `42P01`): usar um comando só, com CTEs.
- **O MCP do Supabase**, quando está conectado, é só leitura (`--read-only` em `~/.claude.json`).
- **O projeto no plano gratuito ("OKR's") pausa sozinho** quando fica parado, e o sistema sai do ar.
  O Igor restaura pelo painel ("Resume project"); leva alguns minutos.
- **Criar empresa dispara um gatilho no banco** (que não está nas migrations): cria o setor
  "Corporativo", o funcionário "Administrador" e papéis de administrador para as contas
  "superusuário". Inserir em `user_company_roles` logo depois precisa de
  `on conflict (user_id, client_id)`.
- **RLS que bloqueia UPDATE/DELETE devolve 0 linhas, sem erro.** Gravações usam `.select('id')` +
  `mensagemErroGravacao` (`utils.ts`) para mostrar o erro.
- **"Esqueci minha senha" não entrega e-mail** para quem não é da equipe do projeto (SMTP padrão do
  Supabase). Logins novos são criados com a senha padrão (a mesma do login do Lucas Rosa). Quem
  entra com ela só vê o pop-up de troca obrigatória (`TrocaSenhaObrigatoria`, no layout do
  `(dashboard)`), pela função `usando_senha_padrao()`; a senha fica na tabela `senha_padrao` (sem
  acesso pela API), preenchida por `Adições futuras/Senha padrao - configurar.sql`, nunca no Git.
  Criar `auth.users`/`auth.identities` por SQL funciona; o gatilho `on_auth_user_created` cria
  `profiles`. Modelo: `Adições futuras/CTZ - novos funcionarios 2026-10.sql`.
- **Acesso "igual ao de Igor e Priscila"** (Letícia Leite, Eduardo Rigotto, Sandra Melo) = admin em
  todas as empresas existentes (`cross join clients`, roda uma vez: empresa criada depois NÃO herda),
  `is_calibrador` na CTZ, cadastro "Consultora Externa (BeHive)" na CTZ, user_id nas funções
  `pode_ver_lado_calibragem`/`pode_ver_todos_eneagrama_ctz` e e-mail nas listas fixas do front
  (`utils.ts`, `avaliacao/page.tsx`, `autoconhecimento/page.tsx`). Modelo:
  `PENDENTE_20261016000000_sandra_melo_acesso_igual_igor_priscila.sql`.
- **Gemini** (Autoconhecimento): toda chamada passa por `src/lib/gemini.ts` (`chamarGemini`, chave no
  cabeçalho, fallback de `gemini-3.6-flash` para `gemini-3.1-flash-lite`). Erro 429 = cota esgotada,
  não se resolve com código.

## Estado atual dos módulos (v1)

### Avaliação de Desempenho (só CTZ)
- Status: `pendente → auto_concluida → gestor_concluida → calibragem → finalizada`.
- **Cada usuário só vê a nota que ELE deu, nunca a que recebeu**, sem exceção. A coluna
  `avaliacoes.revelado` é resíduo e não faz nada.
- **Notas não são lidas nem gravadas direto nas tabelas** (migration
  `PENDENTE_20260923000000_avaliacao_fecha_notas_api.sql`): leitura pelas funções `get_*` (SECURITY
  DEFINER, dono `avaliacao_leitor`), escrita pelas RPCs `salvar_nota_avaliacao`,
  `atualizar_avaliacao`, `iniciar_calibragem_ciclo` e `finalizar_calibragem_ciclo`. No front, só
  `src/lib/queries/avaliacao.ts` fala com elas. A migration tem um bloco "DESFAZER" no fim.
- **Calibragem do ciclo inteiro** (`souGestorDaCalibragem` no front, `pode_ver_lado_calibragem` no
  banco): na CTZ, Igor, Filippe Réus, Priscila e quem tem acesso "igual ao de Igor e Priscila" (ver
  acima). Em outra empresa, qualquer administrador. "Iniciar Calibragem" move todo mundo de uma vez,
  sem esperar auto+gestor; por isso, status `calibragem` não quer dizer que a nota foi preenchida.
- **Calibragem restrita** (só os próprios liderados, pelo `funcionarios.gestor_id`): Graciela,
  Felipe Marques, Felipe Bet Ross e Filipe Finato. Flag `souCalibradorRestrito` (escopado por
  avaliação: não vale na própria) + função `e_calibrador_restrito(funcionario_id)`. Não entra no
  Painel de Calibragem nem nas ações em lote.
- O "Salvar" do `ModalAvaliacao` é tudo-ou-nada (contorno vermelho nos campos que faltam). Só exige
  calibragem numa seção se a nota base dela já estava salva no banco quando o modal abriu.
- Selo "Concluída" = `avaliacao_completude()` (confere campo a campo, diferente do `status`).
- Avaliação de pares: cultural + técnica, sem autoavaliação; o par grava em `nota_gestor`; a
  vertical técnica trava na da avaliação comum (`get_vertical_padrao`).
- Verticais e critérios em `VERTICAIS_CTZ` (`ModalAvaliacao.tsx`); pilares culturais em
  `src/lib/pilaresCulturais.ts`. A aba "Visão geral" abre primeiro no ciclo (só avaliação comum).
- **Metas individuais** (desde 21/10/2026, `ciclos_avaliacao.metas_individuais`, padrão em ciclo
  novo): o Desempenho usa de 1 a 5 metas por pessoa (`avaliacao_metas`) no lugar dos critérios da
  vertical. O gestor no organograma cadastra com o ciclo em rascunho; ao ativar, travam (só
  administrador corrige); ninguém entra no ciclo sem meta (gatilho em `avaliacoes`). As notas ficam
  em `avaliacoes_tecnica` com `criterio_key = 'meta:<id>'`, pelas mesmas RPCs. Pares fica só com a
  Cultura. Ciclos antigos seguem com a vertical. Tela: `PainelMetas` (aba "Metas" e seção do
  líder); guia próprio no botão "Guia da Avaliação" (`guiaAvaliacao.ts`, mesmo `TourOverlay`).

### Autoconhecimento / Eneagrama (só CTZ)
- Vê o módulo: piloto (lista fixa em `utils.ts`), quem tem liderado no organograma
  (`sou_lider_de_alguem()`) ou tem "Líder" no `funcionarios.cargo`. Regra única em
  `src/lib/autoconhecimentoAcesso.ts`, aplicada no menu, na Início, na página e na rota de API.
- Mapa de si (todos que veem o módulo) e Mapa do time (líderes). A conversa "sobre um colega" é só
  do piloto. Igor/Priscila/Sandra veem a página como **simulação do Felipe Marques**.
- **Time espelhado** (`funcionarios.ve_time_de`, 22/10/2026): o Mapa do time mostra os liderados
  diretos do cadastro apontado ali, além dos próprios (função `meus_cadastros_de_lider()`). Hoje só o
  Célio Bitencourt → Felipe Marques. Não muda organograma nem Avaliação.
- **O tipo de outra pessoa nunca vai para o navegador**: só as rotas de API leem, por funções
  SECURITY DEFINER. A lista "Perfis da equipe" (tipo de todos) foi removida (commit `38172fc`).
- Perfis em `funcionarios_eneagrama` (tabela própria, RLS "só a própria linha").

### OKRs e Sinais Vitais (todas as empresas)
- Cálculo de progresso único em `src/lib/okrProgresso.ts`. KR tem `direcao` (maior/menor) e
  `apuracao` (ultimo/soma/media); metas mensais em `kr_metas_mensais`.
- KRs e sinais vitais têm ordem manual (`ordem`, arrastar pela alça ⋮⋮). Sinal vital pode ligar a
  objetivo e a KR (`kr_id`) e pode estar em "Removidos" (`removido_em`, aguardando validação).
- Qualquer membro da empresa cria/edita KR, objetivo e lançamentos.
- Táticas: a coluna "Atrasados" é calculada (`taticaAtrasada` em `utils.ts`), não é status gravado.

### Outros
- **Grupo de empresas (BMG)**: cada negócio é uma empresa própria em `clients`, ligadas por
  `grupo`/`negocio`/`negocio_ordem`; a `Topbar` troca de negócio. Não há visão consolidada do grupo.
- **Pesquisa** (só CTZ, só admin cria): interna anônima e externa por link `/responder/<token>`.
  **Segue o guia do Miro** (M1–M5, F01–F59; link na memória `pesquisa-guia-miro.md`), em etapas:
  1) M2, feita em 23/10 (assistente em 4 passos, modelos e banco em `src/lib/pesquisaModelos.ts`,
  IA em `/api/pesquisa-sugerir-perguntas`, tipos `escala_0_10` e `multipla_varias`, duplicar);
  2) M4+M5 sem filtros, feita em 23/10 (status `pausada`, participação e lembrete por e-mail do
  próprio admin, gráficos em `GraficoPergunta.tsx`, atualiza a cada 20 s); 3) M3, feita em 23/10
  (público `lista` com link individual sem login, `/responder/convite/<token>`; `pesquisas.filtro` por
  área/cargo/cliente; link aberto com identificação opcional e QR; recorrência com "Reaplicar";
  a resposta guarda `segmento` sem nome); 4) filtros, comparativos e IA nos resultados;
  5) perfis (M1). A nota de 1 a 5 ficou só para as pesquisas antigas. **Recortes por segmento só
  com 5 respostas ou mais** (decisão do Igor). Convite e lembrete saem do e-mail do próprio admin
  (sem serviço de envio). Planilhas pelo SheetJS do CDN oficial (0.20.3), não o `xlsx` do npm.
- **Foto de perfil e "Sobre mim"** ficam em `funcionarios_perfil_publico` (a escrita em
  `funcionarios` é só de administrador; o próprio nome usa a RPC `atualizar_meu_nome`).
- **Cargos** (`cargos_perfil`, só CTZ): o cadastro de funcionário novo escolhe o cargo dessa lista.

## Pendências abertas

- Do pente fino (`Adições futuras/Pente Fino - begoal - 2026-09-23.md`) e da verificação para venda
  (`Adições futuras/Verificacao para venda - begoal - 2026-09-25.md`): C2 (RLS de `clients` e
  superadmin), C3, C4 (conferir o plano da chave Gemini no AI Studio), C6 (e-mails/UUIDs fixos), os
  itens A e M que não foram corrigidos em 25/09, Next 15/16 (o 14.2.35 ainda tem falhas no
  `npm audit`), Vercel Hobby proíbe uso comercial, sem staging, sem termos/LGPD, RLS desabilitado em
  `page_access_log` e `Propagandas`.
- Confirmar se `PENDENTE_20260925000000_avatars_limites.sql` foi rodada.
- Dados: a análise de cargo do Guilherme não foi gerada; os sinais vitais em "Removidos" esperam validação para serem apagados;
  KRs de Corretagem/repasse (Finato): anual × mensal sem resposta; logins das pessoas da BMG (falta
  a lista com e-mails).
