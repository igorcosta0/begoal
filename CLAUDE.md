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

## Módulo de Avaliação de Desempenho — estado atual (2026-08-26)

- Fluxo de status: `pendente → auto_concluida → gestor_concluida → calibragem → finalizada`.
- Cada usuário só vê a nota que ELE deu, nunca a que recebeu — regra absoluta, sem exceção de etapa/calibragem/revelação (migration `20260822_avaliacao_bloqueio_total_notas`). A coluna `avaliacoes.revelado` existe mas não faz mais nada (a máscara que dependia dela foi removida) — é resíduo, não mexer achando que ainda funciona.
- Calibragem é etapa **ciclo inteira**, **exclusiva de administrador de verdade** (`souAdministrador`, não confundir com `isAdmin` que é só "papel de avaliador nesta avaliação específica"). Nem o avaliador que preencheu a nota do gestor vê a calibragem.
- Avaliação de Pares é só cultural (4 pilares, sem técnica), montada à mão pelo admin junto com a avaliação comum — não tem autoavaliação, o avaliador preenche a nota no campo `nota_gestor` (mesmo slot que o gestor usa na avaliação comum).
- ~~Pendente: unificar os botões "Salvar" e "Concluir [etapa]"~~ — **feito** (commit `3559d2d`, local, ver Log de Sessões).

## Log de Sessões

### 2026-08-26
- Diagnosticado (via SQL direto no Supabase, sem acesso ao código na hora) que o relato "autoavaliação não salva" não era perda de dado: era gente preenchendo tudo e nunca clicando em "Concluir". Achado real: Guilherme Costa Manoel tinha nota 1 + texto "ff" em todos os pilares (dado de teste/rascunho) que quase foi marcado como concluído por engano — revertido pra `pendente` a tempo. Felipe Bet Ross tinha dado real, confirmado e mantido como `auto_concluida`.
- Descartada suspeita de contaminação de dados entre ciclos ou troca de notas entre usuários — única coincidência encontrada foi a mesma pessoa reaproveitando o próprio texto entre um ciclo de teste (12/08) e o ciclo real (17/08), nunca entre pessoas diferentes.
- Especificado e implementado o **Painel de Calibragem**: tela dedicada (`ModalCalibragem.tsx`) que lista todos os participantes do ciclo de uma vez — Cultural: Auto/Avaliador/Média de Pares (nova, calculada na leitura)/Calibragem editável; Técnico: Auto/Avaliador/Calibragem. Autosave por clique. Migration `20260826000000_calibragem_painel.sql` (`get_calibragem_ciclo_cultural`/`get_calibragem_ciclo_tecnica`, mesma máscara admin-only de sempre, sem role novo). Aplicado no Supabase e enviado pro GitHub (`master`, commit `ea68c80`) — Vercel deve ter feito deploy automático.
- Resolvido também: Git/Node instalados nesta máquina; autenticação de push configurada (ver "Fatos operacionais" acima).
- Unificados os botões "Salvar"/"Concluir [etapa]" do `ModalAvaliacao.tsx` num único botão (commit `3559d2d`, local, ainda não enviado ao GitHub por pedido do usuário — "vamos manter local por enquanto"). Seguro porque `validarCampos()` já bloqueava "Salvar" com campo faltando, então salvar com sucesso já implicava "está tudo completo"; o botão único conclui a etapa quando aplicável ao papel de quem salva, senão só salva, sem mudar o gate de calibragem em lote (`page.tsx`).
