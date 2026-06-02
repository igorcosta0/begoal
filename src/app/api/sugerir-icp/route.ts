// v2 - gemini

import { NextRequest, NextResponse } from 'next/server'

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      }
    )

    const responseText = await response.text()

    if (!response.ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${response.status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const clean = texto.replace(/```json|```/g, '').trim()
    const sugestao = JSON.parse(clean)

    return NextResponse.json(sugestao)
  } catch (err) {
    console.error('Erro sugerir-icp:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}