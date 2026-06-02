import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY não encontrada')
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const responseText = await response.text()
    console.log('Anthropic status:', response.status)
    console.log('Anthropic response:', responseText)

    if (!response.ok) {
      return NextResponse.json({ error: `Erro Anthropic: ${response.status} — ${responseText}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const texto = data.content?.[0]?.text ?? '{}'
    const clean = texto.replace(/```json|```/g, '').trim()
    const sugestao = JSON.parse(clean)

    return NextResponse.json(sugestao)
  } catch (err) {
    console.error('Erro sugerir-icp:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}