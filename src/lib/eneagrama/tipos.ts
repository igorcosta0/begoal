// Base de dados dos 9 tipos do Eneagrama, extraída e estruturada a partir de
// "Adições futuras/Eneagrama - Base de Conhecimento CTZ.md" (Fase 1 do módulo
// de autoconhecimento, só CTZ). Fonte: apostilas "Líder de Si" e "Competências
// Relacionais" (Letícia Leite / BeHive, Programa Foco).
//
// Única fonte de verdade usada tanto pra renderizar o card "seu tipo" quanto
// pra montar o system prompt do assistente (src/app/api/assistente-eneagrama).
// Só a camada corporativa entra aqui — a camada avançada/espiritual (instintos
// segundo Yara Cunha, seção 2.2 do doc da Fase 1) fica de fora de propósito.

export type Centro = 'Instintivo' | 'Emocional' | 'Racional'
export type Instinto = 'AP' | 'SO' | 'SX'

export interface CompetenciaTipo {
  comoAge: string
  pontoAtencao: string
  desenvolver: string
}

export interface SubtipoEneagrama {
  instinto: Instinto
  palavraChave: string
  comoAtua: string
}

export interface TipoEneagrama {
  numero: number
  motivacao: string
  centro: Centro
  palavraSintese: string
  virtude: string
  ideiaSagrada: string
  infancia: string
  mecanismoDefesa: string
  armadilha: string
  forcas: string
  sombra: string
  talentoAutolideranca: { nome: string; potencial: string; desafio: string }
  subtipos: SubtipoEneagrama[]
  asas: { tipos: [number, number]; desenvolver: string }
  flechas: { estresse: { tipo: number; descricao: string }; seguranca: { tipo: number; descricao: string } }
  competencias: {
    relacionamentoInterpessoal: CompetenciaTipo
    tomadaDecisao: CompetenciaTipo
    comunicacao: CompetenciaTipo
    feedback: CompetenciaTipo
    gestaoConflitos: CompetenciaTipo
    orientacaoResultados: CompetenciaTipo
  }
  forcaPrincipalResultados: string
}

export const NOME_INSTINTO: Record<Instinto, string> = {
  AP: 'Autopreservação',
  SO: 'Social',
  SX: 'Sexual / Um a Um',
}

export const TIPOS_ENEAGRAMA: Record<number, TipoEneagrama> = {
  1: {
    numero: 1,
    motivacao: 'Viver é aperfeiçoar',
    centro: 'Instintivo',
    palavraSintese: 'Persistência',
    virtude: 'Serenidade',
    ideiaSagrada: 'Perfeição',
    infancia: 'Sentiu-se cobrado a ser bem comportado/exemplar, e passou a agir como um "pequeno adulto".',
    mecanismoDefesa: 'Formação reativa — controla a irritação, reprime impulsos incompatíveis com "ser educado".',
    armadilha: 'Ressentimento: sempre insatisfeito com a imperfeição da vida e das pessoas, redobra esforço, mas não se dá trégua.',
    forcas: 'Ético, justo, organizado, persistente, disciplinado; tolerante com falhas próprias e alheias quando maduro.',
    sombra: 'Rigidez, crítica, irritação, excesso de cobrança, dificuldade de relaxar.',
    talentoAutolideranca: { nome: 'Integridade', potencial: 'Qualidade, ética e melhoria contínua.', desafio: 'Ser crítico demais consigo e com os outros.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Preocupação', comoAtua: 'Aperfeiçoa segurança, rotina e trabalho; ansioso, rígido, tenso, difícil de relaxar.' },
      { instinto: 'SO', palavraChave: 'Superioridade', comoAtua: 'Aperfeiçoa grupos e causas; idealista, mas pode virar superioridade moral e intolerância.' },
      { instinto: 'SX', palavraChave: 'Fervor', comoAtua: 'Aperfeiçoa os relacionamentos próximos; intenso, ciumento, pode ser controlador e invasivo com quem ama.' },
    ],
    asas: { tipos: [9, 2], desenvolver: 'Equilibrar firmeza com acolhimento.' },
    flechas: {
      estresse: { tipo: 4, descricao: 'Fica mais sensível, instável, autocrítica aumenta.' },
      seguranca: { tipo: 7, descricao: 'Fica mais leve, espontâneo, otimista.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Contribui com organização, responsabilidade e qualidade.', pontoAtencao: 'Pode ficar detalhista, crítico ou inflexível.', desenvolver: 'Valorizar diferentes estilos de trabalho.' },
      tomadaDecisao: { comoAge: 'Analisa o correto e justo antes de agir.', pontoAtencao: 'Pode adiar buscando a perfeição.', desenvolver: 'Aceitar que "boa decisão" pode ser melhor que "decisão perfeita".' },
      comunicacao: { comoAge: 'Objetiva, organizada, focada em fatos.', pontoAtencao: 'Pode transmitir rigidez ou excesso de crítica.', desenvolver: 'Reconhecer acertos antes de apontar melhoria.' },
      feedback: { comoAge: 'Valoriza objetividade e oportunidades de melhoria.', pontoAtencao: 'Pode focar mais em falhas que em acertos.', desenvolver: 'Equilibrar reconhecimento e orientação.' },
      gestaoConflitos: { comoAge: 'Resolve de forma lógica, justa, baseada em princípios.', pontoAtencao: 'Pode ficar rígido, insistir que sua forma é a correta.', desenvolver: 'Escutar e considerar outras perspectivas.' },
      orientacaoResultados: { comoAge: 'Disciplina, organização, qualidade nas entregas.', pontoAtencao: 'Pode atrasar buscando um padrão muito elevado.', desenvolver: 'Equilibrar excelência com agilidade.' },
    },
    forcaPrincipalResultados: 'Excelência',
  },

  2: {
    numero: 2,
    motivacao: 'Viver é agradar',
    centro: 'Emocional',
    palavraSintese: 'Sentir-se capaz',
    virtude: 'Humildade',
    ideiaSagrada: 'Providência',
    infancia: 'Sentiu carência afetiva pontual; passou a esconder necessidades próprias e agradar para garantir amor.',
    mecanismoDefesa: 'Repressão das próprias necessidades, satisfeitas ao atender às dos outros; gratificação exagerada como válvula secundária.',
    armadilha: 'Orgulho: mostra-se autossuficiente e insubstituível ("como o outro viveria sem mim?").',
    forcas: 'Compreensivo, sensível às necessidades alheias; sabe reconhecer as próprias e pedir ajuda quando maduro.',
    sombra: 'Dificuldade de dizer não, acumula ressentimento quando não reconhecido, pode manipular para ser indispensável.',
    talentoAutolideranca: { nome: 'Cuidado', potencial: 'Apoiar e perceber necessidades das pessoas.', desafio: 'Colocar limites.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Privilégio', comoAtua: 'Cuida da vida prática do outro (comida, conforto, saúde); espera reconhecimento especial, ressentido se não valorizado.' },
      { instinto: 'SO', palavraChave: 'Ambição', comoAtua: 'Conecta pessoas, resolve nos bastidores; pode controlar relações e buscar reconhecimento excessivo.' },
      { instinto: 'SX', palavraChave: 'Sedução', comoAtua: 'Vínculos intensos, magnético, percebe emoções alheias; pode ser possessivo e emocionalmente exigente.' },
    ],
    asas: { tipos: [1, 3], desenvolver: 'Ajudar com limites saudáveis.' },
    flechas: {
      estresse: { tipo: 8, descricao: 'Fica controlador, autoritário, exigente.' },
      seguranca: { tipo: 4, descricao: 'Entra em contato com sentimentos, autenticidade.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Colaborativo, prestativo, fortalece vínculos.', pontoAtencao: 'Assume responsabilidades alheias, dificuldade de limite.', desenvolver: 'Ajudar sem assumir tudo para si.' },
      tomadaDecisao: { comoAge: 'Considera impacto sobre pessoas e grupo.', pontoAtencao: 'Coloca necessidades alheias acima das suas.', desenvolver: 'Perguntar "o que é importante pra mim aqui?".' },
      comunicacao: { comoAge: 'Acolhimento, simpatia, interesse genuíno.', pontoAtencao: 'Evita conversas difíceis para preservar o vínculo.', desenvolver: 'Expressar as próprias necessidades com a mesma naturalidade.' },
      feedback: { comoAge: 'Prefere conversas acolhedoras e respeitosas.', pontoAtencao: 'Leva crítica para o lado pessoal.', desenvolver: 'Separar feedback do próprio valor como pessoa.' },
      gestaoConflitos: { comoAge: 'Busca preservar a relação, conciliar.', pontoAtencao: 'Evita confronto, acumula ressentimento.', desenvolver: 'Expressar necessidades com clareza.' },
      orientacaoResultados: { comoAge: 'Via colaboração, apoio, engajamento.', pontoAtencao: 'Prioriza os outros em detrimento das próprias entregas.', desenvolver: 'Equilibrar apoiar a equipe e cumprir suas responsabilidades.' },
    },
    forcaPrincipalResultados: 'Engajamento',
  },

  3: {
    numero: 3,
    motivacao: 'Viver é fazer para sentir que existe e ser valorizado',
    centro: 'Emocional',
    palavraSintese: 'Adequação',
    virtude: 'Veracidade',
    ideiaSagrada: 'Esperança',
    infancia: 'Rejeição emocional — sentiu-se amado pelo que realizava, não pelo que era.',
    mecanismoDefesa: 'Identificação — assume o papel/imagem que cada situação espera, para não arriscar rejeição.',
    armadilha: 'Vaidade/Vanglória: "workaholic", eficiente, evita risco de fracasso; a compulsão por fazer gera Desespero (ausência de esperança).',
    forcas: 'Boa autoestima, prática, empreendedora, eficiente; reconhece limites e é verdadeira quando madura.',
    sombra: 'Confunde identidade pessoal com profissional; sente-se ameaçada quando a competência é questionada.',
    talentoAutolideranca: { nome: 'Realização', potencial: 'Foco em metas e estratégia.', desafio: 'Medir o próprio valor só pelas conquistas.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Segurança Material', comoAtua: 'Foca trabalho, patrimônio e competência; discreto, eficiente, pode negligenciar emoções e relações.' },
      { instinto: 'SO', palavraChave: 'Prestígio', comoAtua: 'Busca status e visibilidade; carismático, adaptável, pode depender de aprovação externa e perder autenticidade.' },
      { instinto: 'SX', palavraChave: 'Imagem Atrativa', comoAtua: 'Adapta-se profundamente ao outro; sedutor, flexível, pode perder identidade vivendo "personagens".' },
    ],
    asas: { tipos: [2, 4], desenvolver: 'Equilibrar desempenho com autenticidade.' },
    flechas: {
      estresse: { tipo: 9, descricao: 'Perde energia, procrastina, evita conflito.' },
      seguranca: { tipo: 6, descricao: 'Fica cooperativo, confiável, humilde.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Mobiliza a equipe para metas e resultados.', pontoAtencao: 'Prioriza desempenho acima da participação.', desenvolver: 'Valorizar processo e reconhecer contribuições.' },
      tomadaDecisao: { comoAge: 'Rápida, foco em eficiência.', pontoAtencao: 'Pode ignorar pessoas e processos.', desenvolver: 'Reservar tempo para refletir e ouvir outras perspectivas.' },
      comunicacao: { comoAge: 'Clara, objetiva, focada em resultado.', pontoAtencao: 'Pode parecer apressada ou pragmática demais.', desenvolver: 'Praticar escuta ativa antes de apresentar soluções.' },
      feedback: { comoAge: 'Foca em desempenho e evolução.', pontoAtencao: 'Sente-se ameaçado quando a competência é questionada.', desenvolver: 'Ver feedback como oportunidade, não julgamento.' },
      gestaoConflitos: { comoAge: 'Busca solução rápida para manter o resultado.', pontoAtencao: 'Minimiza o emocional, fica impaciente com conflito prolongado.', desenvolver: 'Dedicar tempo a compreender as pessoas.' },
      orientacaoResultados: { comoAge: 'Metas, desafios, alto desempenho.', pontoAtencao: 'Foca só no resultado, ignora processo e pessoas.', desenvolver: 'Valorizar como os resultados são construídos, não só o quê.' },
    },
    forcaPrincipalResultados: 'Performance',
  },

  4: {
    numero: 4,
    motivacao: 'Viver é ter emoções e sensações fortes',
    centro: 'Emocional',
    palavraSintese: 'Introversão',
    virtude: 'Equanimidade',
    ideiaSagrada: 'Origem',
    infancia: 'Abandono emocional (real ou percebido); sensação de inferioridade — "não teria sido abandonado se tivesse mais valor".',
    mecanismoDefesa: 'Introjeção — vive intensamente as emoções, inclusive as do outro; autenticidade é central; sente-se especial/diferente.',
    armadilha: 'Inveja, que nasce da comparação (o que tenho hoje vs. o que perdi vs. o que os outros têm) → Melancolia, uma "doce tristeza".',
    forcas: 'Sensível, criativo, encontra significado no cotidiano, valoriza a individualidade de cada um.',
    sombra: 'Oscila entre passado e futuro, eternamente insatisfeito; pode isolar-se quando não se sente compreendido.',
    talentoAutolideranca: { nome: 'Autenticidade', potencial: 'Sensibilidade, criatividade e significado.', desafio: 'Oscilações emocionais, sensação de não pertencimento.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Tenacidade', comoAtua: 'Suporta a dor em silêncio, resiliente, criativo; risco de se colocar em risco e viver o sofrimento como identidade.' },
      { instinto: 'SO', palavraChave: 'Vergonha', comoAtua: 'Deseja pertencer mas sente-se inadequado; sensível, introspectivo, pode vitimizar-se.' },
      { instinto: 'SX', palavraChave: 'Rivalidade', comoAtua: 'Transforma dor em intensidade; reativo, explosivo, apaixonado; pode dramatizar conflitos e oscilar entre paixão e rejeição.' },
    ],
    asas: { tipos: [3, 5], desenvolver: 'Unir sensibilidade com objetividade.' },
    flechas: {
      estresse: { tipo: 2, descricao: 'Fica dependente de aprovação, carente.' },
      seguranca: { tipo: 1, descricao: 'Ganha disciplina, objetividade, equilíbrio.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Criatividade, sensibilidade, novas perspectivas.', pontoAtencao: 'Afasta-se quando não se sente compreendido/valorizado.', desenvolver: 'Compartilhar ideias com objetividade, manter engajamento na diferença.' },
      tomadaDecisao: { comoAge: 'Baseada em valores e sentimentos.', pontoAtencao: 'Emoções do momento influenciam demais.', desenvolver: 'Equilibrar emoção e razão antes de decisões importantes.' },
      comunicacao: { comoAge: 'Profundidade, autenticidade, expressão emocional.', pontoAtencao: 'Pode ser intensa/subjetiva demais.', desenvolver: 'Adaptar a mensagem ao perfil de quem ouve.' },
      feedback: { comoAge: 'Valoriza autenticidade, sensibilidade, conexão.', pontoAtencao: 'Interpreta crítica de forma muito pessoal.', desenvolver: 'Escutar o conteúdo antes de reagir à emoção.' },
      gestaoConflitos: { comoAge: 'Conversas autênticas, entende sentimentos envolvidos.', pontoAtencao: 'Intensifica reagindo emocionalmente/pessoalizando.', desenvolver: 'Separar fatos de emoções, diálogo construtivo.' },
      orientacaoResultados: { comoAge: 'Entrega o melhor com propósito e significado.', pontoAtencao: 'Perde ritmo sem inspiração ou reconhecimento.', desenvolver: 'Disciplina para manter consistência mesmo sem motivação.' },
    },
    forcaPrincipalResultados: 'Propósito',
  },

  5: {
    numero: 5,
    motivacao: 'Viver é preservar autonomia, privacidade, independência',
    centro: 'Racional',
    palavraSintese: 'Visão macro',
    virtude: 'Liberalidade',
    ideiaSagrada: 'Onipresença / Transparência',
    infancia: 'Vazio emocional — sentiu que não foi visto, que poderia ser invadido a qualquer momento.',
    mecanismoDefesa: 'Isolamento da afeição (distância emocional/física) + Compartimentalização (separa setores da vida para ter previsibilidade).',
    armadilha: 'Mesquinhez (economia de escassez — menos envolvimento, menos bens, menos contato) → Cobiça, sobretudo intelectual.',
    forcas: 'Curioso, observador, grande autocontrole emocional, foca e se concentra, bom ouvinte quando maduro.',
    sombra: 'Desconecta-se emocionalmente, refugia-se na mente, não gosta de surpresa nem de ser invadido.',
    talentoAutolideranca: { nome: 'Clareza', potencial: 'Olhar analítico e pensamento estratégico.', desafio: 'Distanciamento excessivo.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Castelo', comoAtua: 'Cria refúgios físicos/mentais, reservado, autossuficiente; pode isolar-se demais.' },
      { instinto: 'SO', palavraChave: 'Totem', comoAtua: 'Conecta-se por temas de domínio (intelectual); pode esconder-se atrás do conhecimento e evitar intimidade real.' },
      { instinto: 'SX', palavraChave: 'Confiança', comoAtua: 'Deseja intimidade mas teme invasão; aproxima e afasta alternadamente.' },
    ],
    asas: { tipos: [4, 6], desenvolver: 'Equilibrar conhecimento com ação.' },
    flechas: {
      estresse: { tipo: 7, descricao: 'Fica disperso, impulsivo, ansioso.' },
      seguranca: { tipo: 8, descricao: 'Fica decidido, confiante, assertivo.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Agrega conhecimento, análise, soluções fundamentadas.', pontoAtencao: 'Isola-se, participa menos das discussões.', desenvolver: 'Compartilhar conhecimento e participar mais ativamente.' },
      tomadaDecisao: { comoAge: 'Analisa informações, cenários e alternativas.', pontoAtencao: 'Adia esperando ter todas as respostas.', desenvolver: 'Definir prazo, aceitar que nem tudo é previsível.' },
      comunicacao: { comoAge: 'Reservada, analítica, objetiva.', pontoAtencao: 'Transmite distanciamento, fala menos do que o necessário.', desenvolver: 'Compartilhar mais ideias e sentimentos.' },
      feedback: { comoAge: 'Prefere argumentos objetivos e fatos.', pontoAtencao: 'Pode se fechar emocionalmente durante a conversa.', desenvolver: 'Compartilhar também como percebe/sente a situação.' },
      gestaoConflitos: { comoAge: 'Analisa antes de se posicionar, discussão objetiva.', pontoAtencao: 'Afasta-se emocionalmente, evita confronto direto.', desenvolver: 'Participar das conversas importantes, expressar posição.' },
      orientacaoResultados: { comoAge: 'Via conhecimento, estratégia, análise cuidadosa.', pontoAtencao: 'Prolonga preparação, adia execução.', desenvolver: 'Transformar conhecimento em ação, avançar sem ter todas as respostas.' },
    },
    forcaPrincipalResultados: 'Estratégia',
  },

  6: {
    numero: 6,
    motivacao: 'Viver é camuflar ansiedade e insegurança',
    centro: 'Racional',
    palavraSintese: 'Prudência',
    virtude: 'Coragem',
    ideiaSagrada: 'Fé',
    infancia: 'Perdeu a confiança em uma figura que era seu esteio; desenvolveu busca por proteção (fóbico) ou rebeldia (contrafóbico) para esconder o medo.',
    mecanismoDefesa: 'Projeção — antecipa mentalmente os piores cenários para se sentir preparado; questiona motivações, sobretudo de autoridades.',
    armadilha: 'Covardia/Ousadia (fóbico foge/acovarda-se; contrafóbico lança-se contra o perigo) → Medo, que substitui a ação pelo pensamento repetitivo.',
    forcas: 'Passa segurança e confiança, questionador, fiel, comprometido, avalia riscos e potenciais.',
    sombra: 'Ansiedade, dúvida constante, desconfiança de autoridades, dificuldade de relaxar a guarda.',
    talentoAutolideranca: { nome: 'Responsabilidade', potencial: 'Atenção a riscos e compromisso.', desafio: 'Preocupação excessiva, ansiedade.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Meiguice', comoAtua: 'Desarma o ambiente com simpatia, gentil, acolhedor; pode evitar confronto e viver ansioso.' },
      { instinto: 'SO', palavraChave: 'Dever', comoAtua: 'Busca segurança via normas e responsabilidade; eficiente, pode ficar rígido e desconfiado.' },
      { instinto: 'SX', palavraChave: 'Força', comoAtua: 'Mostra-se forte para ocultar o medo; impulsivo, intenso; pode agir agressivamente e sabotar relações.' },
    ],
    asas: { tipos: [5, 7], desenvolver: 'Equilibrar prudência com confiança.' },
    flechas: {
      estresse: { tipo: 3, descricao: 'Entra em ritmo acelerado, competitivo, obcecado por desempenho.' },
      seguranca: { tipo: 9, descricao: 'Ganha calma, confiança, serenidade.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Comprometido, leal, identifica riscos e oportunidades.', pontoAtencao: 'Excessivamente cauteloso, resistente a mudanças.', desenvolver: 'Equilibrar prudência com confiança e abertura para experimentar.' },
      tomadaDecisao: { comoAge: 'Avalia riscos, consequências, planos de contingência.', pontoAtencao: 'Hesita, busca validação excessiva.', desenvolver: 'Confiar na experiência, diferenciar risco real de imaginário.' },
      comunicacao: { comoAge: 'Cuidado, questionamentos, busca por clareza.', pontoAtencao: 'Transmite insegurança/preocupação excessiva.', desenvolver: 'Comunicar ideias com mais confiança e objetividade.' },
      feedback: { comoAge: 'Busca clareza, exemplos concretos, transparência.', pontoAtencao: 'Questiona excessivamente, fica defensivo.', desenvolver: 'Ouvir até o final antes de formular a resposta.' },
      gestaoConflitos: { comoAge: 'Busca entender riscos, esclarecer dúvidas, solução segura.', pontoAtencao: 'Fica defensivo/desconfiado, prolonga em busca de certeza.', desenvolver: 'Confiar, aceitar diferentes pontos de vista, focar na solução.' },
      orientacaoResultados: { comoAge: 'Planeja, organiza, entrega com responsabilidade.', pontoAtencao: 'Perde tempo avaliando risco/revisando decisões.', desenvolver: 'Confiar mais na própria capacidade e avançar com o já planejado.' },
    },
    forcaPrincipalResultados: 'Consistência',
  },

  7: {
    numero: 7,
    motivacao: 'Viver é evitar dor, buscando prazer',
    centro: 'Racional',
    palavraSintese: 'Curiosidade',
    virtude: 'Sobriedade / Temperança',
    ideiaSagrada: 'Projeto / Trabalho / Missão',
    infancia: 'Experiência dolorosa (chegou perto de sofrimento/morte) que a personalidade "apagou dos registros", guardando só o lado bom.',
    mecanismoDefesa: 'Racionalização — foge para o mundo da imaginação, refugia-se na mente para não sentir a angústia.',
    armadilha: 'Planejamento compulsivo (plana mais do que executa, porque executar encerra o prazer) → Gula, por experiências e prazer.',
    forcas: 'Empolgante, jovial, idealista, criativo, versátil, flexível, valoriza a própria liberdade e a dos outros.',
    sombra: 'Dispersão, dificuldade de concluir, foge de temas tristes/pesados, dificuldade de assumir erros.',
    talentoAutolideranca: { nome: 'Possibilidade', potencial: 'Otimismo, criatividade, oportunidades.', desafio: 'Dificuldade com limites e rotina.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Grupinho', comoAtua: 'Cria redes e alianças para conforto; estratégico, sociável; pode manipular relações para evitar desconforto.' },
      { instinto: 'SO', palavraChave: 'Sacrifício', comoAtua: 'Parece altruísta ao abrir mão de si; idealista, generoso; pode negligenciar desejos reais e viver no imaginário.' },
      { instinto: 'SX', palavraChave: 'Fascinação', comoAtua: 'Entusiasmado, quer viver tudo intensamente; encantador; pode se iludir e perder interesse rápido.' },
    ],
    asas: { tipos: [6, 8], desenvolver: 'Unir entusiasmo com disciplina.' },
    flechas: {
      estresse: { tipo: 1, descricao: 'Fica rígido, crítico, perfeccionista, controlador.' },
      seguranca: { tipo: 5, descricao: 'Ganha foco, profundidade, reflexão.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Entusiasmo, criatividade, incentiva inovação.', pontoAtencao: 'Dispersa o grupo, perde interesse na execução.', desenvolver: 'Manter o foco até a conclusão das entregas.' },
      tomadaDecisao: { comoAge: 'Prefere opções com possibilidades e liberdade.', pontoAtencao: 'Decide por impulso, evita escolhas limitantes.', desenvolver: 'Considerar impactos de longo prazo antes de decidir.' },
      comunicacao: { comoAge: 'Entusiasmo, espontaneidade, criatividade.', pontoAtencao: 'Dispersa o foco, interrompe.', desenvolver: 'Praticar ouvir até o fim antes de responder.' },
      feedback: { comoAge: 'Prefere abordagem positiva orientada a soluções.', pontoAtencao: 'Minimiza ou evita críticas desconfortáveis.', desenvolver: 'Permanecer na conversa mesmo quando o tema é desafiador.' },
      gestaoConflitos: { comoAge: 'Prefere resolver rápido e seguir em frente.', pontoAtencao: 'Evita conversas difíceis, muda de assunto.', desenvolver: 'Permanecer presente até o conflito ser de fato resolvido.' },
      orientacaoResultados: { comoAge: 'Melhor em ambientes dinâmicos, inovadores.', pontoAtencao: 'Inicia muitos projetos, perde interesse antes de concluir.', desenvolver: 'Manter foco até finalizar antes de buscar novo desafio.' },
    },
    forcaPrincipalResultados: 'Inovação',
  },

  8: {
    numero: 8,
    motivacao: 'Viver é controlar, ser forte e sentir-se poderoso',
    centro: 'Instintivo',
    palavraSintese: 'Ímpeto',
    virtude: 'Inocência',
    ideiaSagrada: 'Verdade',
    infancia: 'Cresceu em ambiente de dureza onde força era estimulada; aprendeu que fraqueza = ser esmagado/injustiçado.',
    mecanismoDefesa: 'Negação — nega qualquer sinal de fraqueza (cansaço, doença, incapacidade), na prática um "não enxergar".',
    armadilha: 'Vingança — sente-se o "justiceiro" que repõe as coisas no lugar, de forma preventiva → Luxúria, excesso de força/energia usado para não ser atacado.',
    forcas: 'Cheio de energia, autoconfiante, decidido, realista, líder inspirador que protege, sincero e direto, combate injustiças.',
    sombra: 'Arrogância, prepotência, insensibilidade; a raiva se inflama rápido e é fácil de expressar.',
    talentoAutolideranca: { nome: 'Coragem', potencial: 'Agir com firmeza e enfrentar desafios.', desafio: 'Lidar com fragilidade/vulnerabilidade (própria e alheia).' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Satisfação', comoAtua: 'Protege/controla recursos e segurança; resistente; pode guardar raiva por muito tempo.' },
      { instinto: 'SO', palavraChave: 'Cumplicidade', comoAtua: 'Valoriza alianças e lealdade; líder, agregador; pode dividir pessoas entre aliados e inimigos.' },
      { instinto: 'SX', palavraChave: 'Possessividade', comoAtua: 'Quer intensidade total nas relações; carismático, magnético; pode controlar, ser ciumento e impulsivo.' },
    ],
    asas: { tipos: [7, 9], desenvolver: 'Equilibrar força com sensibilidade, abrir espaço para a equipe.' },
    flechas: {
      estresse: { tipo: 5, descricao: 'Isola-se, desconfia, racionaliza, evita vulnerabilidade.' },
      seguranca: { tipo: 2, descricao: 'Fica acolhedor, generoso, sensível.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Assume liderança, enfrenta desafios, impulsiona a equipe.', pontoAtencao: 'Centraliza decisões, impõe seu ritmo.', desenvolver: 'Compartilhar decisões, ouvir opiniões, fortalecer autonomia da equipe.' },
      tomadaDecisao: { comoAge: 'Direta, rápida, confiante.', pontoAtencao: 'Age antes de considerar outras perspectivas.', desenvolver: 'Ouvir opiniões diferentes antes de decidir.' },
      comunicacao: { comoAge: 'Direta, franca, assertiva.', pontoAtencao: 'Pode ser percebido como duro/intimidador.', desenvolver: 'Ajustar o tom sem perder objetividade.' },
      feedback: { comoAge: 'Direto, franco, objetivo.', pontoAtencao: 'Pode ser duro ao falar, resiste à fragilidade do outro.', desenvolver: 'Unir firmeza com empatia.' },
      gestaoConflitos: { comoAge: 'Enfrenta os problemas de forma direta e assertiva.', pontoAtencao: 'Aumenta a intensidade do confronto, domina a discussão.', desenvolver: 'Equilibrar firmeza com escuta, construir soluções em conjunto.' },
      orientacaoResultados: { comoAge: 'Determinação, rapidez, coragem para superar desafios.', pontoAtencao: 'Prioriza velocidade em detrimento de planejamento/participação.', desenvolver: 'Equilibrar ação com planejamento e colaboração.' },
    },
    forcaPrincipalResultados: 'Determinação',
  },

  9: {
    numero: 9,
    motivacao: 'Viver é esquecer dos conflitos internos e confusões externas',
    centro: 'Instintivo',
    palavraSintese: 'Tolerância',
    virtude: 'Ação Certa / Diligência',
    ideiaSagrada: 'Amor',
    infancia: 'Sentiu-se negligenciado, preterido — internalizou que o que sentia/dizia/fazia não tinha valor.',
    mecanismoDefesa: 'Narcotização — anestesia-se, desvia a atenção para o que distrai, para não entrar em contato com a própria raiva ou com o conflito.',
    armadilha: 'Comodismo/Indolência — acomoda-se no mínimo, adia decisões importantes, não sabe dizer não → Negligência/Preguiça psicológica e espiritual.',
    forcas: 'Paciente, calmo, amável, vê vários lados de uma questão, resolve e harmoniza conflitos, flexível.',
    sombra: 'Evita posicionamento, "engole sapos", tendência ao autorrebaixamento e à teimosia passiva.',
    talentoAutolideranca: { nome: 'Harmonia', potencial: 'Incluir pessoas, mediar conflitos, promover cooperação.', desafio: 'Expressar as próprias prioridades.' },
    subtipos: [
      { instinto: 'AP', palavraChave: 'Apetite', comoAtua: 'Acolhedor, tranquilo, simples, gentil, estável; pode procrastinar e anestesiar emoções.' },
      { instinto: 'SO', palavraChave: 'Participação', comoAtua: 'Conecta-se facilmente a grupos; pode esquecer prioridades pessoais em função do grupo.' },
      { instinto: 'SX', palavraChave: 'Fusão', comoAtua: 'Funde-se emocionalmente ao outro; pode perder identidade e depender emocionalmente do parceiro.' },
    ],
    asas: { tipos: [8, 1], desenvolver: 'Unir serenidade com protagonismo.' },
    flechas: {
      estresse: { tipo: 6, descricao: 'Aumenta ansiedade, preocupação, dúvida, dificuldade de decidir.' },
      seguranca: { tipo: 3, descricao: 'Ganha iniciativa, foco, produtividade, confiança.' },
    },
    competencias: {
      relacionamentoInterpessoal: { comoAge: 'Promove cooperação, equilíbrio, ambiente harmonioso.', pontoAtencao: 'Evita posicionamentos importantes.', desenvolver: 'Expressar ideias, participar das decisões mesmo com divergência.' },
      tomadaDecisao: { comoAge: 'Avalia diferentes pontos de vista, busca equilíbrio.', pontoAtencao: 'Adia decisões para evitar conflito/desagradar alguém.', desenvolver: 'Lembrar que não decidir também é uma decisão.' },
      comunicacao: { comoAge: 'Calma, diplomacia, respeito às opiniões.', pontoAtencao: 'Deixa de expressar sua verdadeira posição.', desenvolver: 'Compartilhar a opinião mesmo quando diferente da maioria.' },
      feedback: { comoAge: 'Busca preservar relacionamento e harmonia.', pontoAtencao: 'Suaviza demais o feedback, evita conversas difíceis.', desenvolver: 'Lembrar que conversas honestas também fortalecem o vínculo.' },
      gestaoConflitos: { comoAge: 'Promove entendimento, equilíbrio, harmonia do grupo.', pontoAtencao: 'Evita posicionamento, cede para impedir confronto.', desenvolver: 'Expressar opinião com tranquilidade.' },
      orientacaoResultados: { comoAge: 'Constância, cooperação, estabilidade.', pontoAtencao: 'Adia prioridades, acomoda-se em situações conhecidas.', desenvolver: 'Estabelecer metas claras, assumir protagonismo.' },
    },
    forcaPrincipalResultados: 'Perseverança',
  },
}
