// v2 - gemini

import { NextRequest, NextResponse } from 'next/server'
import { chamarGemini } from '@/lib/gemini'

// Espaço extra pro retry de chamarGemini (até ~7s de espera entre tentativas,
// mais o tempo de cada chamada em si) não bater no timeout padrão da função.
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.error('GEMINI_API_KEY não encontrada')
      return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 })
    }

    const { contexto } = await req.json()

    const prompt = `Você é um especialista em estratégia de negócios e definição de ICP (Ideal Customer Profile).

Com base nos dados abaixo de uma empresa, sugira o perfil ideal de cliente (ICP) preenchendo os campos solicitados.

DADOS DA EMPRESA:
- Principais clientes (por faturamento): ${JSON.stringify(contexto.clientes_top, null, 2)}
- Mercados priorizados: ${contexto.mercados_priorizados.join(', ') || 'Não informado'}
- Competências: ${contexto.competencias.join(', ') || 'Não informado'}
- Diferencial: ${contexto.diferencial || 'Não informado'}
- Problemas que resolve: ${contexto.problemas_resolve || 'Não informado'}

Responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem explicações. O JSON deve ter exatamente estas chaves:
{
  "segmento": "...",
  "porte": "...",
  "regiao": "...",
  "dor_principal": "...",
  "canal": "...",
  "ticket_medio": "..."
}`

    const { ok, status, text: responseText } = await chamarGemini(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      // Ver comentário em /api/como-abordar-colega: modelos Gemini novos
      // (2.5+/3.x) gastam parte do maxOutputTokens com "pensamento"
      // interno antes de escrever a resposta — subido pra não cortar.
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    })

    if (!ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    // finishReason 'MAX_TOKENS' = resposta cortada no meio (modelo gastou o
    // limite com "pensamento" interno antes de terminar) — só loga, ajuda a
    // pegar se voltar a acontecer sem precisar reportar às cegas de novo.
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn('sugerir-icp: resposta cortada por MAX_TOKENS, considere subir maxOutputTokens de novo')
    }
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const clean = texto.replace(/```json|```/g, '').trim()
    const sugestao = JSON.parse(clean)

    return NextResponse.json(sugestao)
  } catch (err) {
    console.error('Erro sugerir-icp:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}