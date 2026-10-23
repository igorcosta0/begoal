import { NextRequest, NextResponse } from 'next/server'
import { chamarGemini } from '@/lib/gemini'
import { erroInterno, validarTexto } from '@/lib/apiIa'
import { createClient } from '@/lib/supabase/server'

// Guia do módulo de Pesquisa (Miro, 23/10/2026), F18: a IA ajuda a montar a
// pesquisa. Recebe o objetivo escrito pelo administrador e devolve perguntas
// só nos tipos que o guia permite. A pessoa revisa e escolhe o que entra.

export const maxDuration = 60

const TIPOS = ['escala_0_10', 'nps', 'texto', 'multipla', 'multipla_varias'] as const
type Tipo = (typeof TIPOS)[number]

const MAX_PERGUNTAS = 8

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

    const body = await req.json()
    const objetivo = validarTexto(body?.objetivo, 'Objetivo')
    if ('erro' in objetivo) return objetivo.erro
    const publico = body?.publico === 'interna' ? 'funcionários da empresa (respostas anônimas)' : 'clientes da empresa'
    const empresa = typeof body?.empresa === 'string' ? body.empresa.slice(0, 100) : 'a empresa'
    const existentes = Array.isArray(body?.existentes)
      ? body.existentes.filter((e: unknown) => typeof e === 'string').slice(0, 40).map((e: string) => e.slice(0, 300))
      : []

    const prompt = `Você ajuda uma pessoa que nunca montou uma pesquisa a criar uma pesquisa curta e bem feita.

EMPRESA: ${empresa}
QUEM VAI RESPONDER: ${publico}
OBJETIVO DA PESQUISA (escrito pela pessoa): ${objetivo.texto}
${existentes.length ? `PERGUNTAS QUE JÁ ESTÃO NA PESQUISA (não repita nem reescreva estas):\n- ${existentes.join('\n- ')}` : ''}

Sugira de 4 a ${MAX_PERGUNTAS} perguntas novas que ajudem a atingir o objetivo. Regras:
- Use SOMENTE estes tipos:
  "escala_0_10" (nota de 0 a 10; comece o enunciado com "De 0 a 10, quanto..."),
  "nps" (só para a pergunta de recomendação; no máximo uma),
  "texto" (resposta aberta),
  "multipla" (escolhe uma opção; de 2 a 6 opções),
  "multipla_varias" (escolhe várias opções; de 3 a 7 opções).
- Linguagem simples, direta, em português do Brasil. Uma ideia por pergunta. Sem jargão.
- Prefira escala_0_10 para medir; termine com no máximo duas perguntas abertas.
- "opcoes" só existe nos tipos de múltipla escolha; nos outros, use [].

Responda APENAS com JSON válido, sem markdown, no formato:
{"perguntas":[{"tipo":"escala_0_10","enunciado":"...","opcoes":[]}]}`

    const { ok, status, text: responseText } = await chamarGemini(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    })

    if (!ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: status === 429 ? 'A IA atingiu o limite de uso. Tente de novo mais tarde.' : `Erro Gemini: ${status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn('pesquisa-sugerir-perguntas: resposta cortada por MAX_TOKENS')
    }
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const bruto = JSON.parse(texto.replace(/```json|```/g, '').trim())

    // A saída do modelo também é conferida: tipo permitido, enunciado e opções no tamanho certo.
    const perguntas = (Array.isArray(bruto?.perguntas) ? bruto.perguntas : [])
      .map((q: any) => {
        const tipo = TIPOS.includes(q?.tipo) ? (q.tipo as Tipo) : null
        const enunciado = typeof q?.enunciado === 'string' ? q.enunciado.trim().slice(0, 300) : ''
        if (!tipo || !enunciado) return null
        const comOpcoes = tipo === 'multipla' || tipo === 'multipla_varias'
        const opcoes: string[] = comOpcoes && Array.isArray(q.opcoes)
          ? Array.from(new Set<string>(q.opcoes.filter((o: unknown) => typeof o === 'string').map((o: string) => o.trim().slice(0, 120)).filter(Boolean))).slice(0, 8)
          : []
        if (comOpcoes && opcoes.length < 2) return null
        return { tipo, enunciado, opcoes, obrigatoria: tipo !== 'texto' }
      })
      .filter(Boolean)
      .slice(0, MAX_PERGUNTAS)

    if (!perguntas.length) {
      return NextResponse.json({ error: 'A IA não trouxe sugestões úteis. Tente descrever o objetivo com mais detalhes.' }, { status: 500 })
    }
    return NextResponse.json({ perguntas })
  } catch (err) {
    return erroInterno('pesquisa-sugerir-perguntas', err)
  }
}
