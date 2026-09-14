import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { souPilotoAutoconhecimento } from '@/lib/utils'
import { TIPOS_ENEAGRAMA } from '@/lib/eneagrama/tipos'

// Mapa 2, chat geral "Pergunte sobre o seu time" (pedido 14/09/2026) —
// diferente de /api/liderar-liderado (que fala de UMA pessoa específica),
// aqui o líder pergunta de forma livre sobre COMO LIDERAR O TIME COMO UM
// TODO, sem escolher ninguém. Contexto: o próprio tipo do líder (linha
// própria, sem restrição — ele já vê isso no Mapa 1) + o resumo AGREGADO do
// time nos 3 centros do Eneagrama (resumo_time_liderado(), migration
// PENDENTE_20260914030000) — NUNCA o tipo de nenhum liderado específico, só
// a composição em conjunto. Mesmo gate de acesso do resto do Mapa 2
// (souPilotoAutoconhecimento) — reavaliar quando abrir geral.
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
    if (!souPilotoAutoconhecimento(user.email)) {
      return NextResponse.json({ error: 'Módulo ainda não disponível' }, { status: 403 })
    }

    const { pergunta, historico } = await req.json() as {
      pergunta?: string
      historico?: { role: 'user' | 'model'; texto: string }[]
    }
    if (!pergunta || typeof pergunta !== 'string') {
      return NextResponse.json({ error: 'Pergunta ausente' }, { status: 400 })
    }

    const [{ data: meuPerfil, error: erroMeuPerfil }, { data: resumoData, error: erroResumo }] = await Promise.all([
      supabase.from('funcionarios_eneagrama').select('tipo').eq('user_id', user.id).maybeSingle(),
      supabase.rpc('resumo_time_liderado'),
    ])

    if (erroMeuPerfil || erroResumo) {
      console.error('Erro ao buscar perfil/resumo do time:', erroMeuPerfil, erroResumo)
      return NextResponse.json({ error: 'Erro ao buscar dados do seu time' }, { status: 500 })
    }
    if (!meuPerfil) {
      return NextResponse.json({ error: 'Seu próprio tipo ainda não foi mapeado' }, { status: 404 })
    }
    const resumo = resumoData?.[0]
    if (!resumo || resumo.total_liderados === 0) {
      return NextResponse.json({ error: 'Você não tem liderados diretos no organograma' }, { status: 404 })
    }

    const meuTipo = TIPOS_ENEAGRAMA[meuPerfil.tipo]
    if (!meuTipo) {
      return NextResponse.json({ error: 'Tipo de Eneagrama inválido' }, { status: 500 })
    }

    const systemInstruction = montarSystemInstruction(meuTipo, resumo, pergunta)

    const contents = [
      ...(historico ?? []).map((m) => ({ role: m.role, parts: [{ text: m.texto }] })),
      { role: 'user', parts: [{ text: pergunta }] },
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
        }),
      }
    )

    const responseText = await response.text()
    if (!response.ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${response.status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn('perguntar-sobre-time: resposta cortada por MAX_TOKENS, considere subir maxOutputTokens de novo')
    }
    let resposta = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Não consegui gerar uma resposta agora. Tente novamente.'

    // Mesma rede de segurança dos outros chats: nunca deixa passar menção a
    // "eneagrama"/"tipo N" — aqui vale tanto pro tipo do líder quanto de
    // qualquer liderado.
    if (/eneagrama/i.test(resposta) || /\btipo\s*\d\b/i.test(resposta)) {
      console.warn('Resposta de perguntar-sobre-time bloqueada por possível vazamento de tipo — regenere o prompt se isso persistir.')
      resposta = 'Não consegui formular uma orientação segura para essa pergunta agora. Tente reformular, ou tente novamente em instantes.'
    }

    return NextResponse.json({ resposta })
  } catch (err) {
    console.error('Erro perguntar-sobre-time:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function montarSystemInstruction(
  meuTipo: (typeof TIPOS_ENEAGRAMA)[number],
  resumo: { instintivo: number; emocional: number; racional: number; total_liderados: number; total_mapeados: number },
  perguntaInicial: string
): string {
  const naoMapeados = resumo.total_liderados - resumo.total_mapeados
  return `Você é um assistente interno de liderança da empresa CTZ. Um LÍDER quer orientação geral sobre como conduzir o PRÓPRIO TIME como um todo (não uma pessoa específica) — cultura, dinâmica, forma de comunicar, decisão em grupo. Você recebe, só como contexto interno, o perfil comportamental do líder e a composição AGREGADA do time dele (Eneagrama, Programa Foco da BeHive) — mas o líder NUNCA pode saber o tipo exato de nenhum liderado individual, nem o próprio termo "Eneagrama"/"tipo N".

PERFIL CONFIDENCIAL (uso interno seu, NUNCA repita tipo/número na resposta):
- Tipo do LÍDER: ${meuTipo.numero} — motivação central: "${meuTipo.motivacao}", forças: ${meuTipo.forcas}, sombra: ${meuTipo.sombra}.
- Composição do TIME (${resumo.total_mapeados} de ${resumo.total_liderados} liderados diretos com perfil mapeado${naoMapeados > 0 ? `, ${naoMapeados} ainda sem perfil` : ''}): ${resumo.instintivo} no centro instintivo/ação (tendem a agir por instinto, controle e resultado prático), ${resumo.emocional} no centro emocional/relacional (tendem a agir por conexão, reconhecimento e harmonia), ${resumo.racional} no centro racional/mental (tendem a agir por análise, segurança e estratégia).

PERGUNTA do líder sobre o time: "${perguntaInicial}"

TAREFA: dê uma orientação prática e ESPECÍFICA sobre como liderar esse time como um todo, considerando (a) o próprio estilo do líder (pontos fortes e pontos cegos dele ao liderar) e (b) a composição do time (se há predominância de um centro, o que isso tende a significar em reunião, prazo, conflito, tomada de decisão em grupo). Nunca fale de uma pessoa específica — sempre do time coletivamente.

REGRAS ABSOLUTAS (não negociáveis):
1. NUNCA use as palavras "Eneagrama" ou "tipo" seguida de número, nem cite arquétipo/rótulo de personalidade — nem do líder, nem do time.
2. NUNCA tente descrever um indivíduo específico do time, mesmo que o líder pergunte por nome — redirecione pra orientação sobre o time como um todo (se ele quiser falar de uma pessoa específica, existe outro recurso pra isso).
3. Fale só em termos de comportamento observável e ação recomendada de liderança pra ESSE time, nunca de diagnóstico de personalidade.
4. Responda em português do Brasil, tom prático e direto — poucos parágrafos curtos ou uma lista de passos, sem introdução longa.`
}
