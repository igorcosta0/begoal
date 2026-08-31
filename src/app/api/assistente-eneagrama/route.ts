import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { souPilotoAutoconhecimento } from '@/lib/utils'
import { TIPOS_ENEAGRAMA, NOME_INSTINTO, type Instinto } from '@/lib/eneagrama/tipos'

// Diferente de /api/sugerir-icp (que não autentica ninguém), esta rota devolve
// conteúdo pessoal — por isso PRECISA confirmar sessão, e o tipo da pessoa é
// sempre resolvido aqui no servidor a partir do user_id da sessão, nunca
// aceito vindo do corpo da requisição. A RLS de funcionarios_eneagrama
// (user_id = auth.uid()) é a segunda camada de proteção, não a única.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY não encontrada')
      return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Protótipo em teste (ago/2026): só quem está em souPilotoAutoconhecimento
    // pode usar esta rota, ninguém mais — ver lib/utils.ts.
    if (!souPilotoAutoconhecimento(user.email)) {
      return NextResponse.json({ error: 'Módulo ainda não disponível' }, { status: 403 })
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('funcionarios_eneagrama')
      .select('tipo, subtipo_sequencia')
      .eq('user_id', user.id)
      .maybeSingle()

    if (perfilError) {
      console.error('Erro ao buscar perfil de eneagrama:', perfilError)
      return NextResponse.json({ error: 'Erro ao buscar seu perfil' }, { status: 500 })
    }
    if (!perfil) {
      return NextResponse.json({ error: 'Seu perfil de Eneagrama ainda não foi mapeado' }, { status: 404 })
    }

    const tipoInfo = TIPOS_ENEAGRAMA[perfil.tipo]
    if (!tipoInfo) {
      return NextResponse.json({ error: 'Tipo de Eneagrama inválido' }, { status: 500 })
    }

    const { pergunta, historico } = await req.json() as {
      pergunta: string
      historico?: { role: 'user' | 'model'; texto: string }[]
    }
    if (!pergunta || typeof pergunta !== 'string') {
      return NextResponse.json({ error: 'Pergunta ausente' }, { status: 400 })
    }

    const systemInstruction = montarSystemInstruction(tipoInfo, perfil.subtipo_sequencia)

    const contents = [
      ...(historico ?? []).map((m) => ({ role: m.role, parts: [{ text: m.texto }] })),
      { role: 'user', parts: [{ text: pergunta }] },
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
        }),
      }
    )

    const responseText = await response.text()
    if (!response.ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${response.status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Não consegui gerar uma resposta agora. Tente novamente.'

    return NextResponse.json({ resposta })
  } catch (err) {
    console.error('Erro assistente-eneagrama:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function montarSystemInstruction(
  tipo: (typeof TIPOS_ENEAGRAMA)[number],
  subtipoSequencia: string | null
): string {
  const competenciasTexto = Object.entries(tipo.competencias)
    .map(([nome, c]) => `- ${nome}: costuma "${c.comoAge}" — ponto de atenção: ${c.pontoAtencao} — desenvolver: ${c.desenvolver}`)
    .join('\n')

  const subtiposTexto = tipo.subtipos
    .map((s) => `- ${NOME_INSTINTO[s.instinto]} ("${s.palavraChave}"): ${s.comoAtua}`)
    .join('\n')

  const sequenciaTexto = subtipoSequencia
    ? `\nSequência de instintos desta pessoa (do mais dominante ao mais reprimido): ${subtipoSequencia.split('/').map((i) => NOME_INSTINTO[i.trim() as Instinto] ?? i).join(' → ')}.`
    : ''

  return `Você é um assistente de autoconhecimento baseado no Eneagrama, usado internamente pela empresa CTZ (Programa Foco, metodologia da BeHive/Letícia Leite). Você está conversando com uma pessoa específica do time, que é Tipo ${tipo.numero} — "${tipo.motivacao}".

PERFIL DESTA PESSOA (use isso para calibrar suas respostas, mas nunca cite estes rótulos técnicos de forma fria — traduza em linguagem natural e acolhedora):
- Centro de Inteligência: ${tipo.centro}
- Palavra-síntese: ${tipo.palavraSintese}
- Mecanismo de defesa: ${tipo.mecanismoDefesa}
- Armadilha/padrão automático: ${tipo.armadilha}
- Forças (versão saudável do tipo): ${tipo.forcas}
- Sombra (o que atrapalha quando não regulado): ${tipo.sombra}
- Virtude a desenvolver: ${tipo.virtude}
- Talento de autoliderança: ${tipo.talentoAutolideranca.nome} — potencial: ${tipo.talentoAutolideranca.potencial} — desafio: ${tipo.talentoAutolideranca.desafio}

Como esse tipo costuma agir em cada competência de trabalho:
${competenciasTexto}

Os 3 subtipos possíveis deste Tipo (contexto, não afirme qual é o dela a menos que ela já tenha dito):
${subtiposTexto}
${sequenciaTexto}

REGRAS IMPORTANTES:
- Responda sempre em português do Brasil, tom próximo e prático, sem jargão de psicologia acadêmica.
- O Eneagrama é ponto de partida pra reflexão, não um rótulo fechado — nunca trate o tipo como destino ou desculpa ("você é assim porque é Tipo X"). Ajude a pessoa a se reconhecer nos padrões, sem estereotipar.
- Foque em orientação prática pro dia a dia de trabalho (comunicação, decisão, feedback, conflito, resultados) — está tudo listado acima, use como referência.
- Nunca fale sobre o tipo de outras pessoas (colegas, líderes) — você só tem acesso ao perfil de quem está te perguntando.
- Se a pergunta não tiver relação com autoconhecimento/comportamento no trabalho, responda normalmente mas breve, sem forçar conexão com Eneagrama.
- Respostas curtas e diretas (poucos parágrafos), não escreva um ensaio.`
}
