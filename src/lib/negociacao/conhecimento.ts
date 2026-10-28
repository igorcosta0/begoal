// Base do assistente de negociação que só entra nos prompts (rota
// /api/assistente-negociacao). Resumo do e-book, do Raio-X dos 9 tipos, do
// roteiro e do checklist do observador do material "Eneagrama e Comercial"
// (Letícia Leite · BeHive). Os ICPs e os casos ficam em `casos.ts`.
// Pedido do Igor (28/10/2026): o assistente nunca revela, insinua ou comenta
// tipos. Por isso os prompts não levam número de tipo, centro nem a palavra
// "Eneagrama": cada perfil entra só pelo critério ("olha para segurança"), e
// `semMencaoATipo` limpa a resposta se mesmo assim escapar.

import type { IcpId } from './casos'

interface IcpDetalhe {
  pesaNaDecisao: string[]
  medos: string[]
  ctzPrecisaMostrar: string[]
  pontoCritico?: string
  perguntaInvestigar: string
}

export const ICP_DETALHE: Record<IcpId, IcpDetalhe> = {
  empresas: {
    pesaNaDecisao: ['Competência técnica comprovada', 'Histórico de aprovações', 'Cumprimento de prazo', 'Integração projeto + execução'],
    medos: ['Atraso em aprovação', 'Erro de projeto que vira custo na obra', 'Fornecedor que promete e não entrega'],
    ctzPrecisaMostrar: ['Método', 'Cases', 'Cronograma realista', 'Clareza de responsabilidades'],
    perguntaInvestigar: 'O que fez um projeto anterior dar errado para vocês?',
  },
  familias: {
    pesaNaDecisao: ['Confiança na CTZ', 'Transparência do modelo', 'Segurança jurídica', 'Retorno sobre o valor da terra', 'Preservação do legado'],
    medos: ['Ser lesada', 'Decidir errado sobre algo que é de todos', 'Conflito entre herdeiros'],
    ctzPrecisaMostrar: ['Modelo explicado com simplicidade', 'Relacionamento de longo prazo', 'Paciência com o tempo de decisão'],
    pontoCritico: 'A decisão costuma ser coletiva: quem senta à mesa nem sempre é quem decide, e cada membro pode ter um critério diferente.',
    perguntaInvestigar: 'O que essa terra representa para a família — e quem precisa estar confortável para avançar?',
  },
  corretores: {
    pesaNaDecisao: ['Agilidade na resposta', 'Critérios claros do que interessa à CTZ', 'Segurança de ser remunerado e reconhecido', 'Recorrência de negócios'],
    medos: ['Ser "pulado" na negociação', 'Demora na análise', 'Esforço sem retorno'],
    ctzPrecisaMostrar: ['Regras claras de parceria', 'Retorno rápido, mesmo quando é "não"', 'Previsibilidade'],
    pontoCritico: 'O corretor é parceiro, não cliente final: a negociação é contínua, não pontual.',
    perguntaInvestigar: 'O que faria você trazer suas melhores áreas primeiro para a CTZ?',
  },
  investidores: {
    pesaNaDecisao: ['Retorno projetado', 'Garantias', 'Histórico de entregas', 'Prazo e liquidez', 'Governança e prestação de contas'],
    medos: ['Atraso de obra', 'Lotes que não vendem', 'Falta de informação durante o investimento', 'Perda de capital'],
    ctzPrecisaMostrar: ['Números consistentes', 'Cenários, inclusive o pessimista', 'Relatórios periódicos', 'Histórico'],
    perguntaInvestigar: 'Qual risco precisa estar resolvido para você se sentir seguro em investir?',
  },
}

// Motivos de não fechamento levantados pelo marketing em cada unidade.
export const OBJECOES = [
  { unidade: 'CTZ Novos Negócios', objecao: 'Não há portfólio em andamento', porTras: 'Necessidade de segurança e de evidências', pergunta: 'O que você precisaria ver para se sentir seguro?' },
  { unidade: 'CTZ Novos Negócios', objecao: 'Não querem permutar 100% (pedem aporte inicial)', porTras: 'Controle e garantia sobre o próprio patrimônio', pergunta: 'O que é inegociável para você — e onde existe espaço?' },
  { unidade: 'CTZ Lançamentos', objecao: 'Período de eleição', porTras: 'Adiamento ou medo do risco', pergunta: 'O que precisa estar claro para decidir agora?' },
  { unidade: 'CTZ Lançamentos', objecao: 'Abordagem em momento político (insegurança de investidores)', porTras: 'Falta de compreensão dos números', pergunta: 'Qual informação será fundamental para sua decisão?' },
  { unidade: 'Concretize', objecao: 'Preço', porTras: 'Valor percebido em resultado', pergunta: 'O que será considerado sucesso para você?' },
  { unidade: 'Concretize', objecao: 'Geografia e trato com os órgãos', porTras: 'Critério e segurança na aprovação', pergunta: 'O que você considera adequado para decidir?' },
]

interface TipoNegociacao {
  centro: 'Instintivo' | 'Emocional' | 'Mental'
  olhaPara: string
  perguntaCriterio: string
  alerta: string
  move: string
  buscaPor: string
  perguntaInterna: string
  pistas: string[]
  favorece: string
  geraResistencia: string
  comoAbordar: string
  evite: string
  fiqueAtento: string
  chaveDeOuro: string
  puloDoGato: string
  comoAdaptarNoIcp: string
  // Para quem negocia e é deste tipo (Eu × Outro).
  perguntaDoAutomatico: string
  seEsteEOSeuTipo: string
}

export const TIPOS_NEGOCIACAO: Record<number, TipoNegociacao> = {
  8: {
    centro: 'Instintivo',
    olhaPara: 'autonomia e controle',
    perguntaCriterio: 'Isso preserva minha autonomia e me permite manter o controle sobre o que é importante?',
    alerta: 'Não precisa diminuir sua força para negociar melhor. Precisa usar a força sem transformar a negociação em disputa.',
    move: 'Manter a autonomia, proteger o que considera importante e ter força para enfrentar a realidade.',
    buscaPor: 'Autonomia, força, verdade, proteção',
    perguntaInterna: 'O que precisa ser feito para que eu mantenha o controle da situação?',
    pistas: ['Comunicação direta e objetiva', 'Assume a condução da conversa', 'Reage forte a tentativas de controle'],
    favorece: 'Clareza, firmeza e autoridade, objetividade, coragem, autonomia, decisão rápida',
    geraResistencia: 'Manipulação, jogos indiretos, fragilidade percebida, tentativa de controle, falta de posicionamento, pressão excessiva',
    comoAbordar: 'Seja direto; sustente sua posição; seja claro sobre limites; não fuja dos temas difíceis; respeite a autonomia do cliente; negocie sem transformar diferença em confronto.',
    evite: 'Disputar poder; usar pressão para obter adesão; responder intensidade com intensidade; interpretar discordância como ataque pessoal; tentar controlar a decisão do cliente.',
    fiqueAtento: 'Provoca para testar a força e a firmeza do interlocutor ("O que faz você acreditar que...?"). Se o negociador mostrar que ficou intimidado, cai no conceito dele.',
    chaveDeOuro: 'Seja firme sem transformar firmeza em confronto. Nem toda resistência precisa ser vencida; algumas precisam ser compreendidas.',
    puloDoGato: 'O que é realmente inegociável para esse cliente? Onde existe espaço para flexibilidade?',
    comoAdaptarNoIcp: 'Seja direto, sustente sua posição e respeite a autonomia da família sobre a terra.',
    perguntaDoAutomatico: 'Estou sendo firme ou tentando controlar?',
    seEsteEOSeuTipo: 'Dosar a energia nas suas ações.',
  },
  9: {
    centro: 'Instintivo',
    olhaPara: 'harmonia',
    perguntaCriterio: 'Isso funciona para todos sem criar conflito desnecessário?',
    alerta: 'Pressionar pode produzir o efeito contrário.',
    move: 'Manter a harmonia, a estabilidade e a conexão com aquilo que considera importante.',
    buscaPor: 'Harmonia, estabilidade, conexão, tranquilidade',
    perguntaInterna: 'Como podemos fazer isso funcionar para todos?',
    pistas: ['Busca entender todos os lados', 'Evita confrontos diretos', 'Demora a explicitar a própria posição'],
    favorece: 'Escuta, construção de confiança, cooperação, conciliação de interesses, paciência, relacionamento de longo prazo, ambiente estável',
    geraResistencia: 'Pressão excessiva, confronto desnecessário, urgência artificial, tentativa de impor uma decisão, mudanças bruscas, ambiente competitivo, sensação de ser pressionado a se posicionar',
    comoAbordar: 'Crie um ambiente respeitoso; dê espaço para o cliente se posicionar; explore os diferentes interesses envolvidos; faça perguntas diretas sem transformar a conversa em confronto; ajude o cliente a identificar as prioridades dele.',
    evite: 'Interpretar silêncio como concordância; pressionar por uma decisão imediata; fazer concessões desnecessárias para preservar a relação; deixar questões importantes indefinidas; confundir cordialidade com compromisso.',
    fiqueAtento: 'Tem dificuldade de decidir e deixa para depois; costuma decidir em cima da hora. Ajude a criar o momento em que a decisão não possa mais ser adiada, sem pressionar (pressão faz efeito contrário).',
    chaveDeOuro: 'Crie espaço para o cliente se posicionar e confirme se o acordo realmente representa o que ele quer.',
    puloDoGato: 'O que é realmente importante para esse cliente — e ele está conseguindo dizer isso?',
    comoAdaptarNoIcp: 'Dê espaço para cada um se posicionar; não interprete silêncio como concordância.',
    perguntaDoAutomatico: 'Estou preservando a harmonia ou evitando o desconforto de me posicionar?',
    seEsteEOSeuTipo: 'Contrariar a "tendência de concórdia" pode ser exigente, mas é essencial para negociar.',
  },
  1: {
    centro: 'Instintivo',
    olhaPara: 'critério e funcionalidade',
    perguntaCriterio: 'Isso está correto e tem utilidade?',
    alerta: 'Padrões acima do que o cliente necessita ou está disposto a pagar podem dificultar a decisão.',
    move: 'Fazer o que considera certo, correto e adequado.',
    buscaPor: 'Integridade, coerência, qualidade, melhoria',
    perguntaInterna: 'Como isso deveria ser?',
    pistas: ['Perguntas sobre processos, padrões ou garantias', 'Identifica rápido inconsistências', 'Aponta o que precisa ser corrigido'],
    favorece: 'Clareza, qualidade, coerência, profissionalismo, critérios consistentes, informações confiáveis',
    geraResistencia: 'Improviso, informação inconsistente, promessas sem sustentação, erros evitáveis, falta de clareza, argumentos frágeis',
    comoAbordar: 'Abordagem cautelosa e planejada; seja objetivo; apresente critérios; mostre que existe lógica na proposta; seja coerente.',
    evite: 'Improvisar; minimizar erros; combinar o que não pode cumprir; entrar em disputa sobre quem está certo; atrasos.',
    fiqueAtento: 'Difícil de negociar: insiste nos próprios pontos de vista. Se o negociador passar no teste, constrói uma relação de fidelidade e outros negócios vêm.',
    chaveDeOuro: 'Mostre que a proposta não é apenas boa: mostre por que ela é consistente, confiável e faz sentido.',
    puloDoGato: 'O que esse cliente considera "certo" ou "adequado" para tomar uma decisão?',
    comoAdaptarNoIcp: 'Apresente critérios técnicos e a lógica da proposta; não improvise prazos.',
    perguntaDoAutomatico: 'Estou defendendo um critério ou impondo uma preferência?',
    seEsteEOSeuTipo: 'Exercitar a flexibilidade.',
  },
  2: {
    centro: 'Emocional',
    olhaPara: 'conexão, necessidades e vínculos',
    perguntaCriterio: 'Isso fortalece o vínculo e considera o que é importante para mim e para o outro?',
    alerta: 'Simpatia e receptividade não significam necessariamente "sim".',
    move: 'Sentir-se necessário, querido e importante para o outro.',
    buscaPor: 'Conexão, reconhecimento, importância, vínculo',
    perguntaInterna: 'Do que essa pessoa precisa?',
    pistas: ['Interesse pela pessoa, além do negócio', 'Linguagem de parceria, cuidado e confiança', 'Disponibilidade para ajudar'],
    favorece: 'Proximidade, confiança, atenção às necessidades, parceria, disponibilidade, percepção de valor',
    geraResistencia: 'Abordagem fria, excesso de objetividade, relação excessivamente transacional, falta de escuta, ignorar necessidades percebidas, distanciamento',
    comoAbordar: 'Demonstre interesse genuíno; escute antes de oferecer; construa parceria; reconheça a importância da relação; mostre como a solução contribui para o que é importante para o cliente.',
    evite: 'Criar intimidade artificial; prometer para agradar; fazer concessões para manter o vínculo; assumir para si a responsabilidade pelo problema do cliente.',
    fiqueAtento: 'Também se preocupa com dinheiro (recursos são oportunidade de "comprar" atenção e afeto). Receptividade não é "sim": tem dificuldade de dizer "não" e pode deixar o negociador em banho-maria.',
    chaveDeOuro: 'Faça o cliente sentir que você está verdadeiramente interessado em ajudá-lo, sem assumir para si a responsabilidade de resolver tudo por ele.',
    puloDoGato: 'O que é realmente importante para esse cliente — e como minha solução pode contribuir para isso?',
    comoAdaptarNoIcp: 'Construa parceria e reconheça a importância da relação, sem prometer para agradar.',
    perguntaDoAutomatico: 'Estou ajudando ou tentando me tornar indispensável?',
    seEsteEOSeuTipo: 'Nem todo cliente se sente confortável com proximidade; alguns preferem que a negociação se baseie no raciocínio e no produto.',
  },
  3: {
    centro: 'Emocional',
    olhaPara: 'resultado',
    perguntaCriterio: 'Isso funciona e me leva ao resultado que quero?',
    alerta: 'A busca por venda de curto prazo pode comprometer relações futuras.',
    move: 'Sentir-se valioso por meio da realização e dos resultados.',
    buscaPor: 'Realização, valor, reconhecimento, sucesso',
    perguntaInterna: 'O que precisa ser feito para alcançar o resultado?',
    pistas: ['Foco rápido em objetivos e resultados', 'Pergunta sobre prazo, retorno e indicadores', 'Ritmo acelerado de decisão'],
    favorece: 'Objetividade, resultados, performance, agilidade, persuasão, eficiência, foco em oportunidades',
    geraResistencia: 'Conversa sem propósito, lentidão, baixo retorno percebido, excesso de detalhes sem aplicação, sensação de perda de tempo, ameaça à imagem ou à competência',
    comoAbordar: 'Vá ao ponto; mostre resultados e benefícios; use indicadores quando forem relevantes; conecte a solução ao objetivo do cliente; reconheça conquistas e prioridades.',
    evite: 'Falar sem propósito; apresentar solução sem mostrar benefício; excesso de teoria; transformar a conversa em competição; pressionar o cliente para provar competência.',
    fiqueAtento: 'Tem os olhos no futuro, onde está o sucesso. Vai avaliar o sucesso que ele, pessoalmente, pode obter com o negócio.',
    chaveDeOuro: 'Mostre o resultado, mas descubra primeiro o que realmente significa "sucesso" para esse cliente.',
    puloDoGato: 'O que será considerado "sucesso" por esse cliente? Qual resultado realmente fará diferença para ele?',
    comoAdaptarNoIcp: 'Vá ao ponto: mostre agilidade, retorno e o que já deu certo.',
    perguntaDoAutomatico: 'Estou buscando o resultado ou tentando provar meu valor?',
    seEsteEOSeuTipo: 'Priorizar a venda de curto prazo pode destruir o esforço comercial; o que parece perda de tempo às vezes constrói relações para negócios de longo prazo.',
  },
  4: {
    centro: 'Emocional',
    olhaPara: 'significado e originalidade',
    perguntaCriterio: 'Isso tem significado e é verdadeiro para mim?',
    alerta: 'A conexão emocional pode não bastar para clientes que valorizam mais informação e lógica.',
    move: 'Sentir-se autêntico, singular e conectado ao que tem significado.',
    buscaPor: 'Autenticidade, significado, identidade, singularidade',
    perguntaInterna: 'O que é verdadeiramente meu?',
    pistas: ['Questiona soluções padronizadas', 'Usa referências pessoais para decidir', 'Percebe quando algo soa artificial'],
    favorece: 'Autenticidade, diferenciação, personalização, experiência, significado, percepção de necessidades não verbalizadas',
    geraResistencia: 'Abordagem genérica, soluções padronizadas sem contexto, artificialidade, "isso serve para todo mundo", superficialidade, falta de personalização',
    comoAbordar: 'Seja genuíno; personalize quando isso realmente agregar valor; explore o contexto do cliente; mostre diferenciais relevantes; descubra o que dá significado à decisão.',
    evite: 'Criar diferenciação artificial; forçar comparações; superficialidade; criar uma necessidade só para tornar a solução especial.',
    fiqueAtento: 'Altamente crítico e detalhista; aponta o que "falta" no projeto (mostre que não falta, ou que a lacuna será preenchida na execução). Raramente decide nas primeiras reuniões, mas, quando se apaixona pelo produto, faz tudo para concretizar.',
    chaveDeOuro: 'Não venda apenas uma solução diferente: mostre por que ela faz sentido para aquela pessoa.',
    puloDoGato: 'O que precisa ser significativo para esse cliente? O que torna essa solução relevante para ele, e não apenas diferente?',
    comoAdaptarNoIcp: 'Explore o contexto e o que dá significado à decisão; personalize só quando agrega valor.',
    perguntaDoAutomatico: 'Estou percebendo o que realmente importa ou ampliando o que está faltando?',
    seEsteEOSeuTipo: 'Deixar as emoções e o humor influenciarem a negociação pode destruir o esforço comercial.',
  },
  5: {
    centro: 'Mental',
    olhaPara: 'conhecimento e compreensão',
    perguntaCriterio: 'Eu tenho conhecimento e compreendi o suficiente para decidir?',
    alerta: 'Detalhes técnicos, isoladamente, não são a maior arma de venda.',
    move: 'Compreender, dominar e preservar os recursos necessários para lidar com a realidade.',
    buscaPor: 'Compreensão, competência, autonomia, conhecimento',
    perguntaInterna: 'O que eu preciso saber para conseguir lidar com isso?',
    pistas: ['Pergunta como as coisas funcionam', 'Pede tempo para analisar', 'Questiona argumentos superficiais'],
    favorece: 'Conhecimento, dados relevantes, abordagem estruturada, profundidade, competência técnica, autonomia',
    geraResistencia: 'Pressão para decidir rápido, informações superficiais, argumentos vagos, excesso emocional, invasão de espaço, falta de domínio do assunto',
    comoAbordar: 'Seja objetivo; apresente informações relevantes; demonstre domínio; respeite o tempo de análise; preserve a autonomia do cliente; ajude-o a identificar quais informações são decisivas.',
    evite: 'Pressionar por uma decisão; usar informação só para impressionar; sobrecarregar com dados irrelevantes; usar persuasão emocional; detalhes técnicos sem relação com a decisão.',
    fiqueAtento: 'Quanto mais informação sobre a empresa e o produto, melhor. Prefere negócios que não exijam grande envolvimento pessoal. Seja breve e não espere efusão no primeiro encontro: é sozinho que ele se encanta com o produto.',
    chaveDeOuro: 'Dê segurança para o cliente compreender sem tirar dele a autonomia de decidir.',
    puloDoGato: 'O que você precisa compreender para se sentir seguro para avançar? Qual informação será realmente fundamental para sua decisão?',
    comoAdaptarNoIcp: 'Leve dados relevantes e respeite o tempo de análise; ajude a separar o que é decisivo.',
    perguntaDoAutomatico: 'Estou buscando a informação necessária ou usando o conhecimento para adiar a ação?',
    seEsteEOSeuTipo: 'Linguagem corporal fechada não favorece a abertura do cliente; invista em perceber emoções, motivações e comportamentos, não só em detalhes técnicos.',
  },
  6: {
    centro: 'Mental',
    olhaPara: 'segurança',
    perguntaCriterio: 'Posso confiar nisso? O que pode dar errado?',
    alerta: 'Ponto principal: transparência e ausência de pontos obscuros na proposta.',
    move: 'Sentir-se seguro para lidar com o que pode acontecer.',
    buscaPor: 'Segurança, previsibilidade, confiabilidade',
    perguntaInterna: 'E se alguma coisa der errado?',
    pistas: ['Pergunta sobre riscos e cenários', 'Pede referências, garantias e evidências', 'Ouve outras pessoas antes de decidir'],
    favorece: 'Confiança, segurança, clareza, evidências, referências, previsibilidade, responsabilidade',
    geraResistencia: 'Promessas vagas, informações incompletas, pressão para decidir, mudanças sem explicação, "confie em mim" sem sustentação (antecipar o que pode dar errado neutraliza argumentos de venda)',
    comoAbordar: 'Seja transparente; antecipe dúvidas; apresente evidências; explique responsabilidades e próximos passos; cumpra o que foi combinado.',
    evite: 'Pressão; promessas de certeza absoluta; minimizar riscos reais; demonstrar irritação diante das perguntas; mudar condições sem explicar; tomar questionamentos como falta de confiança pessoal.',
    fiqueAtento: 'Avalia antes todas as possibilidades negativas ("E se esse projeto não der certo?"): seja o advogado do diabo da sua própria proposta antes de apresentá-la. Tende a protelar com medo de errar.',
    chaveDeOuro: 'Construa confiança com consistência, não com promessas de certeza.',
    puloDoGato: 'Qual é o principal risco que você está tentando evitar? O que precisa estar claro para que essa decisão seja segura para você?',
    comoAdaptarNoIcp: 'Seja transparente, antecipe dúvidas e mostre evidências, inclusive o cenário pessimista.',
    perguntaDoAutomatico: 'Estou avaliando um risco real ou tentando eliminar toda a incerteza?',
    seEsteEOSeuTipo: 'A dúvida do cliente não é necessariamente uma objeção a vencer; pode ser informação sobre o que ele precisa para decidir. Investigue o critério por trás dela.',
  },
  7: {
    centro: 'Mental',
    olhaPara: 'possibilidades',
    perguntaCriterio: 'O que mais é possível?',
    alerta: 'O entusiasmo inicial não significa, necessariamente, fechamento do negócio.',
    move: 'Manter abertas as possibilidades e buscar uma experiência estimulante e satisfatória.',
    buscaPor: 'Liberdade, possibilidades, variedade, satisfação',
    perguntaInterna: 'O que mais é possível?',
    pistas: ['Gera muitas ideias e alternativas', 'Fala do futuro e do que é possível', 'Muda de assunto com facilidade'],
    favorece: 'Entusiasmo, abordagem envolvente, otimismo, alternativas, inovação, flexibilidade',
    geraResistencia: 'Excesso de limitações, repetição, conversas restritivas, ausência de possibilidades, foco excessivo nos problemas, burocracia',
    comoAbordar: 'Abra possibilidades; mostre oportunidades; apresente alternativas relevantes; conecte a solução ao futuro; ajude a priorizar; transforme entusiasmo em próximos passos concretos.',
    evite: 'Apresentar opções demais; fazer promessas sem verificar a viabilidade; usar entusiasmo para esconder limitações; pular etapas importantes; encerrar sem definir uma escolha ou próximo passo.',
    fiqueAtento: 'Gosta de associar prazer e trabalho; assuntos variados desviam do principal. Objetive a conversa, mas torne a negociação prazerosa.',
    chaveDeOuro: 'Abra possibilidades, mas ajude o cliente a escolher, priorizar e transformar possibilidade em realidade.',
    puloDoGato: 'Qual dessas possibilidades faz mais sentido para você? O que seria necessário para transformar essa possibilidade em realidade?',
    comoAdaptarNoIcp: 'Abra possibilidades, mas ajude a priorizar e a transformar entusiasmo em próximo passo.',
    perguntaDoAutomatico: 'Estou ampliando possibilidades ou evitando escolher?',
    seEsteEOSeuTipo: 'Opções demais também podem dificultar a decisão.',
  },
}

export const ROTEIRO_NEGOCIADOR = `ROTEIRO DO NEGOCIADOR (sete passos; antes de entrar, anote o critério provável do cliente, a necessidade do ICP, a primeira pergunta e o que vai evitar):
1. Abra: crie o ambiente que essa pessoa precisa; antes de apresentar, mostre que quer entender. "Antes de falar da proposta, quero entender o que é importante para você nessa decisão."
2. Observe: linguagem, prioridades, o que a pessoa enfatiza ou evita e como reage à pressão. "Que pistas confirmam (ou não) o que eu esperava?"
3. Pergunte: use o pulo do gato do critério; pergunte antes de argumentar. "O que precisa estar claro para essa decisão fazer sentido para você?"
4. Escute: não rebata; a objeção é informação sobre o que a pessoa precisa para decidir. "Me conta mais sobre isso."
5. Confirme: devolva o que entendeu antes de propor. "Se eu entendi bem, o que mais pesa para você é... É isso?"
6. Adapte: conecte a proposta ao critério da pessoa e à necessidade do ICP; evite o que gera resistência e não prometa o que a CTZ não pode cumprir. "Pensando no que você me disse, o que faz mais sentido é..."
7. Feche: transforme a conversa em um próximo passo concreto e combinado. "Qual seria o próximo passo que faz sentido para você?"
Se a conversa travar: "Estou respondendo ao que o outro realmente precisa, ou ao que eu acredito que ele precisa?"`

export const CHECKLIST_OBSERVADOR = `CHECKLIST DO OBSERVADOR (registre fatos: frases e comportamentos, não opiniões; cada item é SIM, EM PARTE ou NÃO):
1. A sequência (observe, pergunte, escute, confirme, adapte): observou as pistas antes de apresentar a proposta; perguntou antes de argumentar; escutou sem interromper ou rebater; confirmou o que entendeu ("Se eu entendi bem..."); mudou a abordagem a partir do que ouviu.
2. O critério do cliente (a conversa falou com o que orienta a decisão dele?): usou argumentos ligados a esse critério; evitou o que gera resistência nele; fez a pergunta do pulo do gato, ou uma parecida; o cliente deu sinais de abertura ao longo da conversa.
3. A necessidade do ICP: identificou a necessidade de negócio do ICP; tratou a objeção como informação, não como ataque; não prometeu o que a CTZ não pode cumprir; fechou com um próximo passo concreto.
4. O automático do negociador (quando a conversa travou, o que ele fez?): insistiu, acelerou, explicou demais, cedeu rápido, recuou, confrontou, mudou de assunto, prometeu para agradar.
Registros: pistas do cliente (frases ou comportamentos que mostraram o que pesava para ele); o momento que mudou a conversa (quando avançou ou travou, e por quê); uma sugestão para o negociador.`

export const PRINCIPIOS = `PRINCÍPIOS DO MATERIAL (valem sempre):
- Pistas são hipóteses, não rótulos: uma pista isolada não diz nada; observe o padrão e confirme perguntando.
- Não tente classificar a pessoa; tente compreender o que pode estar orientando a decisão dela.
- Adaptar não é manipular: é compreender qual critério dá sentido à decisão daquela pessoa e conversar com esse critério.
- O jeito de quem negocia continua dele; o ponto é perceber quando o automático assume o volante e recuperar a escolha.
- O ICP diz qual é a necessidade do negócio; o critério diz como cada pessoa decide dentro dele. Três perguntas: qual é a necessidade do ICP? qual critério a pessoa mostra? como conecto os dois?
- Por trás de cada objeção existe uma necessidade e um critério: antes de rebater, investigue.
- Compreender não significa concordar.`

// Regra que entra em todos os prompts do assistente.
export const SIGILO_TIPOS = `REGRA ABSOLUTA — SEM TIPOS:
- Nunca revele, cite, insinue ou comente tipos de personalidade: nada de "tipo", "perfil", "eneatipo", números de tipo, "centro instintivo/emocional/mental", "asa", nem a palavra Eneagrama. Isso vale para o cliente, para quem negocia e para qualquer outra pessoa.
- Não classifique ninguém nem use frases como "pessoas como ele", "esse perfil costuma", "o seu jeito de ser". Fale só do que a pessoa disse ou fez e do que isso sugere que ela precisa para decidir.
- O conhecimento abaixo é só para você pensar; nunca mostre a origem dele.
- Se perguntarem qual é o tipo de alguém (do cliente, de um colega ou o próprio), o que é um tipo, ou pedirem para "adivinhar o perfil", responda numa frase que este assistente não trabalha com tipos e volte para o que o cliente disse, fez e precisa.`

// Sem número nem centro: o perfil entra pelo critério (ver o topo do arquivo).
export function textoCriterio(n: number): string {
  const t = TIPOS_NEGOCIACAO[n]
  if (!t) return ''
  return `CRITÉRIO: ${t.olhaPara.toUpperCase()}. Pergunta de critério: "${t.perguntaCriterio}"
- Alerta: ${t.alerta}
- O que move: ${t.move} Busca por: ${t.buscaPor}. Pergunta interna: "${t.perguntaInterna}"
- Pistas na conversa: ${t.pistas.join('; ')}
- Pode favorecer: ${t.favorece}
- Pode gerar resistência: ${t.geraResistencia}
- Como abordar: ${t.comoAbordar}
- Evite: ${t.evite}
- Fique atento: ${t.fiqueAtento}
- Chave de ouro: ${t.chaveDeOuro}
- Pulo do gato: ${t.puloDoGato}
- Como adaptar dentro do ICP: ${t.comoAdaptarNoIcp}`
}

export function textoTodosOsCriterios(): string {
  return [8, 9, 1, 2, 3, 4, 5, 6, 7].map(textoCriterio).join('\n\n')
}

// Perfil de cada caso do laboratório (fica fora de `casos.ts`, que vai para o
// navegador).
export const PERFIL_DO_CASO: Record<number, number> = { 1: 6, 2: 8, 3: 2, 4: 7, 5: 9, 6: 5, 7: 3, 8: 1 }

// Rede de segurança: tira da resposta as frases que mencionam tipo/Eneagrama.
const MENCAO_A_TIPO = [
  /eneagrama|eneatipo/i,
  /\btipos?\s*(?:n[º°o.]\s*)?(?:[1-9]\b|um\b|dois\b|tr[eê]s\b|quatro\b|cinco\b|seis\b|sete\b|oito\b|nove\b)/i,
  /\bcentros?\s+(?:instintivo|emocional|mental)/i,
  /\basa\s*[1-9]\b/i,
]

export function semMencaoATipo(texto: string): string {
  const menciona = (trecho: string) => MENCAO_A_TIPO.some((r) => r.test(trecho))
  if (!menciona(texto)) return texto
  return texto
    .split('\n')
    .map((linha) => (menciona(linha) ? linha.split(/(?<=[.!?])\s+/).filter((f) => !menciona(f)).join(' ') : linha))
    .filter((linha, i, linhas) => linha.trim() || (i > 0 && linhas[i - 1].trim()))
    .join('\n')
}

export function textoObjecoes(): string {
  return OBJECOES.map((o) => `- ${o.unidade}: "${o.objecao}" → pode estar por trás: ${o.porTras} → pergunta: "${o.pergunta}"`).join('\n')
}
