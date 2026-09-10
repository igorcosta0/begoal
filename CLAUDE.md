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
