# Contexto do projeto — begoal (CTZ)

> Este arquivo é carregado automaticamente pelo Claude Code toda vez que uma
> sessão abre nesta pasta. Serve pra não perder contexto entre sessões —
> sempre que fizermos algo relevante, acrescento uma entrada no "Log de
> Sessões" no final do arquivo, sem apagar as anteriores.

## Fatos operacionais importantes

- **Repositório de verdade**: `https://github.com/igorcosta0/begoal.git`, pasta local `C:\dev\begoal`.
- **Branch que importa é `master`, não `main`.** `main` está praticamente vazia (só 3 commits, versão v1 do módulo de avaliação, sem calibragem/pares/nota 1-5). Todo o trabalho real está em `master`, que o Vercel usa pra deploy automático — **todo `git push` pra `master` dispara deploy em produção**, confirmar antes de enviar mudança que não deveria ir pro ar ainda.
- **Existe uma cópia antiga e quebrada do projeto em `C:\Users\igorc\OneDrive\Documents\begoal-master-20260825T123459Z-1-001\begoal-master`** — não é a pasta de trabalho, é um backup/export incompleto (faltam quase todos os arquivos de `src/`, `node_modules` parcial, sem histórico de git). Se uma sessão abrir lá por engano, os arquivos de `src/app`/`src/components` vão aparecer vazios — não é bug do Claude, é a cópia mesmo. Ignorar essa pasta, trabalhar sempre em `C:\dev\begoal`.
- **Migrations do Supabase são aplicadas manualmente** — os arquivos em `supabase/migrations/*.sql` não rodam sozinhos, é preciso colar cada um no SQL Editor do Supabase e rodar. Ao criar uma migration nova, sempre avisar o usuário pra rodar antes do `git push` correspondente.
- **Git e Node não vinham instalados** nesta máquina (Windows) — foram instalados via `winget install --id Git.Git` e `winget install --id OpenJS.NodeJS.LTS`. Depois de instalar, é preciso adicionar ao PATH da sessão atual manualmente (`$env:PATH = "C:\Program Files\Git\cmd;" + $env:PATH`, idem pra `C:\Program Files\nodejs`), porque uma sessão já aberta não pega o PATH atualizado sozinha.
- **`git push` já funciona direto por aqui** — a primeira vez precisou que o usuário rodasse o push manualmente numa janela de terminal aberta por ele (pra completar o login do Git Credential Manager pelo navegador, algo que não funciona rodando por dentro do Claude Code). Depois disso a credencial ficou salva no Windows Credential Manager (`cmdkey /list` mostra `git:https://github.com`) e ficou visível pra esta sessão também — não precisa repetir esse processo.
- **`npm run type-check`** (`tsc --noEmit`) é o jeito de validar mudança de código sem precisar rodar o app inteiro (não temos as env vars do Supabase aqui pra um `next build` completo). Rodar sempre antes de dar push em mudança de `.tsx`/`.ts`.
- **`git push` pode ser bloqueado pelo "auto mode classifier" do Claude Code**, mesmo com o usuário confirmando no chat (aconteceu em 31/08) — a mensagem de erro é explícita: só o usuário pode liberar, de fora da sessão. Não adianta tentar de novo pela mesma via nem tentar editar `settings.json` (também cai no mesmo bloqueio). Solução: pedir pro usuário trocar o modo de permissão da sessão pra **Accept Edits** (`Shift+Tab` no terminal) — resolveu de primeira. Se não resolver, o próximo a tentar é **Bypass Permissions** (mais permissivo).

## Módulo de Avaliação de Desempenho — estado atual (2026-08-26)

- Fluxo de status: `pendente → auto_concluida → gestor_concluida → calibragem → finalizada`.
- Cada usuário só vê a nota que ELE deu, nunca a que recebeu — regra absoluta, sem exceção de etapa/calibragem/revelação (migration `20260822_avaliacao_bloqueio_total_notas`). A coluna `avaliacoes.revelado` existe mas não faz mais nada (a máscara que dependia dela foi removida) — é resíduo, não mexer achando que ainda funciona.
- Calibragem é etapa **ciclo inteira**. Acesso (Iniciar/Finalizar/Painel/aba Calibragem do ModalAvaliacao) é `souGestorDaCalibragem` (não confundir com `isAdmin`, que é só "papel de avaliador nesta avaliação específica"): **na CTZ, só Igor, Filippe Réus e Priscila Santos** veem/calibram o ciclo inteiro (pedidos 27/08, 28/08 e revertido em 02/09 — ver abaixo e Log de Sessões); em qualquer outra empresa continua sendo qualquer administrador de verdade (`souAdministrador`), igual sempre foi. Nem o avaliador que preencheu a nota do gestor vê a calibragem. "Iniciar Calibragem" não trava mais esperando todo mundo concluir auto+gestor — move de uma vez todo mundo que ainda não está em calibragem/finalizada (pedido 27/08).
- **Calibragem restrita** (pedido 02/09, distinto do item acima): Graciela Borges Hoepers, Felipe Marques Santos e (desde 08/09) Felipe Bet Ross e Filipe Bossoni Finato calibram só os PRÓPRIOS liderados (organograma, `funcionarios.gestor_id`), não o ciclo inteiro — flag separado `souCalibradorRestrito` (lista de e-mails) + função `e_calibrador_restrito(funcionario_id)` no banco (migrations `PENDENTE_20260902000000_calibragem_restrita_graciela.sql`, `PENDENTE_20260902010000_calibragem_felipe_marques_restrito.sql` — tirou o Felipe Marques da lista de acesso ao ciclo inteiro, só Filippe Réus, dono da empresa, ficou junto de Igor/Priscila lá —, `PENDENTE_20260908000000_calibragem_felipe_ross_restrito.sql` e `PENDENTE_20260908010000_calibragem_finato_restrito.sql`). Não entra na lista de `souGestorDaCalibragem` acima nem nas ações em lote/Painel de Calibragem. Ver Log de Sessões.
- **Selo "Concluída"** (pedido 09/09): diferente do `status`, que pode avançar em lote sem que auto/gestor/calibragem tenham sido preenchidos de verdade (ver item acima). Função `avaliacao_completude(avaliacao_id)` no banco (migration `PENDENTE_20260909000000_avaliacao_completude.sql`) confere campo a campo (não a média) e alimenta a coluna `completa` nas 3 leituras de avaliação (`get_avaliacoes_por_ciclo`, `get_minhas_avaliacoes`, `get_avaliacoes_para_avaliar`); Painel de Calibragem calcula igual, mas em cima dos dados que ele já recebe (sem chamada nova). Aparece nos 3 lugares: lista do ciclo (admin), Painel de Calibragem e Minhas Avaliações/Preciso Avaliar.
- Avaliação de Pares tem cultural (4 pilares) **e técnica** (pedido 27/08 — antes era só cultural) — montada à mão pelo admin junto com a avaliação comum, não tem autoavaliação, o avaliador preenche a nota no campo `nota_gestor` (mesmo slot que o gestor usa na avaliação comum). A vertical técnica do par é travada automaticamente na vertical da avaliação comum de quem está sendo avaliado (`get_vertical_padrao`) — não é livre pro par escolher.
- ~~Pendente: unificar os botões "Salvar" e "Concluir [etapa]"~~ — **feito** (commit `3559d2d`). O "Salvar" do `ModalAvaliacao` é tudo-ou-nada (bloqueia TUDO se faltar 1 campo, sem autosave) — desde 27/08 mostra contorno vermelho nos campos específicos que faltam e troca de aba sozinho pro problema, mas o comportamento tudo-ou-nada em si continua o mesmo (ver Log de Sessões, incidente da Graciela).

## Log de Sessões

### 2026-09-21
- Dois pedidos independentes do Igor, sem AskUserQuestion prévio (auto mode, ambos claros o
  suficiente pra decidir sozinho, mas registrando as escolhas feitas no meio do caminho):
  1. **Página "Objetivos" (`/objetivo`) reformulada em "Nosso jeito de ser"** — parou de listar/
     criar objetivos estratégicos (isso nunca foi a única forma de gerenciar objetivo: `/okr` já
     tinha CRUD completo de objetivo embutido desde sempre — `ModalCriarObjetivo`/
     `ModalEditarObjetivo` dentro de `okr/page.tsx` —, então a página antiga era redundante, não
     uma funcionalidade única sendo removida). Rota mantida (`/objetivo`, só o nome mudou, pra não
     quebrar link nenhum), agora mostra Visão de Futuro, Mercado (+ mural "Nota fixada") e Valores
     da empresa — os 4 blocos que antes viviam na Início. `Sidebar`/`Topbar` e o tile da grade de
     módulos em `inicio/page.tsx` atualizados (label "Nosso jeito de ser", ícone trocado de `Flag`
     pra `Heart`); `guia/page.tsx` também.
  2. **Movidos de verdade** — `ChipList`/`NotaFixada` (componentes) e todo o estado/handlers de
     `empresa_identidade`/`empresa_valores` saíram de `inicio/page.tsx` e foram pra
     `objetivo/page.tsx` (não duplicados). Início ficou mais enxuta: hero (saudação + KPIs +
     campanha, sem mais o bloco de Visão de Futuro dentro dele) + grade de módulos + o gráfico de
     desempenho de OKRs — que virou o único conteúdo do "corpo" da página, então o grid de duas
     colunas (`lg:grid-cols-[1.7fr_1fr]`) virou uma coluna só.
  3. `useTourStore.ts` reordenado pra não ficar pulando entre `/inicio` e `/objetivo` no meio do
     tour: hero e OKRs (ambos em `/inicio`) ficam juntos, depois um passo novo de introdução
     ("Nosso jeito de ser") e os dois passos de mercado/valores, todos os 3 já em `/objetivo`, só
     depois seguindo pro resto do tour. Texto do passo do hero perdeu a menção a "visão de futuro"
     (não mora mais lá).
  4. **Avaliação — detalhamento de maior/menor nota por vertical** (aba "Gráficos" do ciclo, pedido
     de mostrar isso "baseado nas perguntas das avaliações"): os gráficos existentes (`Concluídas ×
     Em aberto`, `Média Cultural × Performance`) só tinham a média JÁ PRONTA por avaliação (colunas
     `media_cultural_gestor`/`calibragem` etc. em `avaliacoes`), sem granularidade de pergunta —
     precisou de uma RPC nova, `get_detalhamento_perguntas_ciclo` (migration
     `PENDENTE_20260921000000_avaliacao_detalhamento_perguntas.sql`, **ainda não rodada no
     Supabase, avisar o Igor antes do próximo push**), que devolve uma linha por
     (avaliação, pilar cultural) ou (avaliação, critério técnico) com a MESMA cascata "nota final
     conhecida até agora" (`nota_calibragem ?? nota_gestor`) e a MESMA máscara de coluna que
     `get_avaliacoes_por_ciclo` já usa (`pode_ver_lado_gestor`/`pode_ver_lado_calibragem`) — sem
     isso a granularidade nova vazaria nota pra quem a tela hoje já esconde. Front-end
     (`GraficosAvaliacao.tsx`) agrega por (vertical, pergunta) e acha a maior/menor média — cultural
     (4 pilares, compartilhados entre TODAS as verticais) e técnica (critérios exclusivos de cada
     vertical, `VERTICAIS_CTZ`) tratados separado, senão a comparação "melhor pergunta" misturaria
     coisas incomparáveis. Aparece como card novo (`md:col-span-2`) dentro do grid dos 2 gráficos
     existentes, um mini-card por vertical, respeitando o mesmo filtro de vertical que os outros 2
     já tinham (pedido de 11/09). Só front-end + a migration nova — nenhuma tabela/RLS existente foi
     tocada, `get_calibragem_ciclo_cultural/tecnica` (usadas no Painel de Calibragem) não mudaram.
  5. `npm run type-check` limpo em cada etapa. Migration do item 4 rodada pelo Igor no SQL Editor,
     confirmada — commit `56c58e6` enviado a `master` (deploy no ar).
- Dois pedidos novos, mesma sessão, depois do push acima:
  1. **Redesign de "Nosso jeito de ser"** (pedido "melhore o design... pra ficar mais organizada e
     atrativa") — a assimetria herdada da Início (coluna 1.7fr com Visão de Futuro em card escuro +
     Mercado/Nota espremidos, coluna 1fr só com Valores) não fazia mais sentido como página própria.
     Criado um cabeçalho colorido reutilizável (`CabecalhoSecao`, componente local no próprio
     arquivo — faixa em degradê + textura de pontos + selo/título/descrição, só troca o tom) e
     aplicado nas 4 seções: Visão de Futuro virou um banner de largura cheia no topo (tom azul,
     ícone `Compass`, texto grande com um `Quote` decorativo de fundo — antes era um cartão escuro
     estilo "hero" que não combinava mais com o resto da página, todo em tons claros); embaixo, grid
     de 3 colunas iguais — Mercado (azul), Nota Fixada (âmbar, antes dividia card com Mercado, agora
     card próprio) e Valores (violeta, já existia, só passou a usar o cabeçalho compartilhado). Só
     CSS/composição — nenhum dado, handler ou RLS mudou.
  2. **OKRs fecham por padrão** (pedido: "sempre que entrar nessa página os OKRs fiquem fechados
     mostrando só os objetivos") — `ObjetivoCard.tsx` tinha um único `useState(true)` controlando o
     accordion de KRs por card; trocado pra `useState(false)`. Cada objetivo carrega colapsado
     (só título + barra de progresso), usuário expande manualmente pra ver os KRs — sem mudança de
     dado, só o estado inicial do accordion.
  3. `npm run type-check` limpo. Tentativa de conferir via `npm run dev` esbarrou de novo na falta
     de sessão autenticada nesta máquina (middleware redireciona pra `/login` antes de compilar a
     página em si, então o `curl` só confirma que nada quebrou o build, não o visual) — mesma
     limitação de sempre (ver [[iteracao-visual-sem-navegador]]), sem Chrome conectado nem service
     role key aqui pra simular login.
- **Relato do Igor**: "Erro Gemini: 503" de novo no Autoconhecimento (ele disse "autoavaliação",
  mas a Avaliação de Desempenho não chama IA nenhuma — só o módulo de Eneagrama chama). Pesquisado
  via WebSearch (não é algo que dá pra diagnosticar só lendo o código): `gemini-3.6-flash` (nome já
  usado no código desde 09/09) é modelo real e atual — 503 nesse contexto é a própria infra
  compartilhada do Google sobrecarregada, erro documentado e recomendação oficial é "retry com
  backoff exponencial", não indica bug daqui nem cota estourada. Confirmado com o Igor via
  `AskUserQuestion` que valia adicionar o retry (já tinha acontecido mais de uma vez).
  - Criado `src/lib/gemini.ts` (`chamarGemini`), único lugar que monta a URL/model do Gemini agora
    — até 2 retries (500ms, depois 1500ms) só pra status 503/429 (os únicos documentados como
    transitórios); qualquer outro erro (400/401/404/chave inválida) continua devolvendo na primeira
    tentativa, sem esperar à toa. As 6 rotas que chamavam a API Gemini direto
    (`assistente-eneagrama`, `como-abordar-colega`, `liderar-liderado`,
    `simular-liderar-liderado`, `gerar-dica-cargo-eneagrama`, `sugerir-icp`) trocaram o `fetch` cru
    por esse helper — só a chamada de rede mudou, prompt/body/regras de cada rota continuam
    intocados. `npm run type-check` limpo.
- Quatro pedidos novos, mesma sessão:
  1. **"Nota fixada" → "Missão"** em Nosso Jeito de Ser — só o rótulo do `CabecalhoSecao` daquele
     card mudou (`objetivo/page.tsx`), mecânica do mural de comentários intocada.
  2. **Foto de perfil**, pedida pra aparecer "sempre onde houver mostrando aquele funcionário" —
     infraestrutura nova, não coluna em `funcionarios` (mesmo motivo de sempre: a policy de escrita
     de `funcionarios` exige `permission_level='administrador'`, um funcionário comum não
     conseguiria trocar a própria foto ali). `foto_url` foi pra `funcionarios_perfil_publico`
     (mesma tabela do "Sobre mim/Habilidades/Sonhos", RLS de "só a própria linha" já pronta) +
     bucket novo do Storage (`avatars`, público, escrita restrita à própria pasta
     `<user_id>/...`) — migration `PENDENTE_20260921020000_foto_perfil.sql`, **ainda não rodada no
     Supabase, avisar o Igor**. Componente novo `src/components/Avatar.tsx` (foto quando existe,
     senão inicial do nome, mesmo visual de sempre) substituiu TODOS os círculos de inicial
     `charAt(0)` de funcionário do app: Topbar (própria foto, resolvida em `layout.tsx` no
     servidor), Funcionários (lista principal), Nosso Jeito de Ser (mural "Missão"), comentários de
     Táticas, e em Avaliação — as duas listas (`Devo Avaliar`/`funcionários sem avaliação`),
     `ModalAvaliacao` (cabeçalho do colaborador) e `ModalGerenciarLideres`. Ficaram de fora de
     propósito os 2 avatares de EMPRESA (não de funcionário) em `selecao-empresa` e `admin`. Query
     nova `getFotosPerfilPorEmpresa` (`src/lib/queries/perfilPublico.ts`) devolve dois mapas numa
     chamada só (por `funcionario_id` e por `user_id`, já que uns lugares só têm um ID à mão, outros
     só o outro) e `uploadMinhaFotoPerfil` sobe o arquivo (path fixo `<user_id>/foto.<ext>` com
     upsert — reenviar substitui, sem acumular órfão — + cache-busting `?v=timestamp` na URL salva,
     senão o navegador continuaria servindo a foto antiga do mesmo path).
  3. **Cargos ganhou CRUD** (Adicionar/Editar/Excluir) — a aba nasceu somente-leitura em 09/09.
     Migration `PENDENTE_20260921030000_cargos_perfil_escrita.sql` soma INSERT/UPDATE/DELETE em
     `cargos_perfil` pro MESMO grupo que já lê (administrador
     real da empresa OU piloto do Autoconhecimento) — não abre escrita pra ninguém que não visse a
     tela toda. Modal novo `src/components/cargos/ModalCargoPerfil.tsx` (criar e editar no mesmo
     componente) + botão "Adicionar Cargo" no cabeçalho e "Editar"/"Excluir" dentro do card
     expandido, operando sobre o nível ativo (cada nível é uma LINHA própria na tabela, não um
     sub-registro). Excluir usa `ModalConfirmarExclusao` (padrão já usado no resto do app) —
     `cargo_perfil_id` em `funcionarios_cargo_perfil` referencia sem `on delete cascade`, então
     excluir um cargo com gente vinculada devolve erro 23503, tratado com a mesma
     `mensagemErroExclusao` de sempre, não apaga vínculo silenciosamente.
  4. **Avaliação — "Secretária Executiva" deixou de ser vertical própria**: o Igor apontou que essa
     pessoa é organizacionalmente parte do CSC/Financeiro, não um departamento isolado. Confirmado
     via `AskUserQuestion` (2 perguntas, já que isso mexe em régua oficial de avaliação real): (a)
     os 3 critérios técnicos de secretária (Agenda/Eventos/Viagens) foram UNIDOS aos 3 já existentes
     de CSC/Financeiro (6 no total, em vez de trocar — preserva notas técnicas já preenchidas com
     essas chaves, que continuam batendo com `avaliacoes_tecnica.criterio_key`); (b) o vertical novo
     que entra no lugar, "Líderes", ficou com critérios em RASCUNHO genérico (Gestão e
     Desenvolvimento de Equipe / Tomada de Decisão e Delegação / Resultados da Vertical Liderada) —
     o Igor optou pela sugestão pronta em vez de ditar a régua oficial, então isso é ponto de
     partida, não uma régua validada pela empresa. Tudo em `VERTICAIS_CTZ`
     (`ModalAvaliacao.tsx`). Migration `PENDENTE_20260921010000_avaliacao_merge_secretaria_lideres.sql`
     só reaponta `avaliacoes.vertical` de `'secretaria_executiva'` pra `'csc_financeiro'` pra quem
     já estava lá — não mexe em `avaliacoes_tecnica` (não precisa, as chaves de critério não
     mudaram).
  5. `npm run type-check` limpo em cada etapa. As 3 migrations desta rodada (foto de perfil, cargos
     escrita, merge secretária/líderes) foram rodadas pelo Igor e o commit `8c30846` foi enviado a
     `master` (deploy no ar).
- **Bug encontrado pelo Igor logo depois do deploy**: upload de foto na aba Perfil retornava "Erro
  ao enviar a foto: new row violates row-level security policy". Causa raiz não dava pra achar só
  lendo o código — confirmada consultando o banco direto (via MCP do Supabase, só leitura):
  `select * from storage.objects where bucket_id = 'avatars'` vinha vazio (o INSERT nunca se
  efetivava) mesmo com as policies de INSERT/UPDATE/DELETE corretas (conferidas em `pg_policies`,
  sintaxe batendo com o padrão oficial `(storage.foldername(name))[1] = auth.uid()::text`). Busca na
  documentação do Supabase confirmou: `uploadMinhaFotoPerfil` usa `upsert: true`, e a API de Storage
  faz esse upload como `INSERT ... ON CONFLICT ... RETURNING *` por baixo — o `RETURNING` exige uma
  policy de **SELECT** na linha, mesmo em upload novo, e a migration `PENDENTE_20260921020000` só
  tinha criado INSERT/UPDATE/DELETE pro bucket `avatars`, sem SELECT (raciocínio errado na hora:
  "bucket público dispensa RLS de leitura" vale só pra URL pública de download, não pra essa leitura
  interna que o próprio upload faz). Corrigido com migration `PENDENTE_20260921040000_avatars_select_policy.sql`
  (rodada pelo Igor, commit `e9ca653` enviado a `master`) — sem mudança de código front-end, só a
  policy que faltava.
- **"Loteadora (Loteamentos)" → só "Loteamentos"** — pedido simples de rótulo em `VERTICAIS_CTZ`
  (`ModalAvaliacao.tsx`), commit `bac2426` enviado a `master`.
- **Dúvida do Igor**: "não vejo o de Líderes" no card "Maior e menor nota por vertical". Não era bug
  — confirmado via SQL direto (`select * from avaliacoes where vertical = 'lideres'` vinha vazio):
  o card só mostra vertical com pelo menos uma nota técnica já preenchida, e ninguém tinha sido
  colocado no vertical "Líderes" ainda (ele já existia e já era selecionável desde a sessão
  anterior, só sem dado). Pedido de acompanhamento: "coloque baseado nos dados das avaliações dos
  líderes" — achado importante antes de agir: os 7 nomes marcados com `lider_avaliacao=true` (flag
  pensado pra Avaliação de Pares, não pra liderança de verdade — um deles, Jean Patrick, não lidera
  ninguém no organograma) **já tinham avaliação real e avançada no ciclo ativo** (a maioria em
  `calibragem`), cada um no próprio vertical (Concretize Comercial/Técnica, Novos Negócios, CSC/
  Financeiro, Loteamentos, Investimentos) — reatribuir o vertical deles pra "Líderes" agora
  apagaria a VISIBILIDADE das notas técnicas já preenchidas (critérios completamente diferentes),
  no meio de uma calibragem em andamento. Não fiz isso sem confirmar — `AskUserQuestion` (2
  perguntas): confirmado que "líder" = quem lidera gente de verdade no organograma
  (`funcionarios.gestor_id`), não o flag de pares, e confirmado NÃO mexer no ciclo ativo agora, só
  deixar pronto pro próximo.
  - Implementado em `ModalMontarAvaliacoes.tsx` (tela de montar ciclo/adicionar gente ao ciclo): a
    sugestão automática de vertical (que já existia por setor, `verticalDoFuncionario`) ganhou
    prioridade nova — quem aparece como `gestor_id` de pelo menos um funcionário no lote sendo
    montado é sugerido pra `'lideres'` antes de cair na sugestão por setor. Só afeta o PALPITE
    inicial de avaliação nova (sempre editável pelo admin no dropdown) — não toca em avaliação já
    existente, então o ciclo ativo (e as calibragens em andamento) ficam intocados, exatamente como
    pedido. `npm run type-check` limpo.
- Depois disso, pedido do Igor: "ainda não aparece por falta de dados, eu preciso que tenha alguma
  coisa mostrando, do mesmo jeito que os outros". Sem inventar nota de avaliação real (isso seria
  fabricar dado de desempenho de pessoa de verdade), a correção foi de COMPORTAMENTO da tela: antes,
  `detalhamentoPorVertical` em `GraficosAvaliacao.tsx` só criava um card pra vertical que já tinha
  pelo menos 1 nota — agora a lista de verticais vem de `VERTICAIS_CTZ` inteiro (ou só a que estiver
  selecionada no filtro de vertical do gráfico), então TODO vertical sempre tem um card, e quem
  ainda não tem ninguém avaliado (caso do "Líderes" agora) mostra "Ainda sem ninguém avaliado nesse
  vertical neste ciclo" em vez de simplesmente não aparecer — mesma lógica pros outros 2 gráficos
  da aba não mudou, só essa seção de detalhamento. `npm run type-check` limpo.
- **Revertido logo em seguida** — o Igor repensou: "essa visualização é referente a verticais e não
  há vertical Líder". Correto — "Líderes" nunca foi uma área/vertical real da empresa como
  Loteamentos ou CSC/Financeiro, foi uma sugestão MINHA de rascunho (pedido 21/09, quando perguntei
  quais critérios usar e o Igor aceitou a sugestão genérica em vez de ditar a régua oficial — ver
  entrada acima) pra preencher o espaço que sobrou depois de unir Secretária Executiva em CSC/
  Financeiro. Revertidos os 3 pontos relacionados a "Líderes" especificamente (mantido tudo o resto
  da sessão, inclusive o merge Secretária→CSC/Financeiro, que é decisão diferente e válida):
  1. Entrada `lideres` removida de `VERTICAIS_CTZ` (`ModalAvaliacao.tsx`) — CSC/Financeiro continua
     com os 6 critérios unidos (isso NÃO foi revertido).
  2. `ModalMontarAvaliacoes.tsx` — sugestão automática de vertical por liderança no organograma
     (commit `705dc6a`) revertida, voltou a usar só `verticalDoFuncionario` (por setor), igual
     antes.
  3. `GraficosAvaliacao.tsx` — "mostrar todo vertical sempre" (commit `c0a9f2b`) revertido, o card
     "Maior e menor nota por vertical" volta a só listar vertical que já tem pelo menos 1 nota
     preenchida (comportamento original, de quando essa seção nasceu em 21/09).
  - Nenhuma migration nova precisou — ninguém nunca chegou a ter `avaliacoes.vertical = 'lideres'`
    de verdade (confirmado via SQL direto antes de sugerir a mudança), então não existe dado real
    pra limpar no banco, só código de UI/sugestão que nunca foi usado. `npm run type-check` limpo.
- **"Erro Gemini: 503" de novo no Autoconhecimento**, mesmo depois do retry adicionado mais cedo
  na sessão (`src/lib/gemini.ts`, 2 tentativas extras, ~2s de espera total) — a sobrecarga do lado
  do Google às vezes dura mais que essa janela curta. Reforçado: `esperasMs` subiu pra 3 tentativas
  extras (500ms/1500ms/3000ms, ~7s de espera total) e as 6 rotas que chamam `chamarGemini`
  ganharam `export const maxDuration = 30` (sem isso, o timeout padrão da função na Vercel podia
  cortar o processo no meio do retry, antes mesmo do Gemini conseguir responder — não achei
  `vercel.json` nem `maxDuration` nenhum configurado antes, cada rota rodava no limite padrão da
  plataforma). Ainda é um problema do lado do Google (não dá pra eliminar 100%, só reduzir a
  chance), então pode voltar a acontecer em picos de sobrecarga maiores — se persistir, o próximo
  passo seria um modelo de fallback (e.g. tentar outro Gemini se `gemini-3.6-flash` continuar
  saturado), mas isso exige confirmar antes qual modelo alternativo está disponível pra esta chave
  de API. `npm run type-check` limpo.
- **"Erro ao consultar o assistente." genérico**, ainda no mesmo dia — mensagem diferente da
  anterior ("Erro Gemini: 503"), sintoma de outra coisa: esse texto só aparece no front-end
  (`autoconhecimento/page.tsx`) quando o `fetch` responde algo que NÃO é JSON válido (`res.json()`
  falha e cai no fallback), o que só acontece se a função da API travar de um jeito que nem chega a
  devolver o `NextResponse.json({ error: ... })` do próprio `catch` — ou seja, o processo morreu no
  meio, não é mais um erro "normal" tratado pelo código. Causa mais provável: `fetch` não tem
  timeout nenhum por padrão — se o Gemini ficar lento/travado (em vez de devolver um 503 rápido, o
  caso que o retry já cobria), a PRIMEIRA tentativa sozinha podia ficar pendurada até o
  `maxDuration` matar a função no meio, sem nunca chegar a tentar de novo. Corrigido em duas partes
  em `src/lib/gemini.ts`: (1) cada tentativa individual ganhou um timeout de 10s via
  `AbortController` — se estourar, é tratado como transitório igual 503/429 (retry normal, não
  quebra a função); (2) `maxDuration` das 6 rotas subiu de 30 pra 60 (teto do plano Hobby da Vercel
  sem Fluid Compute — pesquisado antes de mudar, não é um chute), porque o pior caso agora é
  ~45s (4 tentativas de até 10s + ~5s de espera entre elas) — 30 não seria suficiente com o timeout
  novo. `npm run type-check` limpo.

### 2026-09-16
- Continuação direta do redesenho de 15/09 (que ainda estava só local, sem push, aguardando
  aprovação visual). Pedido do Igor: esquecer o caminho do token-swap glassmorphism e seguir, como
  modelo, um print salvo em `Adições futuras/sharepoint-intranet-layout-6-template.webp` (template
  de intranet SharePoint — hero escuro com atalhos em ícone, cards de notícia, colunas de
  documentos/links). Confirmado com o Igor via `AskUserQuestion` antes de mexer: (1) a nova direção
  **substitui** a tentativa de 15/09 inteira, não é só inspiração pontual; (2) manter as mudanças de
  15/09 no working tree por enquanto (não descartar ainda); (3) seguir só a **estrutura/composição**
  do template, cor por minha conta.
- Primeira tentativa (só a página Início: linha de atalhos em ícone dentro do hero + título grande
  com palavra-chave colorida) foi rejeitada — "ainda ficou muito do mesmo, não é só borda arredondada
  e cor, quero uma reestruturação completa". Pedido explícito também: tirar o verde da paleta,
  **voltar pro azul** ("o azul que funcionava bem", referência à cor de antes do redesenho de 15/09).
- Pra não gastar mais rodadas de código sem feedback visual (sem Chrome conectado nesta máquina, ver
  [[iteracao-visual-sem-navegador]]), montei um mockup estático em HTML e publiquei como Artifact
  ("Central Begoal") — layout novo de verdade: sidebar vertical vira **topbar horizontal** com
  navegação agrupada (Central / Estratégia / Pessoas / Sinais Vitais / Recursos), hero vira "estado
  da empresa" (saudação + KPIs), e a navegação principal passa a ser uma **grade de módulos** na
  própria Home, cada tile já com um número real do módulo (não só ícone bonito). Tipografia trocada
  pra Sora (títulos) + IBM Plex Sans (texto) + IBM Plex Mono (números). Ajustado uma vez pra ocupar
  a tela inteira (empresa fictícia "Vórtice Engenharia", dado de exemplo, deixado claro no próprio
  mockup). Aprovado pelo Igor nessa segunda versão — só então parti pra aplicar no código de
  verdade — validando o visual antes de mexer em 30+ arquivos, exatamente o passo que faltou na
  primeira tentativa rejeitada.
- Pedido do Igor ao aprovar: manter um backup do que existia antes, por precaução. Como o
  redesenho de 15/09 nunca tinha sido commitado (51 arquivos soltos no working tree o tempo todo),
  criei a branch `backup/redesign-glassmorphism-2026-09-16` (commit `6272cc5`, só local — não
  enviada ao GitHub, é só uma rede de segurança) com aquele snapshot via `git add -u` (nunca
  `git add -A`, pra não versionar os arquivos de `Adições futuras/` que ficam fora do Git de
  propósito). Depois, `git checkout master` — como o working tree já estava idêntico ao commit
  recém-criado na branch de backup, o checkout devolveu `master` pro último estado realmente
  commitado (bem antes do redesenho de 15/09), uma base limpa pra construir a reestruturação nova
  sem herdar meio-termo do token-swap abandonado.
- **Achado nessa hora**: o próprio `CLAUDE.md` tinha ~44 linhas de Log de Sessões (entradas de
  02/09 a 15/09 inteiras) que **nunca tinham sido commitadas** — viviam só como edição local no
  working tree há semanas, e o `git checkout master` as reverteu de vez junto com o resto. Percebido
  a tempo (a branch de backup guardou uma cópia) e restaurado a partir de lá antes de escrever esta
  entrada. **Vale de lição**: o header deste arquivo promete "acrescento uma entrada... sem apagar
  as anteriores", mas isso só é verdade se o arquivo for commitado de vez em quando — daqui pra
  frente, incluir `CLAUDE.md` no commit de toda sessão que editar este log, não deixar acumular como
  edição solta.
- Reestruturação de verdade aplicada por cima da base limpa:
  - `src/components/layout/Sidebar.tsx` **deletado**; `src/components/layout/Topbar.tsx` novo —
    barra horizontal fixa no topo com navegação agrupada em dropdowns (Radix `DropdownMenu`, já era
    dependência do projeto mas nunca tinha sido usado — não existe `src/components/ui/`, então os
    dropdowns foram estilizados na mão dentro do próprio componente). Menu de usuário (Perfil/Mudar
    Empresa/Sair) virou dropdown no avatar, mesma lógica de permissão de sempre
    (`permission_level`, `isEmpresaCTZ`, `souPilotoAutoconhecimento`).
  - `src/app/(dashboard)/layout.tsx` simplificado — sem o `p-4 gap-4` que fazia a sidebar "flutuar"
    como cartão; virou `min-h-screen` normal com scroll de página inteira (não mais
    `h-screen overflow-hidden` + região de scroll isolada). Isso quebrou dois lugares que dependiam
    da altura fixa do shell antigo, corrigidos: `useTourStore.ts` (passo do tour apontava pra
    `tour-sidebar`, que não existe mais — renomeado pra `tour-nav`, texto ajustado pra falar da
    barra do topo) e o board Kanban de `taticas/page.tsx` (usava `h-[calc(100vh-48px)]` fixo pra
    cada coluna rolar por conta própria — trocado por `max-h-[65vh] overflow-y-auto` por coluna,
    não depende mais da altura do shell).
  - `globals.css`/`tailwind.config.ts`: paleta nova em azul-índigo (`--primary: 231 76% 55%`),
    radius maior, sombras com tom frio; fontes trocadas de Inter pra **Sora** (títulos, var
    `--font-display`) + **IBM Plex Sans** (texto, `--font-body`) + **IBM Plex Mono** (números,
    `--font-mono`) via `next/font/google` em `src/app/layout.tsx` — self-hosted, sem `<link>`
    externo. Classes `glass-panel`/`glass-chrome`/etc. mantidas de propósito (usadas em ~30
    arquivos) só com os tokens por trás trocados, pra não precisar editar página por página.
  - `inicio/page.tsx` virou o "lançador de módulos": hero com 3 KPIs reais (KRs ativos, progresso
    médio, alertas de Sinais Vitais — calculado com a mesma fórmula de progresso dos KRs, conta
    quantos sinais vitais estão abaixo de 40%) + grade de até 9 módulos (Objetivos/OKRs/
    Táticas/Sinais Vitais/Funcionários sempre; Avaliação/Autoconhecimento só CTZ; Cargos só CTZ +
    piloto/admin), cada tile com número real buscado no Supabase (contagem de táticas não
    concluídas, funcionários, documentos da biblioteca, nome do ciclo de avaliação ativo). Mantidas
    intactas todas as funcionalidades que já existiam ali (ChipList de Mercado, Nota Fixada com
    comentários, CRUD de Valores da empresa) — só a composição visual mudou.
- `npm run type-check` limpo em cada etapa. Commit enviado a `master` (deploy no ar) — pedido
  explícito do Igor pra fazer o push depois de aprovar o resultado. Sem migration nesta sessão (foi
  tudo front-end/design).
- **Pendências que ficam pro Igor decidir depois, sem pressa** (ele disse que ajustes futuros ficam
  pra uma próxima sessão): a Topbar/tokens novos valem pra todo o app automaticamente, mas nenhuma
  outra página (Objetivos, OKR, Funcionários, Avaliação etc.) teve a composição interna redesenhada
  além da Início — elas herdam a cor/fonte/chrome novos, mas o miolo de cada uma ainda é o layout
  antigo (cards simples). Se quiser estender o padrão de "cards com hero/KPI" pras outras páginas,
  é trabalho novo, não uma correção.
- **Pedido de verificação pós-push** ("faça uma última verificação pra ver se houve alguma
  inconsistência"): achadas e corrigidas 2 coisas reais, ambas já em produção quando encontradas
  (commit `0a476e9`, enviado a `master` na sequência):
  1. O card "Avaliação" da Início escolhia o ciclo a mostrar com
     `ciclos.find(c => c.status !== 'finalizada')` — só que `ciclos_avaliacao.status` nunca tem
     valor `'finalizada'` (os únicos valores reais são `rascunho`/`ativo`/`encerrado`, confirmado
     em `avaliacao/page.tsx`), então a condição era sempre verdadeira e o `find()` não filtrava
     nada — sempre pegava o primeiro da lista (mais recente por ano/período) mesmo se já estivesse
     `encerrado` ou ainda em `rascunho`. Corrigido pra `c.status === 'ativo'`.
  2. A `Topbar` nova não tinha o mesmo `max-w-[1440px]` do `<main>` — em tela larga ela ficava mais
     esticada que o conteúdo abaixo, um descompasso visual visível em monitor grande. Alinhada pra
     usar exatamente a mesma estrutura de largura (`max-w-[1440px] mx-auto` no `<header>`, padding
     por fora, igual ao `<main>`) — testado o cálculo manualmente pra garantir alinhamento em pixel.
  - De brinde, removido `.glass-chrome`/`--chrome-accent` (só existiam pra sidebar antiga, sem uso
    depois dela ser deletada em 16/09).
- **Pedido novo, mesma sessão**: criar um login de verdade pra Letícia Leite (autora do "Programa
  Foco" da BeHive, fonte do módulo de Autoconhecimento/Eneagrama), e-mail
  `leticialeite2003@yahoo.com.br`, com "mesmo acesso que eu [Igor] e a Priscila".
  - Achado antes de implementar: já existia uma migration pendente pra isso de 14/09
    (`PENDENTE_20260914020000_leticia_acesso_igual_igor_priscila.sql`), nunca aplicada — mas com
    e-mail diferente (`leticia.leite@behive.net.br`, que **nunca chegou a existir** em
    `auth.users`, confirmado por SQL direto) e escopo mais estreito (só administrador na CTZ).
    Reescrita a migration com o e-mail novo e o escopo confirmado com o Igor via
    `AskUserQuestion`: administrador de verdade em **todas as 11 empresas da plataforma** (não só
    CTZ) — igual Igor/Priscila, que são admin em toda empresa via `user_company_roles` (o time
    BeHive administra a plataforma inteira) — mais os privilégios especiais que só existem na CTZ
    (calibragem do ciclo inteiro, visão de admin do Eneagrama).
  - Diferente das migrations anteriores dessa família (que assumiam login já criado manualmente
    pelo Igor no painel do Supabase), esta migration cria o login sozinha (insert em
    `auth.users`/`auth.identities`, senha aleatória descartada — ninguém fica sabendo, ela define a
    própria pelo "Esqueci minha senha" da tela de login) porque não temos a service role key nesta
    máquina (só a anon key em `.env.local`) pra criar o usuário por código/API admin. Não tenho
    certeza de que criar `auth.users` via SQL direto (em vez da API admin do GoTrue) é 100%
    equivalente em toda instalação do Supabase — funcionou no formato padrão documentado
    publicamente e o trigger `on_auth_user_created`/`handle_new_user()` já existente criou a linha
    de `profiles` sozinho, mas vale o Igor confirmar que o login funciona (tela de login +
    "Esqueci minha senha") depois de rodar, antes de considerar encerrado.
  - `user_company_roles` ganhou um `cross join` com `public.clients` em vez de listar client_id um
    a um (padrão diferente das migrations de calibragem restrita, que sempre usaram UUID literal)
    — cobre empresa nova que apareça depois sem precisar de outra migration, já que o pedido era
    "toda empresa", não uma lista fixa.
  - Front-end: as 3 referências hardcoded ao e-mail antigo dela (`EMAILS_PILOTO_AUTOCONHECIMENTO`
    em `utils.ts`, e as 2 listas de `souGestorDaCalibragem`/`souVejoNineBox` em
    `avaliacao/page.tsx`) trocadas pro e-mail novo — ela já estava nessas 3 listas desde 14/09
    (parte do trabalho da sessão anterior, não desta), só o e-mail estava errado/nunca-existente.
  - `npm run type-check` passou limpo. Migration rodada pelo Igor no SQL Editor em 17/09 —
    **confirmado via SQL direto**: login criado e confirmado, `funcionarios` (CTZ, "Consultora
    Externa (BeHive)"), `user_company_roles` administrador nas 11 empresas com `is_calibrador=true`
    só na CTZ (igual Priscila), `profiles` com e-mail/nome, e as duas funções
    (`pode_ver_lado_calibragem`/`pode_ver_todos_eneagrama_ctz`) já com o UUID dela. Criar
    `auth.users`/`auth.identities` via SQL direto (em vez da API admin do GoTrue) funcionou de
    primeira — o trigger `on_auth_user_created` criou `profiles` sozinho. **Falta só**: avisar a
    Letícia pra ir em `/reset-senha` com `leticialeite2003@yahoo.com.br` e definir a própria senha
    (a que a migration gerou é aleatória e descartada, ninguém sabe qual é).

### 2026-09-15
- Pedido: redesenho visual completo do sistema ("de ponta a ponta"), só aparência — nenhuma
  funcionalidade/regra de negócio poderia mudar. Direção pedida: mais moderno, com profundidade,
  **glassmorphism**, mas sóbrio/corporativo (sem neon/futurista). Confirmado com o usuário via
  `AskUserQuestion`: sidebar escura (navy) vira clara; cor primária ficou a meu critério.
- Levantamento prévio: stack é Tailwind 3.4 + variáveis CSS (`globals.css`/`tailwind.config.ts`),
  sem biblioteca de componentes (`src/components/ui/` não existe) — cada página escreve suas
  próprias classes, mas a maioria já usava os tokens (`bg-card`, `border-border` etc.), o que
  permitiu mudar boa parte do app só trocando os tokens centrais. Não existe dark mode de verdade
  em uso (sem `next-themes`/toggle) — o bloco `.dark` do `globals.css` é código morto, ignorado.
- Fundação (poucos arquivos, efeito cascata): `tailwind.config.ts` ganhou o padrão
  `hsl(var(--x) / <alpha-value>)` nos tokens de cor (necessário pra opacidade tipo `bg-card/70`
  funcionar) + `boxShadow.glass`/`glass-lg`; `globals.css` ganhou paleta nova (fundo neutro frio,
  `--primary` indigo-azul profundo `234 62% 47%`, `--sidebar` clara), um gradiente ambiente sutil
  fixo no `body`, e 3 classes utilitárias novas (`.glass-panel`, `.glass-panel-solid` pra conteúdo
  denso, `.glass-elevated` pra modais/popovers). Fonte trocada de Inter pra Plus Jakarta Sans
  (`layout.tsx`). `Sidebar.tsx` reconstruída pra vidro claro (mesma lógica de visibilidade de
  menu, só CSS mudou). Páginas de auth (login/reset-senha/seleção de empresa) redesenhadas com
  cartão de vidro sobre o fundo ambiente.
- Varredura do resto do app (19 páginas + ~30 componentes/modais) tentada via 4 sub-agentes em
  paralelo (Agent tool, `subagent_type: "fork"`) — achado de plataforma: a primeira chamada de
  fork nesta sessão "virou" a própria sessão executando aquele lote (não rodou em paralelo
  visível), e as 3 chamadas seguintes retornaram erro "Fork is not available inside a forked
  worker". Na prática, porém, os 4 lotes rodaram mesmo assim em background com sucesso (`git
  status` no fim mostrou quase todo o app já modificado) — comportamento inconsistente do
  mecanismo de fork neste ambiente, vale desconfiar do texto de erro e checar o estado real dos
  arquivos antes de refazer trabalho.
- Pente-fino final (grep em todo `src/` por `bg-black/50`, `bg-card border border-border`,
  `border-gray-*`, `shadow-xl`, hex antigo da marca `#1e3a5f` etc.) achou só 2 modais esquecidos
  em `objetivo/page.tsx` (Criar/Editar Objetivo, ainda no padrão antigo) — corrigidos à mão. Resto
  do app (Sidebar, todas as páginas do dashboard, todos os modais de OKR/Sinais Vitais/Avaliação,
  `TourOverlay`, `not-found.tsx`) confirmado convertido. Cores semânticas (status de
  funcionário/KR, área de cargo, nine-box, etc.) foram deliberadamente preservadas — só o
  "acabamento" de superfície (fundo/borda/sombra dos cards/painéis/modais) mudou.
- `npm run type-check` limpo do início ao fim (rodado a cada lote). `npm run dev` sobe sem erro
  (porta 3001, 3000 já em uso) e `/login`, `/reset-senha`, `/selecao-empresa` respondem 200 com o
  HTML novo. **Não consegui verificar visualmente no navegador nesta sessão** (extensão
  claude-in-chrome não configurada) — pendente o Igor conferir com os próprios olhos antes do
  push, principalmente contraste de texto sobre vidro e as páginas autenticadas (não testáveis
  via curl sem sessão).
- **Nada foi commitado nem enviado a `master`** — 50 arquivos modificados no working tree,
  aguardando o Igor revisar visualmente e aprovar (mudança grande demais, e `master` faz deploy
  automático em produção).

### 2026-09-10
- Pedido: Finato relatou não conseguir avaliar a liderada (Carolina Zanette) — ao preencher a
  nota de gestor, o sistema exigia calibragem no mesmo clique. Era o MESMO tipo de bug corrigido
  em 09/09 (achado com o Finato naquela sessão), só que do lado da nota de gestor em vez da
  autoavaliação: o fix de 09/09 (`validarCampos()` só exige calibragem quando a nota base da
  mesma seção "já está completa") olhava pro estado AO VIVO do formulário
  (`scoresC`/`scoresT`), não pro que já estava salvo no banco — então preencher a nota base pela
  PRIMEIRA vez e clicar Salvar fazia ela "virar completa" no mesmo instante em que a calibragem
  passava a ser exigida junto, sem nunca dar pra separar as duas ações. Confirmado via SQL
  direto: avaliação da Carolina em status `calibragem`, 0 pilares de gestor preenchidos — mesmo
  padrão do incidente de 09/09.
- Corrigido guardando `scoresCOriginal`/`scoresTOriginal` (snapshot do banco no momento em que o
  `ModalAvaliacao` abre, nunca tocado pelos inputs) e usando esse snapshot — não mais o estado ao
  vivo — pra decidir se a nota base já estava completa ANTES desta edição. Agora dá pra avaliar
  como líder e salvar sem calibragem junto; a calibragem só passa a ser exigida num salvamento
  posterior, depois que a nota base já estiver de fato salva no banco. Só front-end, sem
  migration. `npm run type-check` passou limpo. Commit `1c5efec`, enviado a `master` (deploy no
  ar, confirmado pelo usuário).
- Dois pedidos de design/UX, mesma sessão (commit ainda não enviado a `master` no momento deste
  registro — ver Pendências):
  1. **Redesenho da aba "Cargos"** (pedido "melhorar o design pra ficar mais bonito") — trocou a
     lista em accordion de largura cheia por um grid de 2 colunas com cor por área (7 áreas da
     planilha, cada uma com uma cor fixa só decorativa — não representa hierarquia nenhuma),
     sumário em destaque (callout), autonomia/experiência/formação como mini-tiles com ícone em
     vez de texto corrido, e competências técnicas/comportamentais como chips em vez de bullets
     soltos (fazia sentido dado que cada item é curto — "Excel avançado", "Organização" — conferido
     via SQL direto antes de decidir). Nenhuma mudança de acesso/dado, só apresentação.
  2. **Descrição do cargo na tela de Funcionários** — clicar no cargo exibido embaixo do nome (o
     mesmo `f.cargo`, texto livre, que já aparecia ali) expande o sumário do cargo abaixo do nome.
     Reaproveita o vínculo pessoa↔cargo já curado à mão em `funcionarios_cargo_perfil`
     (01/09/2026) via `getTodosCargosPerfil` — não tenta casar o texto livre de `funcionarios.cargo`
     com `cargo_base` na hora (conferido por SQL direto: só 3 de 26 batem por igualdade de texto,
     ex. "Especialista em Agrimensura" vs "Especialista de Agrimensura" na planilha — preposição
     diferente já quebra). Cargo sem vínculo mapeado continua como texto simples, sem indicação de
     que poderia ser clicável.
  3. Achado no meio do caminho: a RLS de `funcionarios_cargo_perfil` (migration
     `PENDENTE_20260901000000`) só liberava SELECT pro dono da própria linha ou pro piloto do
     Autoconhecimento (`pode_ver_todos_eneagrama_ctz()`, só Igor/Priscila) — qualquer outro
     administrador real da CTZ (ex. Filippe Réus) abriria a tela de Funcionários sem conseguir ler
     a descrição de cargo de mais ninguém. Migration nova
     `PENDENTE_20260910000000_funcionarios_cargo_perfil_acesso_admin.sql` (**ainda não rodada no
     Supabase, avisar o Igor**) soma o mesmo OR de "administrador real escopado por `client_id`"
     já usado em `PENDENTE_20260909010000` pra `cargos_perfil` — mesmo padrão, tabela irmã.
     Como `pode_ver_todos_eneagrama_ctz()` não depende de linha nenhuma (é só checar
     `auth.uid()` contra 2 UUIDs fixos), o Igor já consegue ver a descrição de cargo de qualquer
     funcionário HOJE, sem esperar essa migration — ela só é necessária pra outros administradores
     da CTZ além de Igor/Priscila. `npm run type-check` passou limpo.
- Migration `PENDENTE_20260910000000` rodada pelo Igor no SQL Editor — na primeira tentativa deu
  `40P01 deadlock detected` (colisão de lock com outra sessão ativa no banco, provavelmente o
  próprio app em produção lendo `funcionarios_cargo_perfil`/`user_company_roles` no mesmo
  instante — o Postgres aborta uma das duas transações automaticamente, não deixa nada aplicado
  pela metade). Segunda tentativa (retry simples, sem mudar nada) passou. Commit `9887452`,
  enviado a `master` (deploy no ar).
- **Nova demanda, mesma sessão**: "subir a metodologia" de `Adições futuras/Abordagem .pdf`
  (pitch da BeHive sobre liderar a partir do Eneagrama) em 3 mapas dentro do Autoconhecimento —
  Autoliderança (todos), Liderando o time (só líderes), Relacionando com o time (todos). Antes de
  implementar, confirmado com o Igor via `AskUserQuestion`: (1) "líder" pro Mapa 2 = organograma
  (`funcionarios.gestor_id`, tem liderado direto), não a marcação manual `lider_avaliacao`
  (pensada pra Avaliação de Pares); (2) quem ainda não tem tipo mapeado continua vendo o menu
  "Autoconhecimento" normalmente, com aviso de "ainda não mapeado", em vez de sumir o módulo
  inteiro (diferente do padrão de "esconder que existe" usado em calibragem/cargos — aqui não é
  dado sensível, só falta de cadastro).
  - Isso GRADUA o protótipo (restrito a Igor/Priscila desde 31/08) pra CTZ inteira nos Mapas 1 e
    3, e pra quem lidera gente no Mapa 2 — decisão grande o suficiente pra valer o registro aqui:
    `EMAILS_PILOTO_AUTOCONHECIMENTO` (`lib/utils.ts`) continua existindo, mas seu escopo encolheu
    pra só controlar a visão de admin do protótipo DENTRO da página ("Perfis da equipe" com o tipo
    de todo mundo, cruzamento cargo x Eneagrama) — não mais o acesso ao módulo inteiro (menu no
    `Sidebar.tsx` e as duas rotas de API que geravam os chats de Mapa 1/3 tiveram o gate de piloto
    removido).
  - Mapas 1 e 3 já existiam de fato (card do tipo + chat "Pergunte ao assistente" = Mapa 1; chat
    "Como abordar um colega", de 09/09 = Mapa 3) — só reenquadrados com o vocabulário do PDF.
    Mapa 2 é novo: rota `/api/liderar-liderado` (mesma mecânica de "abordar colega", mas o alvo
    PRECISA ser liderado direto de quem pergunta — checado no servidor, não só confiando no
    dropdown) com prompt voltado a delegação/desenvolvimento/decisão em vez de relação entre pares.
  - Achado ao abrir pra todo mundo: as duas rotas de chat liam o tipo da OUTRA pessoa direto pelo
    cliente Supabase da sessão, o que só funcionava porque a RLS de `funcionarios_eneagrama`
    liberava qualquer linha pra quem tinha `pode_ver_todos_eneagrama_ctz()` (só Igor/Priscila) —
    o próprio comentário da rota de 09/09 já previa isso ("se abrir pra quem não é piloto, precisa
    virar função security-definer"). Migration nova
    `PENDENTE_20260910010000_autoconhecimento_3_mapas.sql` (**ainda não rodada no Supabase, avisar
    o Igor**) cria: `sou_lider_de_alguem()` (gate do Mapa 2), `listar_colegas_com_perfil_mapeado()`
    / `listar_meus_liderados_com_perfil_mapeado()` (só nome, nunca tipo — alimentam os dropdowns
    dos Mapas 3/2), e `obter_tipo_colega_mesma_empresa()` / `obter_tipo_liderado()` (as ÚNICAS que
    devolvem tipo de outra pessoa — chamadas só dentro das rotas de API, nunca do navegador; a
    segunda confere organograma de verdade via `e_gestor_do_funcionario()`, não confia no
    `funcionarioAlvoId` vindo do cliente). RLS de `funcionarios_eneagrama`/`funcionarios_cargo_perfil`
    em si não mudou nada — só somaram funções por cima.
  - `npm run type-check` passou limpo. Commitado localmente (ver `git log` — mensagem começa com
    "feat: 3 mapas do Autoconhecimento"), **ainda não enviado a `master`**.
  - **Pendente antes do próximo push com este commit**: rodar
    `PENDENTE_20260910010000_autoconhecimento_3_mapas.sql` no SQL Editor do Supabase.
- Pergunta do Igor, mesma sessão, logo depois de eu descrever o plano acima: "o quão perigoso pode
  ser liberar a CTZ pra ver essa adição?". Dei o risco de verdade (não é bug de código): o filtro
  que bloqueia "Eneagrama"/"tipo N" na resposta da IA é rede de segurança, não garantia — um modelo
  pode descrever alguém de um jeito reconhecível sem usar essas palavras; e é a primeira vez que o
  sistema usa o perfil psicológico de alguém pra aconselhar OUTRA pessoa sobre como lidar com ela,
  sem a pessoa saber — isso nunca foi testado com uso real além de Igor/Priscila. Recomendei abrir
  só o Mapa 1 (só fala do próprio tipo de quem pergunta, risco ~zero) e manter 2/3 restritos.
  Confirmado com o Igor via `AskUserQuestion` — foi a opção escolhida.
  - Implementado: `/api/como-abordar-colega` (Mapa 3) e a rota nova `/api/liderar-liderado`
    (Mapa 2) voltaram a ter o gate `souPilotoAutoconhecimento` (o Mapa 2 nunca tinha tido esse
    gate, já nasceu sem ele por engano no primeiro commit desta sessão). `/api/assistente-eneagrama`
    (Mapa 1) continua SEM esse gate — é o único que só fala do tipo de quem pergunta. Na página, as
    seções dos Mapas 2 e 3 (e a busca de colegas/liderados que as alimenta) ficaram atrás de
    `souAdminPiloto` também — antes disso `souLider` sozinho já bastava pra mostrar o Mapa 2 pra
    qualquer líder da CTZ, o que teria contrariado a decisão. RLS/funções do banco
    (`PENDENTE_20260910010000`) não mudaram — a restrição é só de acesso à funcionalidade (rotas +
    página), a proteção técnica de nunca vazar o tipo pro navegador continua valendo pros 3 mapas
    igual.
  - `npm run type-check` passou limpo. Commitado localmente junto do commit anterior desta mesma
    entrada (ver `git log`) — **ainda não enviado a `master`**, mesma pendência de rodar a migration
    antes.
- Migration `PENDENTE_20260910010000` rodada pelo Igor, confirmada — commit `f95fdc0` enviado a
  `master` (deploy no ar).
- **Pedido novo, mesma sessão**: 3 caixas de texto na aba "Perfil" — "Sobre mim" / "Minhas
  Habilidades" / "Meus sonhos" — que cada usuário preenche sobre si mesmo, salvas e **públicas pra
  todo mundo da empresa ler** (oposto do padrão "cada um só vê o seu" do Eneagrama/avaliação — aqui
  é conteúdo que a própria pessoa escreve de propósito pra ser lido). Sem trava de CTZ — `Perfil` e
  `Funcionários` são páginas genéricas de toda empresa da plataforma, o pedido não mencionou
  restringir a nenhuma.
  - **Achado importante antes de implementar**: a policy de ESCRITA de `public.funcionarios`
    ("Unified Write Policy for Funcionarios", pré-existente, fora do que os `supabase/migrations/`
    documentam) exige `permission_level = 'administrador'` — ou seja, um funcionário comum **não
    consegue hoje** atualizar nem a PRÓPRIA linha ali. Isso já era um bug preexistente e silencioso
    no "Salvar alterações" (Nome completo) da aba Perfil pra qualquer usuário não-admin (a
    atualização não dá erro, só não muda nada — RLS bloqueia 0 linhas, sem exception) — não mexi
    nisso (fora do escopo pedido), só evitei repetir o mesmo problema nos campos novos.
  - Implementado numa tabela nova, `funcionarios_perfil_publico` (migration
    `PENDENTE_20260910020000_perfil_publico.sql`, **ainda não rodada no Supabase, avisar o Igor**):
    RLS de leitura libera qualquer um da MESMA empresa (`client_id` via `user_company_roles`,
    mesmo padrão de leitura já usado em `funcionarios`); RLS de escrita libera só a PRÓPRIA linha
    (`user_id = auth.uid()`, sem depender de ser administrador) — é o motivo de ser tabela separada
    em vez de colunas em `funcionarios`. Query nova `src/lib/queries/perfilPublico.ts`
    (`getMeuPerfilPublico`, `upsertMeuPerfilPublico`, `getPerfisPublicosPorEmpresa`).
  - `perfil/page.tsx`: card novo "Perfil público" com as 3 caixas (textarea, limite de 1000
    caracteres cada, contador visível), salvamento próprio (upsert), separado do card "Dados
    pessoais" de sempre.
  - `funcionarios/page.tsx`: consolidei a expansão por linha — antes (09/09) só o texto do cargo
    era clicável e expandia a descrição do cargo; agora um botão "Perfil" dedicado em cada card
    expande TUDO junto (descrição do cargo, quando mapeada, + Sobre mim/Habilidades/Sonhos), só
    mostrando as seções que têm conteúdo (sem "ainda não preenchido" repetido pra cada campo vazio).
  - `npm run type-check` passou limpo. Commit `cd2b662`, enviado a `master` (deploy no ar,
    migration `PENDENTE_20260910020000` rodada e confirmada pelo Igor).
- Pedido do Igor, mesma sessão: corrigir o bug preexistente achado acima (funcionário comum não
  conseguia salvar o próprio nome na aba Perfil). Em vez de mexer na policy de escrita de
  `funcionarios` (arriscado — abrir "qualquer um edita a própria linha" deixaria também
  status/cargo/gestor_id editáveis pela própria pessoa, não só o nome), criada função
  security-definer estreita `atualizar_meu_nome(p_full_name)` (migration
  `PENDENTE_20260910030000_funcionarios_atualizar_meu_nome.sql`, **ainda não rodada no Supabase,
  avisar o Igor**) que só atualiza `full_name` da PRÓPRIA linha, sem depender de ser administrador
  — mesmo raciocínio de tabela/função separada já usado em `funcionarios_perfil_publico`.
  `perfil/page.tsx` trocou o `update` direto na tabela por `supabase.rpc('atualizar_meu_nome', ...)`.
  `npm run type-check` passou limpo.

### 2026-09-09
- Corrigido bug relatado pelo usuário: Finato não conseguia preencher a própria autoavaliação
  nem a avaliação de gestor da liderada (Carolina Zanette) sem também preencher a calibragem no
  mesmo clique. Diagnosticado via SQL direto: as duas avaliações já estavam em status
  `calibragem` (efeito do "Iniciar Calibragem" em lote, 27/08) com a nota base (auto/gestor)
  ainda em 0/4, e `validarCampos()` em `ModalAvaliacao.tsx` exigia calibragem no MESMO clique
  que a nota base sempre que `podeCalibrar && emEtapaCalibragem`, mesmo quando a nota nunca
  tinha sido salva. Achado um segundo bug junto: `souCalibradorRestrito` era um flag da sessão
  inteira (só e-mail), não escopado por avaliação — abrir a PRÓPRIA autoavaliação fazia o modal
  achar que dava pra calibrar a si mesmo. Duas correções, só front-end, sem mudança de
  banco/RLS: (1) `souCalibradorRestritoDestaAvaliacao` em `avaliacao/page.tsx`, escopado pra não
  valer na avaliação do próprio calibrador; (2) `validarCampos()` só exige calibragem numa seção
  quando a nota base dessa MESMA seção já está completa. `npm run type-check` passou limpo.
  Commit `4997d56`, enviado a `master` (deploy no ar).
- Três pedidos novos, implementados na mesma sessão (commit `a2bc551`, **ainda não enviado a
  `master`** — faltam 2 migrations pro Igor rodar antes, ver abaixo):
  1. **Selo "Concluída"** nas avaliações — ver item no estado atual do módulo acima.
  2. **Aba "Cargos"** nova no menu (antes de "Avaliação") — catálogo somente-leitura dos 31
     perfis de cargo já importados em 01/09 (`cargos_perfil`), agrupados por área/cargo com
     níveis em abas, busca e filtro por área. Só CTZ, só administrador de verdade ou piloto do
     Autoconhecimento (confirmado com o usuário via `AskUserQuestion`) — a RLS da tabela só
     liberava pra Igor/Priscila antes, ganhou o OR de admin real escopado por `client_id`
     (migration `PENDENTE_20260909010000_cargos_perfil_acesso_admin.sql`). Query nova
     `getCargosPerfil` em `src/lib/queries/cargosPerfil.ts`, página nova
     `src/app/(dashboard)/cargos/page.tsx`.
  3. **"Gerar Análise" do cruzamento cargo x Eneagrama** (já funcional desde 01/09, o pedido era
     dar funcionalidade a esse botão) ganhou uma 4ª seção explícita no prompt sobre as 6
     competências relacionais (comunicação, decisão, relacionamento, feedback, conflito,
     resultados) e como o tipo da pessoa tende a agir em cada uma — mesma rota/mesma chamada ao
     Gemini, sem IA dedicada nova, confirmado com o usuário que essa era a interpretação certa
     do pedido (não um botão novo).
  4. De brinde, resolvida uma pendência de 3 sessões (01, 02 e 08/09): `get_calibragem_pendente`,
     RPC que `src/lib/queries/avaliacao.ts` já chamava desde 28/08 mas cujo `CREATE FUNCTION`
     nunca tinha sido commitado (perdido no incidente da pasta de migrations apagada em 31/08),
     ficando fora de todo commit desde então. Reconstruída a partir do contrato já documentado
     no comentário do lado JS, reaproveitando `avaliacao_completude()` por baixo — agora
     `avaliacao.ts` finalmente entrou inteiro num commit.
  `npm run type-check` passou limpo em cada etapa. **Pendente antes do próximo push**: rodar
  `PENDENTE_20260909000000_avaliacao_completude.sql` e
  `PENDENTE_20260909010000_cargos_perfil_acesso_admin.sql` no SQL Editor do Supabase.

### 2026-09-08
- Pedido: Felipe Bet Ross (Líder da Vertical Concretize, `felipe.ross@projetosconcretize.com.br`,
  `permission_level` não-admin) reportou não conseguir ver a nota de autoavaliação dos próprios
  liderados (Jean Patrick Candia Correa, Laura Tolentino, Luis Henrique Gaseta) pra fazer a
  calibragem. Diagnosticado via SQL direto: não era bug — ele nunca tinha entrado em nenhuma das
  duas listas de calibragem (`souGestorDaCalibragem`, ciclo inteiro, ou `souCalibradorRestrito`,
  Graciela/Felipe Marques), apesar de ter 2 liderados (Jean Patrick e Luis Henrique Gaseta) com
  avaliação já em status `calibragem` no ciclo ativo. Mesmo padrão exato dos pedidos de 02/09.
- Confirmado com o usuário (`AskUserQuestion`) que o escopo é o mesmo da Graciela/Felipe Marques
  (calibrador restrito, só os próprios liderados), não acesso ao ciclo inteiro. Migration
  `PENDENTE_20260908000000_calibragem_felipe_ross_restrito.sql` (**ainda não rodada no Supabase,
  avisar o Igor antes do próximo push**): `e_calibrador_restrito()` ganha o terceiro user_id fixo
  (`9c6dfb0a-c7d5-4a6a-8214-a6f22aea74e8`). Front-end: `souCalibradorRestrito` em
  `avaliacao/page.tsx` ganha o e-mail dele. `npm run type-check` passou limpo. Commit `df52cb9`,
  **ainda não enviado a `master`** — falta o Igor rodar a migration primeiro.
  `src/lib/queries/avaliacao.ts` seguiu de fora do commit (mesma pendência de 01/09 e 02/09, RPC
  `get_calibragem_pendente` ainda não existe no banco — reconfirmado via SQL direto nesta sessão).
- Pedido, mesmo dia, mesmo padrão: Filipe Bossoni Finato (Líder da Vertical Novos Negócios,
  `felipe.finato@ctz.eng.br`) relatou ter feito "as avaliações dos liderados e a calibragem".
  Verificado via SQL direto que o relato não batia: ele fez de verdade 2 avaliações de pares
  (Jean Patrick Candia Correa, Guilherme Costa Manoel — notas reais, `gestor_concluida`), mas a
  própria autoavaliação estava com `nota_auto` nulo em todos os pilares/critérios, e a avaliação
  padrão da única liderada dele no organograma (Carolina Zanette de Castro Schiefler) estava com
  `nota_gestor` nulo — ele nunca preencheu nem a própria auto nem a avaliação de gestor da
  Carolina. O status `calibragem` nas duas linhas é só efeito do "Iniciar Calibragem" em lote
  (move todo mundo, não checa conclusão, mudança de 27/08), não indica trabalho feito. Confirmado
  também que ele não estava em nenhuma das duas listas de calibragem — não tinha como ter
  calibrado nada pela interface.
- Confirmado com o usuário (`AskUserQuestion`) que o pedido de acesso é o mesmo padrão da
  Graciela/Felipe Marques/Felipe Ross (calibrador restrito, só a própria liderada), não acesso ao
  ciclo inteiro. Migration `PENDENTE_20260908010000_calibragem_finato_restrito.sql` (**ainda não
  rodada no Supabase, avisar o Igor antes do próximo push**): `e_calibrador_restrito()` ganha o
  quarto user_id fixo (`09f58ad9-89dc-444e-8448-88554d90f26e`). Front-end: `souCalibradorRestrito`
  em `avaliacao/page.tsx` ganha o e-mail dele. `npm run type-check` passou limpo. Commit `f7b7379`,
  **ainda não enviado a `master`** — falta o Igor rodar as duas migrations pendentes do dia
  (Felipe Ross e Finato) primeiro. `src/lib/queries/avaliacao.ts` seguiu de fora do commit (mesma
  pendência recorrente, RPC `get_calibragem_pendente` ainda não existe no banco).

### 2026-09-02
- Pedido: mais um usuário autorizado a fazer calibragem — Graciela Borges Hoepers, que tem
  liderados (Angelica Scarpari Machado e Fabiana Carolina de Olivera no organograma; só a
  avaliação da Fabiana está no ciclo ativo, já em status `calibragem`). Diferença explícita do
  pedido em relação aos 4 calibradores existentes: ela só pode ver a autoavaliação e calibrar
  os PRÓPRIOS liderados, não o ciclo inteiro.
- Como a lista existente (`pode_ver_lado_calibragem`) é um booleano por ciclo inteiro (sem noção
  de quem lidera quem), não deu pra só adicionar o e-mail dela lá — isso daria acesso a todo
  mundo da CTZ, contrariando o pedido. Implementado mecanismo novo e paralelo:
  - Migration `PENDENTE_20260902000000_calibragem_restrita_graciela.sql` (**rodada pelo Igor,
    confirmada via SQL direto**): função `e_calibrador_restrito(funcionario_id)` — soma uma
    lista fixa de e-mail (só Graciela, `user_id 203e4429-b9c7-451f-bc00-cc42f6e713f4`) com
    `e_gestor_do_funcionario` (mesma checagem de organograma que já rege ela preencher a nota de
    gestor). Somada em `pode_ver_lado_auto` e nas funções que expõem nota/observação de
    calibragem por avaliação (`get_avaliacao_cultural/tecnica`, `get_avaliacoes_por_ciclo`).
    Não mexe no Painel de Calibragem em lote (`get_calibragem_ciclo_cultural/tecnica`) nem na
    lista fixa existente — ambos continuam intocados.
  - Acesso de LINHA (abrir/gravar a avaliação) já existia via `e_gestor_do_funcionario`
    (migration 20260807), não precisou mudar nada ali.
  - Front-end (`avaliacao/page.tsx` + `ModalAvaliacao.tsx`): novo flag `souCalibradorRestrito`
    (só e-mail `graciela.hoepers@ctz.eng.br` na CTZ), somado em `podeCalibrar`/`gestorVeAuto` do
    modal individual — **não** entra nas ações em lote (Iniciar/Finalizar Calibragem) nem no
    Painel de Calibragem, que continuam exclusivos de `souGestorDaCalibragem`.
- `npm run type-check` passou limpo. Commit `992602f`, enviado a `master` (deploy no ar) —
  `src/lib/queries/avaliacao.ts` (pendência de 01/09, RPC `get_calibragem_pendente` ainda não
  existe no banco) ficou de fora do commit de novo, de propósito.
- Pedido, mesma sessão, alteração na lista existente: Felipe Marques Santos sai de
  `pode_ver_lado_calibragem` (acesso ao ciclo inteiro) e vira "calibrador restrito" — mesma
  regra da Graciela, só os 11 liderados dele no organograma. Confirmado explicitamente com o
  usuário (`AskUserQuestion`) que Igor e Priscila NÃO saem da lista de acesso ao ciclo inteiro —
  só o Filippe Réus (dono da empresa) fica junto deles; a leitura literal de "somente o Filipe
  Réus pode ver o de todo mundo" foi descartada. Migration
  `PENDENTE_20260902010000_calibragem_felipe_marques_restrito.sql` (**rodada pelo Igor,
  confirmada via SQL direto**): `pode_ver_lado_calibragem()` volta a 3 nomes fixos;
  `e_calibrador_restrito()` ganha o segundo nome fixo (Felipe Marques, ao lado da Graciela).
  Front-end: `souCalibradorRestrito` virou lista de e-mails (Graciela + Felipe Marques).
  `npm run type-check` passou limpo. Commit `ce7a314`, enviado a `master` (deploy no ar).

### 2026-09-01
- Início da sessão: git status mostrava 34 migrations + 4 docs de "Adições futuras" apagados no
  working tree local (mesmo tipo de incidente do dia 31/08, aparentemente repetido ou desfeito depois
  do `git restore` daquela sessão). Nada afetava o banco (só arquivos locais, tudo já commitado) —
  restaurado com `git restore` de novo antes de qualquer outra coisa.
- Pedido do Igor: a tabela "Perfis da equipe" do Autoconhecimento (visão de admin piloto) mostrava só
  tipo de Eneagrama, sem relacionar ao perfil do cargo da pessoa, às competências exigidas nesse cargo,
  nem sugerir "o que o Eneagrama ajuda/atrapalha" considerando resultados esperados. Confirmado que o
  pedido nasceu de um arquivo novo que ele colou em `Adições futuras/`: **`Cargos Concretize.xlsx`**
  (também apareceram no mesmo lote, ainda não usados: `Avaliação Desempenho CTZ - 2026.docx`, `Código de
  Cultura CTZ 2026.pdf`, `Diretrizes de avaliação.jpg`, `Manual do avaliador - CTZ 2026.docx` — parecem
  reaparecimento dos mesmos arquivos que já existiam antes, não conteúdo novo, não abertos nesta sessão).
- `Cargos Concretize.xlsx` tem 8 abas: Liderança (4 papéis sem distinção de nível), Adm e Finanças,
  Urbanismo, Infraestrutura, Legalização, Agrimensura, Comercial (cada uma com Assistente/Analista/
  Especialista × Júnior/Pleno/Sênior — várias combinações ficaram em branco na planilha, só as
  preenchidas entram no banco) e Conceitos (definição geral de Júnior/Pleno/Sênior, pouco conteúdo).
  Extraído programaticamente via Python/openpyxl (não à mão, pra não errar transcrição) — 31
  combinações válidas de área/cargo/nível.
- 3 decisões confirmadas com o Igor antes de implementar (`AskUserQuestion`): (1) essa análise continua
  visível só pro admin piloto (Igor/Priscila), mesma regra de sempre — ninguém mais vê; (2) as "dicas e
  sugestões" são **pré-geradas pela IA e salvas no banco** (botão "Gerar/Atualizar análise" por pessoa),
  não geradas a cada abertura de tela; (3) as 2 pessoas cujo cargo real não bate com nenhuma linha da
  planilha nova (Felipe Bortolozzo, "Coordenador de TI"; Filippe Réus, "CEO/Sócio Administrador") — e
  mais uma achada durante a implementação, Guilherme Costa Manoel ("SÓCIO ADMINISTRADOR / LÍDER DA
  VERTICAL DE LOTEAMENTOS / ESP. LEGALIZAÇÃO", cargo composto demais pra mapear 1:1) e Carolina Zanette
  ("Especialista de Urbanismo", cargo que existe na planilha mas está com a célula em branco) — mostram
  só o tipo de Eneagrama, sem o cruzamento de cargo, em vez de tentar adivinhar.
- Implementado: migration `PENDENTE_20260901000000_cargos_perfil_eneagrama.sql` (**ainda não rodada no
  Supabase, avisar o Igor**) com 2 tabelas novas — `cargos_perfil` (referência, os 31 perfis de cargo,
  RLS restrita a `pode_ver_todos_eneagrama_ctz()` igual ao resto do protótipo) e
  `funcionarios_cargo_perfil` (vínculo pessoa↔cargo + `dicas_texto`/`dicas_gerado_em`, RLS: select
  próprio+admin piloto, update só admin piloto) — mais a carga inicial das 20 pessoas já mapeadas em
  `funcionarios_eneagrama` (17 com `cargo_perfil_id` preenchido, 3 nulas de propósito, ver acima).
  Query nova `src/lib/queries/cargosPerfil.ts` (`getTodosCargosPerfil`), rota nova
  `src/app/api/gerar-dica-cargo-eneagrama/route.ts` (mesmo padrão de auth+trava de
  `/api/assistente-eneagrama`, mas recebe `funcionarioId` no corpo porque quem chama é o admin gerando
  a análise de OUTRA pessoa, não a própria — a rota monta o prompt cruzando perfil de cargo +
  forças/sombra/virtude/competências do tipo do Eneagrama, chama o mesmo Gemini de sempre, e salva a
  resposta em `funcionarios_cargo_perfil.dicas_texto`). Página `autoconhecimento/page.tsx`: linha da
  tabela virou expansível (clique mostra sumário do cargo, autonomia, competências técnicas/
  comportamentais, e o bloco de dicas com o botão gerar/atualizar). `npm run type-check` passou limpo.
- **Pendências pro Igor antes do próximo push pra `master`**: (1) rodar a migration no SQL Editor do
  Supabase; (2) revisar a aproximação feita pra Fabiana Carolina de Olivera — cargo dela na planilha de
  funcionários é só "SECRETÁRIA EXECUTIVA" sem nível, assumi "Pleno" como referência (fácil de corrigir
  depois, é 1 linha só); (3) decidir se quer completar os cargos de Felipe Bortolozzo/Filippe Réus/
  Guilherme/Carolina na planilha nova pra fechar os 4 que ficaram sem cruzamento.
- Arquivos de origem (`Cargos Concretize.xlsx` incluído) seguem a mesma regra já combinada: só local,
  fora do Git — nada de dado real de cargo/salário/pessoa vaza pro repositório.
- **Migration rodada pelo Igor no SQL Editor, confirmada via SQL direto** (31 `cargos_perfil`, 20
  `funcionarios_cargo_perfil` — 17 com cargo, 3 sem, exatamente como esperado). Enviado pra `master`,
  commit `bb65b21` — Vercel deve ter feito deploy automático.
- **Achado importante antes do push**: `src/lib/queries/avaliacao.ts` já estava modificado no working
  tree desde antes desta sessão (não fui eu quem mudou), chamando uma RPC nova `get_calibragem_pendente`
  (troca de um cálculo cru de `nota_calibragem` por uma RPC security-definer, por motivo de segurança —
  ver comentário no próprio arquivo, datado de 28/08). **Confirmei via SQL direto que essa função NÃO
  existe no banco** (`select proname from pg_proc where proname = 'get_calibragem_pendente'` veio
  vazio) — contradiz o que o log de 31/08 supunha ("provavelmente já aplicada"). É quase certamente a
  mesma migration `20260828030000_avaliacao_fecha_leitura_direta_notas.sql` que o incidente da pasta
  `migrations` apagada tinha perdido sem nunca ter sido commitada. **Deixei esse arquivo de fora do
  commit/push de hoje** (senão quebraria "Finalizar Calibragem" em produção, todo mundo que clicasse
  receberia erro de função inexistente) — ele continua modificado, sem commit, no working tree.
  **Pendente**: reconstruir essa migration (o conteúdo original nunca foi lido nesta conversa em nenhuma
  sessão) e rodar no Supabase antes de commitar `avaliacao.ts` — ou reverter o arquivo pro que está em
  produção, se o Igor preferir não mexer nisso agora.

### 2026-08-31
- Início de uma feature nova, só CTZ: módulo de autoconhecimento baseado em Eneagrama, pra virar um
  assistente que orienta cada pessoa conforme seu tipo (pedido gravado em `Adições futuras/Eneagrama.txt`).
  Fonte é a pasta `Adições futuras/Relatórios/` (apostilas/slides do "Programa Foco" da BeHive/Letícia
  Leite + 3 PDFs de instintos de outra autora, Yara Cunha, tom bem mais espiritual/sistêmico).
- **Etapa 1 concluída** (só isso, por pedido explícito — nada de código de assistente ainda): li e
  consolidei todo o material em `Adições futuras/Eneagrama - Base de Conhecimento CTZ.md` — os 9 tipos
  num formato padronizado (mecanismo de defesa, forças, sombras, virtude + as 6 competências
  relacionais de cada), os 27 subtipos, Asas/Flechas, os 3 instintos (camada prática + camada avançada
  da Yara Cunha, incluída a pedido do usuário mas marcada como tom à parte), e o diagnóstico real da
  equipe/liderança CTZ que a BeHive já fez (jul/2026). Ainda não decidido onde isso entra no produto
  nem como vira o assistente — isso fica pra próxima etapa.
- Atenção pra próxima etapa: as apostilas dizem "protegidos por direitos autorais" e os PDFs da Yara
  Cunha dizem "reprodução proibida" — antes de expor esse conteúdo a usuário final (não só uso interno
  como está agora), confirmar com o Igor se há autorização.
- Verificação pedida pelo usuário: confirmei que **nenhum** documento da pasta `Relatórios/` liga nome
  de pessoa a tipo (só contagem agregada da equipe). Só depois apareceu na própria pasta `Adições
  futuras/` o arquivo `FUNCIONARIOS CTZ.xlsx` — esse sim tem nome + cargo + líder + vertical + Tipo
  Eneagrama + sequência de subtipo de 22 pessoas (2 ainda sem tipo preenchido: Felipe Bortolozzo
  Araújo de Mello e Gabriel Rodrigues Lodetti; Priscila Santos não consta na planilha). Já registrado
  na seção 4 da base de conhecimento, junto com o alerta de privacidade (mesma categoria sensível das
  notas de avaliação — decidir uma regra de acesso parecida quando desenhar o assistente).
- Verificado no banco (via MCP do Supabase, só leitura) que dá pra casar as 22 pessoas da planilha com
  usuário real: `public.funcionarios` da CTZ (`client_id = ac4ad62b-9b88-44da-ae69-0f26ced07d06`, 25
  linhas) já tem `user_id` em cada linha, e `upper(trim(full_name))` bate 100% com o `NOME` da
  planilha — nenhum fuzzy match necessário. Achados: Ezequiel Cunha de Oliveira está `Desligado`;
  Priscila Santos (Calibradora Externa) e Laura Tolentino (sem `user_id` ainda) existem em
  `funcionarios` mas não estão na planilha. Detalhe registrado na seção 4 da base de conhecimento.
- **Fase 2 implementada**: página `/autoconhecimento` (só CTZ, mesmo padrão `isEmpresaCTZ` do
  `/avaliacao`) com o card do próprio tipo + um chat simples (pergunta/resposta, histórico só em
  memória do React, não persiste no banco) que chama `/api/assistente-eneagrama`. Essa rota resolve o
  tipo da pessoa **sempre no servidor** a partir da sessão (nunca aceita tipo vindo do client), monta o
  system prompt a partir de `src/lib/eneagrama/tipos.ts` (só a camada corporativa da Fase 1, a camada
  avançada da Yara Cunha ficou de fora do MVP) e chama o Gemini pelo mesmo padrão já usado em
  `/api/sugerir-icp` (`GEMINI_API_KEY`, `gemini-1.5-flash`, fetch direto, sem SDK novo).
- Decisão de banco importante: o tipo de cada pessoa foi pra uma tabela **nova**,
  `public.funcionarios_eneagrama` (migration `20260831000000_eneagrama_perfis_ctz.sql`, **já rodada
  pelo Igor, 20/20 linhas confirmadas**), e não pra colunas em `funcionarios`. Motivo: a
  RLS de SELECT de `funcionarios` hoje libera qualquer pessoa da mesma empresa ver a linha de qualquer
  colega — colocar o tipo ali vazaria o tipo de todo mundo pra todo mundo. A tabela nova tem RLS própria
  restrita a `user_id = auth.uid()` (mesmo princípio de "cada um só vê o seu" das notas de avaliação).
- Pedido do Igor (mesmo dia): módulo inteiro é protótipo em teste — **só Igor e Priscila Santos podem
  ver que ele existe**, nada deve aparecer pros outros 20 funcionários mapeados por enquanto. Adicionado
  `souPilotoAutoconhecimento()` em `lib/utils.ts` (lista fixa de e-mails, mesmo padrão de
  `souGestorDaCalibragem`), aplicado em 3 camadas: item do menu no `Sidebar.tsx` (não aparece pra
  ninguém fora da lista — precisou passar `user.email` do `layout.tsx` pro Sidebar como prop nova),
  `autoconhecimento/page.tsx` (mostra a mesma mensagem genérica de "módulo não disponível" se não
  estiver na lista, sem entregar pista de que é uma restrição), e `api/assistente-eneagrama/route.ts`
  (retorna 403 — essa é a camada que importa de verdade pra segurança, as outras duas são só UI).
  Ressalva conhecida: a RLS de `funcionarios_eneagrama` continua restrita a `user_id = auth.uid()`, não
  à lista do piloto — então, tecnicamente, um dos 18 funcionários que JÁ tem tipo mapeado ainda
  conseguiria ler a própria linha via uma chamada direta ao Supabase (fora da UI/API do app). Não travei
  isso na RLS porque é um cenário que exigiria a pessoa abrir o devtools e replicar a chamada
  manualmente, e o pedido foi sobre a experiência do produto ("não deve aparecer nada"), não sobre
  esconder de um ataque deliberado — mas vale saber que existe essa brecha residual se o piloto for
  levado mais a sério antes de abrir pra CTZ inteira. Explicado pro Igor, ele decidiu não se preocupar
  com isso por enquanto (só ele tem acesso ao banco/SQL Editor — o cenário residual é sobre sessão de
  app, não acesso a banco, mas ele topou o risco assim mesmo pra esta fase de protótipo).
- Decisão do Igor: os arquivos brutos de origem (`Eneagrama.txt`, `FUNCIONARIOS CTZ.xlsx` — tem
  nome+tipo real de 22 pessoas — e a pasta `Relatórios/` com as apostilas/PDFs com aviso de direitos
  autorais) ficam **só locais, fora do Git de propósito** ("é melhor que isso não vaze por acidente").
  Só a base de conhecimento sintetizada (`Eneagrama - Base de Conhecimento CTZ.md`) foi commitada.
- Pedido extra do Igor no mesmo dia: como ele e a Priscila não são nenhum dos 20 funcionários com tipo
  mapeado, os dois viam "perfil não mapeado" — mas o objetivo dele é conseguir ver o perfil de TODO
  MUNDO pra conferir se o mapeamento está certo (visão de administrador do protótipo, não só o próprio
  tipo). Adicionada migration `20260831010000_eneagrama_admin_piloto.sql`: função
  `pode_ver_todos_eneagrama_ctz()` (mesmo padrão de `pode_ver_lado_calibragem`, mas checando
  `auth.uid()` contra os 2 `user_id`s fixos do Igor/Priscila — peguei os UUIDs reais de `auth.users`
  via MCP) + uma SEGUNDA policy de SELECT em `funcionarios_eneagrama` (a policy "só a própria linha"
  continua valendo pra todo mundo, Postgres faz OR entre policies permissivas). Nova query
  `getTodosPerfisEneagrama()` e uma tabela na página listando nome + tipo + subtipo de todo mundo,
  visível só quando a RLS de fato devolve linhas (ou seja, só pra esses 2). O chat do assistente
  continua só sobre o próprio tipo — não estendi pra "conversar sobre o tipo de outra pessoa", não foi
  pedido. **Rodada e confirmada** no banco (função + policy existem).
- Incidente: o Igor apagou o conteúdo inteiro de `supabase/migrations/` local ("estava confuso e com
  muitos arquivos"). Recuperado sem perda real via `git restore supabase/migrations/` — as 33 migrations
  já estavam todas commitadas (inclusive as duas de hoje), apagar da pasta local não desfaz nada que já
  rodou no banco. **Exceção**: `20260828030000_avaliacao_fecha_leitura_direta_notas.sql` nunca tinha
  sido commitada (já estava como arquivo solto desde o início desta sessão) — essa não deu pra
  recuperar, ninguém nunca leu o conteúdo dela nesta conversa. Provavelmente já está aplicada no banco
  (é de 28/08), só a cópia local do arquivo que se perdeu de vez.
- **Convenção nova, pedida pelo Igor**: toda migration nova a partir de agora leva o prefixo
  `PENDENTE_` antes da data (ex.: `PENDENTE_20260901000000_algo.sql`), pra ficar visualmente destacada
  das dezenas de migrations históricas na hora de achar qual rodar. Aplicar em toda migration daqui pra
  frente.
- Adicionada na página `/autoconhecimento` uma seção recolhível "Pedido original × o que foi
  construído" (pro Igor mostrar pra Priscila e ela validar) — compara ponto a ponto o que o áudio
  pediu, o que foi entregue (inclusive o que foi além, tipo as 3 competências extras), as decisões
  tomadas no meio do caminho que não estavam no pedido (piloto restrito, privacidade por padrão) e o
  que ainda está em aberto.
- **Ideia guardada pro Igor, não implementada ainda** (pediu pra lembrar, "foi boa"): deixar Igor e
  Priscila escolherem um tipo qualquer da lista pra "simular" e testar o chat do assistente — hoje
  nenhum dos dois consegue testar o chat de verdade, porque a caixa de conversa só aparece quando existe
  um tipo PRÓPRIO mapeado (`{tipo && (...)}` em `autoconhecimento/page.tsx`), e nem Igor nem Priscila são
  um dos 20 funcionários com tipo. Surgiu de uma verificação da transcrição original (31/08): o pedido do
  áudio ("assistente que responde as pessoas conforme o tipo daquela pessoa") está implementado e
  funciona pra qualquer um dos 20 mapeados, mas os únicos 2 que hoje têm acesso ao protótipo não
  conseguem validar essa parte específica na própria pele sem essa simulação.
- Achado à parte (advisory automático do MCP do Supabase, não pedido, mas o próprio tool manda
  reportar): **`public.page_access_log` e `public."Propagandas"` estão com RLS desabilitado** — ficam
  totalmente expostas pra `anon`/`authenticated` (qualquer um com a chave pública lê/escreve todas as
  linhas). Não mexi em nada (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` sem policy travaria o acesso
  todo) — decidir com o Igor se e quando tratar isso.
- Instalado **Poppler** (winget, `oschwartz10612.Poppler`) pra extrair texto/imagem de PDF nesta
  máquina — não veio instalado, igual Git/Node antes. Detalhe: `winget install` só funcionou pela
  ferramenta PowerShell, não pela Bash (Bash deu erro de rede, `InternetOpenUrl() failed`). E mesmo
  depois de instalado, o Read tool nativo (que processa PDF internamente) continuou sem achar o
  `pdftoppm` mesmo copiando os binários pra pasta do PATH do Windows (`C:\Users\igorc\.local\bin`) —
  o processo do Claude Code já tinha o PATH antigo em memória e não relê o registro do Windows em
  runtime. Contornado extraindo texto via `pdftotext -layout` e páginas via `pdftoppm` **pelo Bash**
  (que pega o PATH atualizado) e depois lendo os `.txt`/`.png` gerados com o Read tool normal — funciona
  bem, só não dá pra usar `pages=` do Read tool direto num PDF nesta sessão. Se isso incomodar de novo,
  a solução de verdade é reiniciar a sessão do Claude Code depois de instalar uma ferramenta nova.

### 2026-08-28
- Pedido: Felipe Marques Santos (Líder de Operações, `permission_level='gestor'` na CTZ, não admin de verdade) entra na calibragem restrita da CTZ junto com Igor/Filippe Réus/Priscila Santos. Confirmado antes por investigação: sem essa lista, gestor comum (mesmo dos próprios liderados) não vê autoavaliação nenhuma — `pode_ver_lado_auto` só libera `e_admin_do_ciclo` ou o próprio avaliado, sem exceção pra gestor/avaliador desde a migration `20260822_avaliacao_bloqueio_total_notas` (a exceção "gestor vê a partir da Calibragem" foi removida de propósito nela). O único jeito de um gestor (não-admin) ver a nota "auto" de alguém é estar na lista de `pode_ver_lado_calibragem` — só aí o Painel de Calibragem (`get_calibragem_ciclo_cultural/tecnica`) libera `nota_auto`.
- Aplicado: migration `20260828000000_calibragem_ctz_adiciona_felipe_marques` (recria `pode_ver_lado_calibragem` com o user_id dele, `05d3db6c-ef45-40af-9748-2f02b6f1efc4`) rodada manualmente no SQL Editor pelo usuário; `souGestorDaCalibragem` em `avaliacao/page.tsx` ganhou o e-mail dele na lista. Commit `ff975d8`, enviado a `master` (deploy no ar).
- Importante: essa lista dá acesso ao **ciclo inteiro da CTZ**, não só aos 11 liderados diretos do Felipe — mesmo nível que Igor/Filippe Réus/Priscila já tinham. Avisado e confirmado com o usuário antes de aplicar.
- Descoberto: o MCP do Supabase (`~/.claude.json`, chave do projeto `C:/dev/begoal` → `mcpServers.supabase.args`) está configurado com `--read-only` — bloqueia `CREATE FUNCTION`/qualquer DDL/DML via `execute_sql` (erro `cannot execute CREATE FUNCTION in a read-only transaction`), e não expõe `apply_migration`. Usuário optou por continuar aplicando manualmente no SQL Editor por enquanto em vez de tirar a flag — ver [[supabase-mcp-read-only]].

### 2026-08-27
- Levantado quem tem `permission_level = 'administrador'` em cada empresa via SQL direto (13 empresas, 11 e-mails distintos — a equipe da behive aparece como admin em quase todas, mais 1-2 pessoas específicas por empresa).
- Pedido: calibragem da CTZ vira exclusiva de Igor + Filippe Réus + Priscila Santos (não mais "qualquer administrador"), e a trava de "Iniciar Calibragem" que exigia todo mundo do ciclo com auto+gestor concluídos foi removida — ativa independente, move todo mundo elegível de uma vez (não só quem já tinha gestor_concluida). Migrations `20260827000000_calibragem_ctz_restrita`, `20260827010000_calibragem_ctz_acesso_filippe` e `20260827020000_calibragem_ctz_adiciona_priscila` aplicadas em produção. **Tudo já enviado ao GitHub** (commits `b96702b`..`4fb8b99`, mais os de hoje abaixo) — deploy no ar.
- Detalhe não óbvio: Filippe não é administrador da CTZ, só `gestor` — a regra usa `pode_ver_lado_calibragem()` (checa `auth.uid()` contra os user_id fixos, só pra `client_id` da CTZ) tanto pra mascarar a nota quanto, via `pode_acessar_avaliacao`/`avaliacoes_select`/`avaliacoes_update`, pra dar acesso de linha — sem isso o Painel de Calibragem carregaria vazio pra ele nas avaliações de quem ele não lidera. Priscila já é admin de verdade, então não precisou desse reforço.
- Avaliação de Pares ganhou aba de Performance Técnica (antes só cultural) — vertical trava automaticamente na vertical da avaliação comum da pessoa avaliada (`get_vertical_padrao`, security definer), pra garantir que os `criterio_key` batem com os da avaliação comum. Painel de Calibragem ganhou a coluna "Média Pares" também na tabela técnica (`get_calibragem_ciclo_tecnica` recriada com essa coluna, migration `20260827030000_calibragem_media_pares_tecnica`).
- **Incidente real investigado**: Graciela reportou que a nota que deu pro Felipe Marques Santos (avaliação de pares) sumiu. Achado: nunca tinha sido salva de verdade no ciclo ativo (`avaliacoes_cultural` com zero linhas, status parado em `pendente`) — o "Salvar" do `ModalAvaliacao` é tudo-ou-nada (`validarCampos()` bloqueia TUDO se faltar um campo, sem autosave), e o aviso de erro era só uma frase genérica no rodapé, fácil de não notar. Não tinha relação com nenhuma mudança de código da sessão. Corrigido o dado: ela tinha uma avaliação idêntica e completa (mesmas 4 notas + texto) salva num ciclo de teste anterior ("Teste finalizado") de antes da unificação dos botões Salvar/Concluir — copiada via SQL direto pra avaliação do ciclo ativo, com status ajustado pra `gestor_concluida`.
- Melhorada a clareza do "Salvar" em resposta a isso: `validarCampos()` agora também guarda QUAIS campos específicos faltam (`camposInvalidos` — pilares, critérios, vertical, observações), usado pra: trocar de aba automaticamente pra onde está o problema, e desenhar contorno vermelho exatamente nos campos vazios (antes só existia texto no rodapé).
- Descoberto que a cópia em `C:\Users\igorc\OneDrive\Documents\begoal-master-...` (ver "Fatos operacionais" acima) estava sendo usada por engano numa sessão nova antes deste log ser lido — perdeu tempo tentando consertar o repositório quebrado ali em vez de vir direto pra `C:\dev\begoal`. Reforçando aqui pra próxima sessão não repetir.

### 2026-08-26
- Diagnosticado (via SQL direto no Supabase, sem acesso ao código na hora) que o relato "autoavaliação não salva" não era perda de dado: era gente preenchendo tudo e nunca clicando em "Concluir". Achado real: Guilherme Costa Manoel tinha nota 1 + texto "ff" em todos os pilares (dado de teste/rascunho) que quase foi marcado como concluído por engano — revertido pra `pendente` a tempo. Felipe Bet Ross tinha dado real, confirmado e mantido como `auto_concluida`.
- Descartada suspeita de contaminação de dados entre ciclos ou troca de notas entre usuários — única coincidência encontrada foi a mesma pessoa reaproveitando o próprio texto entre um ciclo de teste (12/08) e o ciclo real (17/08), nunca entre pessoas diferentes.
- Especificado e implementado o **Painel de Calibragem**: tela dedicada (`ModalCalibragem.tsx`) que lista todos os participantes do ciclo de uma vez — Cultural: Auto/Avaliador/Média de Pares (nova, calculada na leitura)/Calibragem editável; Técnico: Auto/Avaliador/Calibragem. Autosave por clique. Migration `20260826000000_calibragem_painel.sql` (`get_calibragem_ciclo_cultural`/`get_calibragem_ciclo_tecnica`, mesma máscara admin-only de sempre, sem role novo). Aplicado no Supabase e enviado pro GitHub (`master`, commit `ea68c80`) — Vercel deve ter feito deploy automático.
- Resolvido também: Git/Node instalados nesta máquina; autenticação de push configurada (ver "Fatos operacionais" acima).
- Unificados os botões "Salvar"/"Concluir [etapa]" do `ModalAvaliacao.tsx` num único botão (commit `3559d2d`, local, ainda não enviado ao GitHub por pedido do usuário — "vamos manter local por enquanto"). Seguro porque `validarCampos()` já bloqueava "Salvar" com campo faltando, então salvar com sucesso já implicava "está tudo completo"; o botão único conclui a etapa quando aplicável ao papel de quem salva, senão só salva, sem mudar o gate de calibragem em lote (`page.tsx`).
