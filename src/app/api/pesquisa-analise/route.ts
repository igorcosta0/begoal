import { NextRequest, NextResponse } from 'next/server'
import { chamarGemini } from '@/lib/gemini'
import { erroInterno } from '@/lib/apiIa'
import { createClient } from '@/lib/supabase/server'
import { metricaPergunta } from '@/lib/pesquisaMetricas'
import type { Pergunta, RespostaPesquisa } from '@/lib/queries/pesquisas'

// Guia do módulo de Pesquisa (Miro, etapa 4), F57: análise com IA dos
// resultados do recorte que está na tela. As respostas vêm pela mesma função
// do banco que a tela usa (só administrador; recorte com menos de 5 respostas
// não sai). Nome e e-mail de quem respondeu NUNCA vão para a IA: só os
// números de cada pergunta e o texto das respostas abertas.

export const maxDuration = 60

const MAX_TEXTOS = 150
const MAX_CHARS_TEXTO = 300

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY não encontrada')
      return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const pesquisaId = typeof body?.pesquisaId === 'string' ? body.pesquisaId : ''
    const filtro = body?.filtro && typeof body.filtro === 'object' && JSON.stringify(body.filtro).length < 5000 ? body.filtro : {}
    if (!/^[0-9a-f-]{36}$/i.test(pesquisaId)) return NextResponse.json({ error: 'Pesquisa inválida' }, { status: 400 })

    const [{ data: pesquisa }, { data: perguntas }, { data: recorte, error: erroRecorte }] = await Promise.all([
      supabase.from('pesquisas').select('titulo, publico, modelo').eq('id', pesquisaId).maybeSingle(),
      supabase.from('pesquisa_perguntas').select('id, tipo, enunciado, opcoes, obrigatoria').eq('pesquisa_id', pesquisaId).order('ordem'),
      supabase.rpc('pesquisa_respostas_filtradas', { p_pesquisa_id: pesquisaId, p_filtro: filtro }),
    ])
    if (erroRecorte || !pesquisa) return NextResponse.json({ error: erroRecorte?.message ?? 'Pesquisa não encontrada' }, { status: 403 })
    const r = recorte as { oculto: boolean; respostas: RespostaPesquisa[] }
    if (r.oculto) return NextResponse.json({ error: 'Este recorte tem menos de 5 respostas: para proteger o anonimato, a análise não é feita.' }, { status: 400 })
    if (r.respostas.length < 3) return NextResponse.json({ error: 'Ainda há poucas respostas para uma análise útil.' }, { status: 400 })

    const qs = (perguntas ?? []) as Pergunta[]
    const linhas: string[] = []
    const textos: string[] = []
    for (const q of qs) {
      const m = metricaPergunta(q, r.respostas)
      if (q.tipo === 'texto') {
        for (const resp of r.respostas) {
          const v = resp.itens[q.id]
          if (typeof v === 'string' && v.trim() && textos.length < MAX_TEXTOS) textos.push(`[${q.enunciado}] ${v.trim().slice(0, MAX_CHARS_TEXTO)}`)
        }
        continue
      }
      const partes = [`- ${q.enunciado} (${m.n} respostas)`]
      if (m.nps !== null) partes.push(`NPS ${m.nps}`)
      if (m.media !== null) partes.push(`média ${m.media.toFixed(1)} (escala ${q.tipo === 'nota_1_5' ? '1 a 5' : '0 a 10'})`)
      if (m.opcoes) partes.push(Object.entries(m.opcoes).map(([op, pct]) => `${op}: ${pct}%`).join('; '))
      linhas.push(partes.join(' · '))
    }

    const filtroTexto = Object.entries({ ...(filtro.segmento ?? {}) })
      .filter(([, v]) => Array.isArray(v) && v.length)
      .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
      .join('; ')

    const prompt = `Você é um especialista em pesquisas de clima, satisfação e NPS. Analise os resultados abaixo e escreva para o gestor da empresa, em português do Brasil, com linguagem simples e direta.

PESQUISA: ${pesquisa.titulo}
QUEM RESPONDEU: ${pesquisa.publico === 'externa' ? 'clientes ou público externo' : pesquisa.publico === 'lista' ? 'uma lista de participantes convidados' : 'funcionários da empresa (anônimo)'}
${filtroTexto ? `RECORTE APLICADO: ${filtroTexto}` : 'RECORTE: todas as respostas'}
TOTAL DE RESPOSTAS: ${r.respostas.length}

RESULTADOS POR PERGUNTA:
${linhas.join('\n') || '(sem perguntas de nota ou de escolha)'}

RESPOSTAS ABERTAS (amostra${textos.length >= MAX_TEXTOS ? `, até ${MAX_TEXTOS}` : ''}):
${textos.join('\n') || '(nenhuma)'}

Regras:
- Baseie-se SÓ nos dados acima. Cite números quando ajudar. Não invente causas que os dados não mostram; quando for hipótese, diga que é hipótese.
- Nunca tente identificar quem respondeu.
- Notas de 0 a 10: 9–10 é muito bom, 7–8 é razoável, 6 ou menos é ponto de atenção. NPS acima de 50 é bom; abaixo de 0 é preocupante.

Responda APENAS com JSON válido, sem markdown:
{"resumo":"2 a 3 frases","pontos_fortes":["..."],"pontos_de_atencao":["..."],"temas_abertas":["tema: o que as pessoas disseram"],"recomendacoes":["ação concreta"]}
Cada lista com no máximo 5 itens curtos.`

    const { ok, status, text } = await chamarGemini(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    })
    if (!ok) {
      console.error('Gemini error:', text)
      return NextResponse.json({ error: status === 429 ? 'A IA atingiu o limite de uso. Tente de novo mais tarde.' : `Erro Gemini: ${status}` }, { status: 500 })
    }
    const data = JSON.parse(text)
    const bruto = JSON.parse((data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').replace(/```json|```/g, '').trim())
    const lista = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x: string) => x.slice(0, 400)).slice(0, 5) : [])
    return NextResponse.json({
      resumo: typeof bruto.resumo === 'string' ? bruto.resumo.slice(0, 800) : '',
      pontos_fortes: lista(bruto.pontos_fortes),
      pontos_de_atencao: lista(bruto.pontos_de_atencao),
      temas_abertas: lista(bruto.temas_abertas),
      recomendacoes: lista(bruto.recomendacoes),
    })
  } catch (err) {
    return erroInterno('pesquisa-analise', err)
  }
}
