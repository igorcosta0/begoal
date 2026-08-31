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
- Calibragem é etapa **ciclo inteira**. Acesso (Iniciar/Finalizar/Painel/aba Calibragem do ModalAvaliacao) é `souGestorDaCalibragem` (não confundir com `isAdmin`, que é só "papel de avaliador nesta avaliação específica"): **na CTZ, só Igor, Filippe Réus e Priscila Santos** (pedido 27/08, ver Log de Sessões); em qualquer outra empresa continua sendo qualquer administrador de verdade (`souAdministrador`), igual sempre foi. Nem o avaliador que preencheu a nota do gestor vê a calibragem. "Iniciar Calibragem" não trava mais esperando todo mundo concluir auto+gestor — move de uma vez todo mundo que ainda não está em calibragem/finalizada (pedido 27/08).
- Avaliação de Pares tem cultural (4 pilares) **e técnica** (pedido 27/08 — antes era só cultural) — montada à mão pelo admin junto com a avaliação comum, não tem autoavaliação, o avaliador preenche a nota no campo `nota_gestor` (mesmo slot que o gestor usa na avaliação comum). A vertical técnica do par é travada automaticamente na vertical da avaliação comum de quem está sendo avaliado (`get_vertical_padrao`) — não é livre pro par escolher.
- ~~Pendente: unificar os botões "Salvar" e "Concluir [etapa]"~~ — **feito** (commit `3559d2d`). O "Salvar" do `ModalAvaliacao` é tudo-ou-nada (bloqueia TUDO se faltar 1 campo, sem autosave) — desde 27/08 mostra contorno vermelho nos campos específicos que faltam e troca de aba sozinho pro problema, mas o comportamento tudo-ou-nada em si continua o mesmo (ver Log de Sessões, incidente da Graciela).

## Log de Sessões

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
  pedido. **Ainda não rodada** (confirmado direto no banco: `pode_ver_todos_eneagrama_ctz` não existe lá).
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
