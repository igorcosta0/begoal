-- Cruzamento cargo x Eneagrama no modulo de Autoconhecimento (pedido do Igor,
-- 01/09/2026): a tabela mostrava so o tipo de cada pessoa, sem relacionar ao
-- perfil do cargo dela, as competencias exigidas, nem gerar dicas de "o que o
-- Eneagrama ajuda/atrapalha". Fonte dos perfis de cargo: nova planilha
-- "Adicoes futuras/Cargos Concretize.xlsx" (colada pelo Igor na mesma pasta
-- de sempre, fora do Git). Extraido programaticamente da planilha (sem
-- transcricao manual) via script Python/openpyxl nesta sessao -- 31
-- combinacoes validas de area/cargo/nivel (so as que a planilha ja tinha
-- preenchido; varias linhas de Assistente/Especialista ficaram em branco na
-- origem e nao entram aqui).
--
-- Decisoes confirmadas com o Igor antes de implementar:
-- 1. Essa analise cargo x Eneagrama continua visivel so pro admin piloto
--    (Igor/Priscila), mesma regra de pode_ver_todos_eneagrama_ctz() ja usada
--    na tabela "Perfis da equipe" -- ninguem mais ve isso ainda.
-- 2. As "dicas e sugestoes" (o que o tipo ajuda/atrapalha nesse cargo) sao
--    pre-geradas pela IA e salvas no banco (coluna dicas_texto), nao geradas
--    a cada abertura de tela -- um botao "Gerar/Atualizar" na tela dispara a
--    geracao via /api/gerar-dica-cargo-eneagrama.
-- 3. 3 das 20 pessoas mapeadas em funcionarios_eneagrama ficam SEM cargo_perfil_id
--    (nulo, de proposito): Carolina Zanette (cargo dela, "Especialista de
--    Urbanismo", esta em branco na planilha nova) e Filippe Reus / Guilherme
--    Costa Manoel (cargos de socio/CEO compostos -- "SOCIO ADMINISTRADOR /
--    CEO / ..." -- que nao batem 1:1 com nenhuma linha da planilha de cargos).
--    Pra essas 3, a tela mostra so o tipo, sem o cruzamento de cargo.

-- (comentarios acima em ASCII de proposito pra evitar qualquer problema de
-- encoding ao colar no SQL Editor; o conteudo de dados abaixo mantem os
-- acentos originais da planilha, que e o que aparece pro usuario.)

-- Tabela de referencia: perfis de cargo (nao e por pessoa)

create table if not exists public.cargos_perfil (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  area text not null,
  cargo_base text not null,
  nivel text,
  sumario text not null,
  responsabilidades text not null,
  autonomia text,
  experiencia text,
  formacao text,
  competencias_tecnicas text,
  competencias_comportamentais text,
  created_at timestamptz not null default now()
);

create unique index if not exists cargos_perfil_area_cargo_nivel_idx
  on public.cargos_perfil (client_id, area, cargo_base, (coalesce(nivel, '')));

alter table public.cargos_perfil enable row level security;

drop policy if exists "cargos_perfil_select_admin_piloto" on public.cargos_perfil;
create policy "cargos_perfil_select_admin_piloto" on public.cargos_perfil
  for select using (public.pode_ver_todos_eneagrama_ctz());

insert into public.cargos_perfil (
  client_id, area, cargo_base, nivel, sumario, responsabilidades, autonomia,
  experiencia, formacao, competencias_tecnicas, competencias_comportamentais
)
select 'ac4ad62b-9b88-44da-ae69-0f26ced07d06', v.area, v.cargo_base, v.nivel, v.sumario,
       v.responsabilidades, v.autonomia, v.experiencia, v.formacao,
       v.competencias_tecnicas, v.competencias_comportamentais
from (values
  ('Adm e Finanças', 'Secretária Executiva', 'Júnior', 'Responsável por executar atividades administrativas básicas, com foco em organização e apoio à equipe.', '• Organizar documentos físicos e digitais
• Atualizar planilhas e controles simples
• Realizar atendimento básico (e-mail, telefone)
• Apoiar rotinas administrativas
• Auxiliar na organização de agendas e reuniões
• Apoiar organização de eventos internos
• Apoiar logística de viagens (cotações, reservas simples)', 'Baixa — atua com supervisão constante.', '0–1 anos em rotinas administrativas.', 'Ensino médio completo.', '• Pacote Office básico
• Organização de arquivos', '• Organização
• Disciplina
• Atenção a detalhes'),
  ('Adm e Finanças', 'Secretária Executiva', 'Pleno', 'Responsável por executar rotinas administrativas com maior autonomia, garantindo organização e controle de processos.', '• Controlar documentos e prazos
• Atualizar planilhas e relatórios
• Organizar agendas e reuniões
• Apoiar diferentes áreas da empresa
• Executar rotinas administrativas com autonomia
• Organizar eventos internos e externos
• Realizar cotações e organização de viagens (passagens, hospedagem, agenda)', 'Moderada — atua com menor necessidade de supervisão.', '1–3 anos em rotinas administrativas.', 'Ensino médio completo (superior em andamento é diferencial).', '• Excel básico/intermediário
• Rotinas administrativas', '• Organização
• Proatividade
• Comunicação'),
  ('Adm e Finanças', 'Secretária Executiva', 'Sênior', 'Responsável por atuar com autonomia na gestão de rotinas administrativas, apoiando a liderança e garantindo eficiência dos processos.', '• Controlar processos administrativos
• Acompanhar prazos e indicadores
• Elaborar relatórios mais estruturados
• Apoiar diretamente a liderança
• Sugerir melhorias em processos
• Planejar e organizar eventos corporativos
• Gerenciar logística de viagens da liderança (roteiros, custos, fornecedores)', 'Alta — atua de forma independente nas rotinas.', '3–5 anos em rotinas administrativas.', 'Ensino superior em andamento ou completo.', '• Excel intermediário
• Controle de processos', '• Organização
• Responsabilidade
• Visão de processo'),
  ('Adm e Finanças', 'Analista de Administração e Finanças', 'Júnior', 'Responsável por executar atividades financeiras e apoiar análises, com foco em desenvolvimento técnico.', '• Realizar lançamentos financeiros
• Executar conciliações bancárias
• Apoiar controle de fluxo de caixa
• Apoiar elaboração de relatórios', 'Baixa a moderada.', '0–2 anos em financeiro, administrativo ou áreas correlatas.', 'Ensino superior em andamento.', '• Excel básico/intermediário
• Noções financeiras', '• Organização
• Proatividade
• Atenção a detalhes'),
  ('Adm e Finanças', 'Analista de Administração e Finanças', 'Pleno', 'Responsável por análises financeiras e administrativas, contribuindo para controle e tomada de decisão.', '• Analisar fluxo de caixa
• Apoiar fechamento financeiro
• Elaborar relatórios gerenciais
• Analisar variações financeiras
• Interface com outras áreas', 'Moderada a alta.', '2–5 anos em financeiro, administrativo ou áreas correlatas.', 'Ensino superior completo ou em andamento.', '• Excel avançado
• Análise financeira
• ERP (diferencial)', '• Pensamento analítico
• Organização
• Comunicação'),
  ('Adm e Finanças', 'Analista de Administração e Finanças', 'Sênior', 'Responsável por análises financeiras avançadas e apoio estratégico à gestão.', '• Elaborar planejamento financeiro
• Realizar projeções e análises de desempenho
• Desenvolver estudos de viabilidade
• Apoiar tomada de decisão
• Propor melhorias de processos', 'Alta.', '5+ anos em financeiro, administrativo ou áreas correlatas.', 'Ensino superior completo.', '• Modelagem financeira
• Planejamento financeiro
• Indicadores financeiros', '• Visão de negócio
• Pensamento crítico
• Comunicação'),
  ('Urbanismo', 'Analista de Urbanismo', 'Júnior', 'Responsável por desenvolver projetos urbanísticos e estudos de viabilidade com autonomia inicial, garantindo conformidade com diretrizes técnicas e legislação aplicável.', '• Desenvolver projetos urbanísticos
• Elaborar estudos de viabilidade urbanística
• Produzir mapas de restrição e condicionantes
• Interpretar e aplicar legislação urbanística e ambiental
• Elaborar memoriais descritivos
• Apoiar compatibilização com infraestrutura
• Garantir padrão técnico e organização dos projetos', 'Média — executa projetos com autonomia, com validação pontual.', '1 a 3 anos em projetos urbanísticos.', 'Ensino superior completo ou em fase final (Arquitetura, Engenharia Civil ou correlatos)', '• AutoCAD (intermediário/avançado)
• Noções de Civil 3D ou Revit (desejável)
• Parcelamento do solo
• Estudo de viabilidade urbanística (básico/intermediário)
• Interpretação de legislação urbanística e ambiental
• Elaboração de mapas de restrição e condicionantes
• Desenvolvimento de projetos urbanísticos
• Noções de infraestrutura urbana', '• Organização
• Proatividade
• Responsabilidade
• Atenção a detalhes
• Capacidade de aprendizado
• Comunicação'),
  ('Urbanismo', 'Analista de Urbanismo', 'Pleno', 'Responsável por desenvolver projetos urbanísticos com autonomia, garantindo qualidade técnica, viabilidade e conformidade com legislação.', '• Desenvolver projetos urbanísticos completos
• Realizar estudos de viabilidade técnica, econômica e ambiental
• Elaborar e revisar mapas de restrição e condicionantes
• Interpretar e aplicar legislação com maior profundidade
• Compatibilizar projetos com demais disciplinas
• Atuar na interface com áreas técnicas e, quando necessário, clientes
• Resolver problemas técnicos de projeto', 'Alta — atua com independência técnica.', '3 a 5 anos em projetos urbanísticos.', 'Ensino superior completo (Arquitetura, Engenharia Civil ou correlatos)', '• AutoCAD avançado
• Civil 3D e/ou Revit (intermediário/avançado)
• Viabilidade urbanística (técnica, econômica e ambiental)
• Leitura de custos e impacto de projeto
• Compatibilização multidisciplinar
• Interpretação avançada de legislação urbanística e ambiental
• Desenvolvimento completo de projetos urbanísticos
• Organização e padronização de projetos
• Noções de gestão de projetos', '• Autonomia
• Senso de prioridade
• Comunicação clara
• Responsabilidade
• Proatividade
• Capacidade de resolução de problemas'),
  ('Urbanismo', 'Analista de Urbanismo', 'Sênior', 'Responsável por definir soluções urbanísticas, orientar tecnicamente projetos e atuar na análise estratégica de empreendimentos, garantindo qualidade, viabilidade e conformidade.', '• Desenvolver e revisar projetos urbanísticos complexos
• Definir soluções técnicas e diretrizes de projeto
• Realizar análises estratégicas de viabilidade
• Atuar na interface com clientes e órgãos públicos
• Apoiar processos de aprovação e licenciamento
• Integrar equipes técnicas (infraestrutura, legalização, etc.)
• Propor melhorias e otimizações nos projetos', 'Alta — responsável por decisões técnicas relevantes.', '5+ anos em projetos urbanísticos.', 'Ensino superior completo (Arquitetura, Engenharia Civil ou correlatos)
Desejável pós-graduação ou especialização.', '• Domínio de ferramentas (AutoCAD, Civil 3D, Revit)
• Domínio de viabilidade urbanística e econômica
• Definição de soluções urbanísticas
• Análise crítica de projetos
• Coordenação técnica multidisciplinar
• Interface com órgãos públicos e processos de aprovação
• Análise de riscos de projeto
• Otimização de projetos (custo, eficiência e viabilidade)
• Aplicação de boas práticas e tendências (urbanismo sustentável, etc.)', '• Pensamento analítico
• Capacidade de decisão
• Comunicação clara e assertiva
• Proatividade
• Responsabilidade
• Visão crítica'),
  ('Infraestrutura', 'Assistente de Infraestrutura', 'Júnior', 'Apoiar o desenvolvimento técnico de projetos de infraestrutura, executando atividades operacionais e garantindo organização das informações e documentos.', '• Apoiar na elaboração de desenhos e documentos técnicos
• Organizar arquivos e pranchas de projetos
• Auxiliar na coleta e organização de dados
• Realizar ajustes simples conforme orientação
• Apoiar no controle de demandas e prazos
• Auxiliar no preenchimento e atualização de sistemas', 'Baixa — atua sob orientação direta.', '0 a 1 em projetos de infraestrutura urbana', 'Ensino técnico em andamento/completo em Edificações ou ensino superior em andamento em Engenharia Cívil', '• AutoCAD básico
• Noções de projetos de infraestrutura
• Noções básicas de normas
• Pacote Office básico', '• Organização
• Atenção a detalhes
• Proatividade
• Disciplina
• Vontade de aprender'),
  ('Infraestrutura', 'Assistente de Infraestrutura', 'Pleno', 'Apoiar o desenvolvimento técnico de projetos de infraestrutura, contribuindo na elaboração de estudos, ajustes de projeto e organização das entregas.', '• Apoiar e iniciar elaboração de estudos de viabilidade
• Levantar dados técnicos para viabilidade
• Realizar ajustes técnicos em projetos
• Apoiar na elaboração de quantitativos
• Auxiliar na finalização de pranchas
• Atualizar e alimentar sistemas de controle
• Apoiar compatibilização básica entre disciplinas', 'Média — executa atividades com menor dependência.', '1 a 2 anos em projetos de infraestrutura urbana', 'Ensino técnico completo em Edificações ou ensino superior em andamento em Engenharia Cívil', '• AutoCAD intermediário
• Noções de Civil 3D
• Leitura de projetos
• Noções de viabilidade urbanística e de infraestrutura
• Capacidade de levantar dados para estudo de viabilidade
• Noções de quantitativos', '• Organização
• Proatividade
• Responsabilidade
• Comunicação
• Senso de prioridade'),
  ('Infraestrutura', 'Assistente de Infraestrutura', 'Sênior', 'Apoiar o desenvolvimento técnico de projetos de infraestrutura, executando partes do projeto e contribuindo na finalização das entregas.', '• Executar partes de projetos de infraestrutura
• Desenvolver projetos simples (sinalização, pavimentação básica)
• Finalizar pranchas de projetos
• Elaborar estudos de viabilidade com autonomia
• Analisar viabilidade técnica básica dos projetos
• Apoiar definição inicial de soluções
• Auxiliar na organização técnica das entregas', 'Média a alta — executa atividades com pouca supervisão.', '2 a 3 anos em projetos de infraestrutura urbana', 'Ensino técnico completo em Edificações ou ensino superior em andamento em Engenharia Cívil', '• AutoCAD avançado
• Civil 3D básico/intermediário
• Leitura e interpretação de projetos
• Elaboração de estudos de viabilidade
• Análise técnica básica de viabilidade
• Noções de dimensionamento
• Quantitativos
• Conhecimento básico de pavimentação e sinalização', '• Responsabilidade
• Proatividade
• Organização
• Comunicação
• Capacidade de execução'),
  ('Infraestrutura', 'Analista de Infraestrutura', 'Júnior', 'Desenvolver projetos de infraestrutura de menor complexidade, atuando na modelagem e dimensionamento básico, garantindo conformidade técnica e integração com o empreendimento.', '• Desenvolver projetos de infraestrutura de baixa complexidade
• Projetar terraplenagem e drenagem simples
• Desenvolver projetos de água, esgoto, pavimentação e sinalização
• Modelar projetos no Civil 3D
• Elaborar pranchas e documentação técnica
• Garantir aderência a normas e diretrizes técnicas', 'Média — desenvolve projetos com autonomia, com validação técnica.', '3 a 4 anos em projetos de infraestrutura urbana', 'Ensino superior completo em Engenharia Cívil', '• AutoCAD avançado
• Civil 3D (modelagem de infraestrutura)
• Leitura e interpretação de projetos
• Elaboração de projetos de infraestrutura
• Normas técnicas de infraestrutura
• Quantitativos', '• Organização
• Responsabilidade
• Proatividade
• Capacidade de execução
• Comunicação técnica básica'),
  ('Infraestrutura', 'Analista de Infraestrutura', 'Pleno', 'Desenvolver projetos de infraestrutura com autonomia, atuando em cenários de média complexidade e sendo responsável pela condução dos projetos junto ao cliente.', '• Desenvolver projetos de infraestrutura de média complexidade
• Elaborar estudos de viabilidade de infraestrutura
• Atuar na interface com clientes
• Conduzir projetos como responsável operacional (nível GP)
• Compatibilizar projetos com urbanismo e demais disciplinas
• Revisar e ajustar projetos
• Garantir qualidade técnica das entregas', 'Alta — atua com independência técnica e conduz projetos.', '4 a 5 anos em projetos de infraestrutura urbana', 'Ensino superior completo em Engenharia Cívil', '• AutoCAD avançado
• Civil 3D (modelagem e desenvolvimento de projetos)
• Leitura e interpretação de projetos
• Elaboração de projetos de infraestrutura
• Elaboração de estudos de viabilidade
• Normas técnicas de infraestrutura
• Quantitativos', '• Autonomia
• Responsabilidade
• Comunicação com cliente
• Organização
• Proatividade'),
  ('Infraestrutura', 'Analista de Infraestrutura', 'Sênior', 'Desenvolver e definir soluções de infraestrutura em projetos de maior complexidade, garantindo viabilidade técnica, qualidade e tomada de decisão.', '• Desenvolver projetos de infraestrutura de maior complexidade
• Definir soluções técnicas de infraestrutura
• Elaborar e validar estudos de viabilidade
• Atuar na interface com clientes
• Conduzir projetos como responsável técnico (nível GP)
• Compatibilizar projetos com urbanismo e demais disciplinas
• Revisar e validar projetos
• Garantir qualidade técnica das entregas', 'Alta — responsável por decisões técnicas e condução dos projetos.', '5+ anos em projetos de infraestrutura urbana', 'Ensino superior completo em Engenharia Cívil', '• AutoCAD avançado
• Civil 3D (modelagem e desenvolvimento de projetos)
• Leitura e interpretação de projetos
• Elaboração de projetos de infraestrutura
• Elaboração e análise de estudos de viabilidade
• Normas técnicas de infraestrutura
• Quantitativos', '• Capacidade de decisão
• Responsabilidade
• Comunicação com cliente
• Proatividade
• Organização'),
  ('Infraestrutura', 'Especialista de Infraestrutura', null, 'Atuar como referência técnica em projetos de infraestrutura, sendo responsável pela definição de soluções, validação dos projetos e garantia da qualidade técnica das entregas.', '• Definir padrões técnicos de projetos (pranchas, nomenclaturas e organização)
• Garantir padrão técnico e qualidade dos projetos
• Treinar e orientar a equipe técnica
• Apoiar a equipe na resolução de problemas técnicos
• Revisar e validar projetos desenvolvidos pela equipe
• Coordenar e alinhar atividades com projetistas terceiros
• Garantir consistência técnica entre projetos internos e terceirizados
• Definir soluções técnicas de infraestrutura
• Atuar na compatibilização técnica entre disciplinas
• Apoiar interface técnica com clientes quando necessário
• Solicitar e analisar laudos técnicos
• Apoiar tecnicamente o comercial na estruturação de propostas', 'Alta — responsável por decisões técnicas e validação dos projetos.', '6+ anos em projetos de infraestrutura urbana', 'Ensino superior completo em Engenharia Cívil com desejável especialização', '• AutoCAD avançado
• Civil 3D (modelagem e desenvolvimento de projetos)
• Leitura e interpretação de projetos complexos
• Elaboração de projetos de infraestrutura complexos
• Elaboração e análise de estudos de viabilidade complexos
• Domínio de normas técnicas de infraestrutura
• Quantitativos', '• Capacidade de decisão técnica
• Pensamento analítico
• Responsabilidade
• Comunicação clara
• Proatividade
• Capacidade de orientação e desenvolvimento da equipe'),
  ('Legalização', 'Assistente de Legalização', 'Júnior', 'Apoiar a área de legalização na execução de atividades operacionais internas e externas, incluindo organização documental, protocolos e acompanhamento inicial de processos junto a órgãos públicos.', '• Organização de documentos técnicos e administrativos
• Apoio na montagem de processos para órgãos públicos
• Protocolos em prefeituras e órgãos reguladores
• Acompanhamento inicial de processos
• Atualização de controles e planilhas
• Apoio à equipe técnica', 'Baixa — atua sob supervisão direta', '0 a 1 ano', 'Ensino médio ou técnico / superior em andamento', '• Pacote Office básico
• Organização documental
• Noções de processos de legalização
• Noções de projetos técnicos', '• Organização
• Disciplina
• Atenção a detalhes
• Proatividade'),
  ('Legalização', 'Assistente de Legalização', 'Pleno', 'Executar atividades de legalização com autonomia, acompanhando processos, interagindo com órgãos públicos e garantindo o fluxo de documentação.', '• Acompanhar processos de legalização
• Controlar prazos e pendências
• Realizar interface com órgãos públicos
• Montar e revisar processos
• Atualizar sistemas e controles
• Apoiar a equipe técnica', 'Média — executa com pouca supervisão', '1 a 3 anos', 'Ensino superior em andamento ou completo', '• Leitura de projetos
• Controle de processos
• Pacote Office intermediário
• Noções de legislação urbanística', '• Responsabilidade
• Organização
• Comunicação
• Senso de prioridade'),
  ('Legalização', 'Assistente de Legalização', 'Sênior', 'Executar e organizar processos de legalização com autonomia, garantindo controle, antecipação de pendências e fluidez junto a órgãos públicos.', '• Controle de múltiplos processos
• Identificação e antecipação de pendências
• Interface com órgãos públicos
• Interface com projetistas
• Apoio técnico à equipe
• Organização e gestão de processos', 'Alta dentro da função', '3+ anos', 'Superior completo ou em fase final', '• Fluxos de aprovação
• Legislação urbanística
• Organização de processos
• Leitura de projetos
• Pacote Office avançado', '• Organização avançada
• Autonomia
• Senso de prioridade
• Confiabilidade'),
  ('Legalização', 'Analista de Legalização', 'Júnior', 'Atuar na análise inicial de processos de legalização, apoiando tecnicamente a condução dos projetos e garantindo aderência às exigências dos órgãos públicos.', '• Análise inicial de projetos e processos de legalização
• Levantamento de exigências junto a órgãos públicos
• Apoio na resolução de exigências técnicas
• Interface com equipe interna
• Apoio na montagem e revisão de processos', 'Média', '1 a 3 anos', 'Ensino superior completo em Engenharia Civil, Arquitetura, Direito ou correlatos', '• Leitura e interpretação de projetos
• Legislação urbanística
• Análise de processos de legalização
• Compatibilização básica
• Normas e exigências de órgãos públicos', '• Pensamento analítico
• Organização
• Comunicação
• Responsabilidade'),
  ('Legalização', 'Analista de Legalização', 'Pleno', 'Conduzir processos de legalização de média complexidade com autonomia, garantindo andamento, atendimento às exigências e interface com órgãos públicos.', '• Condução de processos completos de legalização
• Interface com órgãos públicos
• Atendimento e resolução de exigências técnicas
• Gestão de prazos e pendências
• Compatibilização de projetos para aprovação
• Interface com equipe técnica', 'Alta', '3 a 5 anos', 'Ensino superior completo em Engenharia Civil, Arquitetura, Direito ou correlatos', '• Legislação urbanística
• Análise de projetos de infraestrutura e urbanismo
• Processos de aprovação
• Gestão de prazos
• Compatibilização de projetos', '• Responsabilidade
• Comunicação
• Organização
• Senso de prioridade'),
  ('Legalização', 'Analista de Legalização', 'Sênior', 'Atuar na condução de processos complexos de legalização, garantindo eficiência, previsibilidade e solução de entraves junto aos órgãos públicos.', '• Condução de processos complexos de legalização
• Definição de estratégias para aprovação
• Antecipação e mitigação de riscos
• Interface com órgãos públicos em nível mais avançado
• Apoio técnico à equipe
• Garantir fluidez e previsibilidade dos processos', 'Alta', '5+ anos', 'Ensino superior completo em Engenharia Civil, Arquitetura, Direito ou correlatos', '• Legislação urbanística avançada
• Estratégia de aprovação
• Análise de processos complexos
• Compatibilização avançada
• Gestão de riscos', '• Resolução de problemas
• Pensamento analítico
• Comunicação
• Responsabilidade'),
  ('Legalização', 'Especialista de Legalização', null, 'Atuar como referência técnica em legalização, sendo responsável pela definição de estratégias de aprovação, garantia de qualidade dos processos e alinhamento com órgãos públicos.', '• Definir estratégias de aprovação de projetos
• Atuar em processos complexos e críticos
• Garantir padrão e qualidade dos processos de legalização
• Atuar na interface institucional com órgãos públicos
• Apoiar a equipe na resolução de entraves
• Antecipar riscos e definir soluções
• Apoiar decisões estratégicas da empresa', 'Alta — referência técnica da área', '6+ anos', 'Ensino superior completo em Engenharia Civil, Arquitetura, Direito ou correlatos', '• Legislação urbanística
• Estratégia de aprovação
• Processos de legalização complexos
• Interface com órgãos públicos
• Gestão de riscos regulatórios', '• Visão estratégica
• Capacidade de decisão
• Comunicação
• Influência
• Proatividade'),
  ('Agrimensura', 'Especialista de Agrimensura', null, 'Atuar como referência técnica em agrimensura, sendo responsável pela definição de metodologias, validação dos levantamentos e garantia da qualidade e confiabilidade dos dados utilizados nos projetos.', '• Definir metodologias de levantamentos e padrões de entrega de dados
• Planejar e validar levantamentos topográficos
• Garantir precisão e confiabilidade das informações
• Analisar e interpretar levantamentos para projetos
• Apoiar projetos de infraestrutura e urbanismo
• Identificar inconsistências e reduzir retrabalho
• Atuar na interface entre campo e escritório
• Definir e validar poligonais
• Conduzir processos de retificação, desmembramento e unificação de áreas
• Atuar em processos de desapropriação e regularização fundiária
• Executar e acompanhar processos junto ao INCRA', 'Alta — responsável pelas decisões técnicas da área', '5+ anos em agrimensura', 'Ensino superior completo em Engenharia de Agrimensura, Engenharia Civil ou correlatos', '• Civil 3D
• Softwares GIS
• Georreferenciamento e geoprocessamento
• Modelagem de terreno
• Levantamentos topográficos
• Normas e legislação de agrimensura
• Regularização fundiária (retificação, desmembramento, unificação, INCRA)
• Integração com projetos de infraestrutura', '• Pensamento analítico
• Capacidade de decisão
• Responsabilidade
• Comunicação técnica
• Organização'),
  ('Comercial', 'Analista Comercial', 'Júnior', 'Responsável por apoiar a geração e qualificação de oportunidades comerciais, atuando na prospecção, organização de leads e preparação do pipeline de vendas.', '• Realizar prospecção ativa de clientes
• Qualificar leads de forma inicial
• Agendar reuniões comerciais
• Atualizar e organizar o CRM
• Realizar follow-ups com leads
• Apoiar equipe comercial nas etapas iniciais da venda', 'Baixa a média — atua com orientação e processos definidos.', '0 a 2 anos em áreas comerciais, atendimento ou pré-vendas.', 'Ensino superior em andamento ou completo (Administração, Engenharia, Marketing ou correlatos)', '• Comunicação clara
• Uso básico de CRM
• Organização de pipeline
• Técnicas básicas de prospecção
• Noções introdutórias de loteamentos/infraestrutura', '• Organização
• Disciplina
• Proatividade
• Escuta ativa
• Persistência
• Facilidade de comunicação'),
  ('Comercial', 'Analista Comercial', 'Pleno', 'Responsável por conduzir processos de venda de ponta a ponta, realizando diagnóstico do cliente, elaboração de propostas e negociação de projetos de média complexidade.', '• Conduzir vendas completas (do lead ao fechamento)
• Realizar diagnóstico de necessidades do cliente
• Elaborar propostas comerciais
• Gerenciar pipeline próprio
• Realizar negociações comerciais
• Atuar com clientes de médio porte
• Acompanhar indicadores de conversão', 'Média a alta — atua com independência em vendas, com apoio pontual.', '2 a 5 anos em vendas consultivas ou áreas comerciais.', 'Ensino superior completo (Administração, Engenharia ou correlatos)', '• Venda consultiva
• Construção de propostas comerciais
• Negociação
• Leitura básica de viabilidade de projetos
• Conhecimento intermediário de infraestrutura/loteamentos
• Gestão de CRM', '• Comunicação clara
• Capacidade de negociação
• Organização
• Foco em resultado
• Autonomia
• Resiliência'),
  ('Comercial', 'Analista Comercial', 'Sênior', 'Responsável por conduzir vendas complexas, atuar com clientes estratégicos e contribuir para o aumento de receita e posicionamento da empresa no mercado.', 'Conduzir negociações complexas
Atuar com clientes estratégicos e de alto valor
Estruturar soluções comerciais personalizadas
Aumentar ticket médio e taxa de conversão
Gerir contas relevantes
Apoiar desenvolvimento de vendedores mais júnior
Identificar oportunidades de negócio', 'Alta — atua com independência e forte responsabilidade sobre resultados comerciais.', '5+ anos em vendas consultivas, preferencialmente em projetos ou engenharia.', 'Ensino superior completo (Administração, Engenharia ou correlatos)', '• Negociação avançada
• Venda consultiva complexa
• Diagnóstico de negócios
• Estruturação de propostas personalizadas
• Conhecimento avançado de mercado (loteamentos/infraestrutura)
• Gestão de contas', '• Influência e persuasão
• Inteligência emocional
• Visão de negócio
• Comunicação de alto nível
• Proatividade
• Foco em resultado'),
  ('Liderança', 'Líder de Marketing e IA', null, 'Responsável por liderar as estratégias de marketing do grupo, integrando soluções de inteligência artificial para ampliar resultados, gerando demanda, fortalecendo a marca e otimizando processos de aquisição e retenção com uso de dados e tecnologia.', '•	Planejar e executar estratégias de marketing digital e de conteúdo
•	Implementar e gerir ferramentas de IA aplicadas ao marketing
•	Gerar e qualificar demanda para as verticais de negócio
•	Monitorar e analisar métricas de desempenho das campanhas
•	Estruturar processos de automação de marketing
•	Alinhar posicionamento de marca com a estratégia da empresa
•	Apoiar a equipe comercial com materiais e inteligência de mercado', 'Alta — atua com independência na definição e execução das estratégias de marketing e adoção de IA, com reporte direto à diretoria.', '6+ anos em marketing digital, growth ou áreas correlatas, com experiência comprovada em uso de ferramentas de IA.', 'Ensino superior completo em Marketing, Publicidade, Administração ou correlatos.', '•	Marketing digital e growth
•	Automação de marketing e CRM
•	Ferramentas de IA generativa e análise de dados
•	Gestão de tráfego pago (Google Ads, Meta Ads)
•	Análise de métricas e KPIs de marketing
•	Produção e estratégia de conteúdo', '•	Criatividade e inovação
•	Orientação a dados
•	Visão estratégica
•	Proatividade
•	Comunicação clara
•	Adaptabilidade a novas tecnologias'),
  ('Liderança', 'Líder de Administração e Finanças', null, 'Responsável pela gestão financeira e administrativa da empresa, garantindo controle de caixa, previsibilidade financeira, organização dos processos administrativos e suporte à tomada de decisão.', '• Gerir fluxo de caixa (realizado e projetado)
• Controlar contas a pagar e receber
• Elaborar previsões financeiras (30, 60 e 90 dias)
• Monitorar inadimplência
• Estruturar e acompanhar DRE
• Controlar custos e apoiar análise de margem
• Garantir organização administrativa e documental
• Apoiar decisões estratégicas com dados financeiros', 'Alta — responsável pela gestão financeira, com reporte direto à diretoria.', '6+ anos em financeiro, controladoria ou áreas correlatas.', 'Ensino superior completo em Administração, Contabilidade, Economia ou correlatos.', '• Gestão financeira
• Fluxo de caixa e projeções
• Controle de custos e margem
• Análise de indicadores financeiros
• Excel intermediário
• Noções de contabilidade', '• Organização e rigor
• Atenção a detalhes
• Responsabilidade
• Pensamento analítico
• Confiabilidade
• Comunicação clara'),
  ('Liderança', 'Líder de Operações e Processos', null, 'Responsável por garantir a execução eficiente dos projetos, organizando recursos, prazos e processos desde a venda até o faturamento, assegurando produtividade, previsibilidade e controle operacional.', '• Planejar e estruturar a execução dos projetos
• Definir cronogramas e prioridades
• Distribuir demandas entre equipe interna e terceiros
• Acompanhar andamento e garantir prazos
• Identificar gargalos e implementar melhorias
• Estruturar processos, controles e indicadores
• Organizar fluxo operacional
• Validar entregas e liberar faturamento', 'Alta — atua com independência na gestão da operação, alinhado à estratégia da empresa.', '6+ anos em operações, gestão de projetos ou áreas correlatas.', 'Ensino superior completo em Engenharia, Administração ou correlatos.', '• Gestão de projetos
• Planejamento e controle operacional
• Estruturação de processos
• Análise de indicadores
• Excel avançado
• Organização de fluxo de trabalho', '• Organização e disciplina
• Senso de prioridade
• Proatividade
• Resolução de problemas
• Comunicação clara
• Resiliência sob pressão'),
  ('Liderança', 'Líder de Vertical', null, 'Responsável por liderar a unidade de negócio, conectando o mercado à operação, definindo estratégias, gerando demanda e garantindo o resultado da vertical.', '• Atuar como principal interface com clientes
• Identificar oportunidades de mercado
• Definir direcionamento estratégico da unidade
• Gerar e apoiar vendas
• Traduzir demandas externas em direcionamento interno
• Priorizar demandas junto à operação
• Acompanhar desempenho da unidade', 'Alta — responsável pela condução da unidade e seus resultados.', '6+ anos em negócios, comercial ou gestão de projetos.', 'Ensino superior completo em Engenharia, Administração ou correlatos.', '• Gestão de negócios
• Comercial e relacionamento com cliente
• Planejamento estratégico
• Visão de mercado
• Noções operacionais', '• Liderança
• Comunicação
• Visão estratégica
• Tomada de decisão
• Negociação
• Proatividade')
) as v(area, cargo_base, nivel, sumario, responsabilidades, autonomia, experiencia,
       formacao, competencias_tecnicas, competencias_comportamentais)
on conflict (client_id, area, cargo_base, (coalesce(nivel, ''))) do nothing;

-- Tabela de vinculo: pessoa x cargo_perfil + dicas geradas

create table if not exists public.funcionarios_cargo_perfil (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id),
  user_id uuid not null,
  client_id uuid not null references public.clients(id),
  cargo_perfil_id uuid references public.cargos_perfil(id),
  dicas_texto text,
  dicas_gerado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (funcionario_id)
);

alter table public.funcionarios_cargo_perfil enable row level security;

drop policy if exists "funcionarios_cargo_perfil_select_proprio" on public.funcionarios_cargo_perfil;
create policy "funcionarios_cargo_perfil_select_proprio" on public.funcionarios_cargo_perfil
  for select using (user_id = auth.uid());

drop policy if exists "funcionarios_cargo_perfil_select_admin_piloto" on public.funcionarios_cargo_perfil;
create policy "funcionarios_cargo_perfil_select_admin_piloto" on public.funcionarios_cargo_perfil
  for select using (public.pode_ver_todos_eneagrama_ctz());

drop policy if exists "funcionarios_cargo_perfil_update_admin_piloto" on public.funcionarios_cargo_perfil;
create policy "funcionarios_cargo_perfil_update_admin_piloto" on public.funcionarios_cargo_perfil
  for update using (public.pode_ver_todos_eneagrama_ctz())
  with check (public.pode_ver_todos_eneagrama_ctz());

insert into public.funcionarios_cargo_perfil (funcionario_id, user_id, client_id, cargo_perfil_id)
select f.id, f.user_id, f.client_id, cp.id
from public.funcionarios f
join (values
  ('AMANDA BITTENCOURT', 'Agrimensura', 'Especialista de Agrimensura', null),
  ('ANGELICA SCARPARI MACHADO', 'Adm e Finanças', 'Analista de Administração e Finanças', 'Júnior'),
  ('CAMILA CHRISTINE LEAL', 'Infraestrutura', 'Analista de Infraestrutura', 'Sênior'),
  ('CAROLINA ZANETTE DE CASTRO SCHIEFLER', null, null, null),
  ('DAVI PUZIO DA SILVA', 'Legalização', 'Assistente de Legalização', 'Júnior'),
  ('EZEQUIEL CUNHA DE OLIVEIRA', 'Infraestrutura', 'Especialista de Infraestrutura', null),
  ('FABIANA CAROLINA DE OLIVERA', 'Adm e Finanças', 'Secretária Executiva', 'Pleno'),
  ('FELIPE BET ROSS', 'Liderança', 'Líder de Vertical', null),
  ('FELIPE MARQUES SANTOS', 'Liderança', 'Líder de Operações e Processos', null),
  ('FILIPE BOSSONI FINATO', 'Liderança', 'Líder de Vertical', null),
  ('FILIPPE TEIXEIRA RÉUS', null, null, null),
  ('GRACIELA BORGES HOEPERS', 'Liderança', 'Líder de Administração e Finanças', null),
  ('GUILHERME COSTA MANOEL', null, null, null),
  ('JEAN PATRICK CANDIA CORREA', 'Liderança', 'Líder de Marketing e IA', null),
  ('LEILIANE SCHEFFER RADDATZ', 'Legalização', 'Analista de Legalização', 'Júnior'),
  ('LUIS HENRIQUE GASETA', 'Comercial', 'Analista Comercial', 'Sênior'),
  ('OTAVIO PIUCCO JUNIOR', 'Legalização', 'Assistente de Legalização', 'Sênior'),
  ('SAMUEL SABINO SACKETI', 'Infraestrutura', 'Assistente de Infraestrutura', 'Sênior'),
  ('TAIANE DOMINGOS BERTO', 'Urbanismo', 'Analista de Urbanismo', 'Júnior'),
  ('TUANI BITENCOURT FERREIRA', 'Infraestrutura', 'Analista de Infraestrutura', 'Pleno')
) as m(nome, area, cargo_base, nivel) on upper(trim(f.full_name)) = m.nome
left join public.cargos_perfil cp
  on cp.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
  and cp.area = m.area
  and cp.cargo_base = m.cargo_base
  and coalesce(cp.nivel, '') = coalesce(m.nivel, '')
where f.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
on conflict (funcionario_id) do nothing;
