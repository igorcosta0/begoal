import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { souPilotoAutoconhecimento } from '@/lib/utils'
import { TIPOS_ENEAGRAMA } from '@/lib/eneagrama/tipos'

// Gera (ou regenera) as "dicas e sugestões" de uma pessoa específica no
// cruzamento cargo x Eneagrama (pedido do Igor, 01/09/2026 — ver comentário
// no topo da migration PENDENTE_20260901000000_cargos_perfil_eneagrama.sql).
// Diferente de /api/assistente-eneagrama (que responde sobre quem está
// logado), esta rota é usada pelo admin piloto pra gerar a análise de
// QUALQUER pessoa mapeada — por isso recebe funcionarioId no corpo e não
// resolve "a própria pessoa" a partir da sessão. A trava de quem pode chamar
// isso é dupla: souPilotoAutoconhecimento aqui, e a RLS de
// funcionarios_cargo_perfil/funcionarios_eneagrama (só devolve linha de
// QUALQUER pessoa pra quem pode_ver_todos_eneagrama_ctz()) — sem isso as
// duas queries abaixo voltariam vazias pra qualquer outro usuário mesmo que
// passasse pela primeira trava.
//
// Pedido (09/09/2026): "dar funcionalidade ao botão Gerar Análise" pra
// também responder dúvidas sobre as 6 competências relacionais (apostila
// "Competências Relacionais" — como cada tipo reage a elas), não só ajuda/
// atrapalha genérico do cargo. Reaproveita esta MESMA rota/prompt (sem IA
// dedicada nova, como pedido) — montarPrompt ganhou uma 4ª seção que lista
// as 6 competências (já injetadas via tipo.competencias) uma a uma.
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

    const { funcionarioId } = await req.json() as { funcionarioId?: string }
    if (!funcionarioId) {
      return NextResponse.json({ error: 'funcionarioId ausente' }, { status: 400 })
    }

    const [{ data: vinculo, error: erroVinculo }, { data: eneagrama, error: erroEneagrama }] = await Promise.all([
      supabase
        .from('funcionarios_cargo_perfil')
        .select('id, cargos_perfil(area, cargo_base, nivel, sumario, responsabilidades, autonomia, experiencia, formacao, competencias_tecnicas, competencias_comportamentais)')
        .eq('funcionario_id', funcionarioId)
        .maybeSingle(),
      supabase
        .from('funcionarios_eneagrama')
        .select('tipo, subtipo_sequencia')
        .eq('funcionario_id', funcionarioId)
        .maybeSingle(),
    ])

    if (erroVinculo || erroEneagrama) {
      console.error('Erro ao buscar cargo/eneagrama:', erroVinculo, erroEneagrama)
      return NextResponse.json({ error: 'Erro ao buscar dados da pessoa' }, { status: 500 })
    }
    if (!eneagrama) {
      return NextResponse.json({ error: 'Essa pessoa ainda não tem tipo de Eneagrama mapeado' }, { status: 404 })
    }
    const cargoPerfil = (vinculo as any)?.cargos_perfil ?? null
    if (!cargoPerfil) {
      return NextResponse.json({ error: 'Essa pessoa ainda não tem perfil de cargo mapeado' }, { status: 404 })
    }

    const tipoInfo = TIPOS_ENEAGRAMA[eneagrama.tipo]
    if (!tipoInfo) {
      return NextResponse.json({ error: 'Tipo de Eneagrama inválido' }, { status: 500 })
    }

    const prompt = montarPrompt(cargoPerfil, tipoInfo)

    const response = await fetch(
      // gemini-1.5-flash e depois gemini-2.5-flash foram desativados pelo
      // Google (ambos passaram a devolver 404 — 2.5-flash com a mensagem
      // "no longer available to new users"). Erro real do Google (09/09/2026)
      // recomendou explicitamente gemini-3.6-flash como substituto.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1300 },
        }),
      }
    )

    const responseText = await response.text()
    if (!response.ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${response.status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const dicas = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Não consegui gerar uma análise agora. Tente novamente.'

    const { error: erroUpdate } = await supabase
      .from('funcionarios_cargo_perfil')
      .update({ dicas_texto: dicas, dicas_gerado_em: new Date().toISOString() })
      .eq('funcionario_id', funcionarioId)

    if (erroUpdate) {
      console.error('Erro ao salvar dicas:', erroUpdate)
      return NextResponse.json({ error: 'Gerado, mas falhou ao salvar' }, { status: 500 })
    }

    return NextResponse.json({ dicas })
  } catch (err) {
    console.error('Erro gerar-dica-cargo-eneagrama:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function montarPrompt(
  cargo: {
    area: string
    cargo_base: string
    nivel: string | null
    sumario: string
    responsabilidades: string
    autonomia: string | null
    experiencia: string | null
    competencias_tecnicas: string | null
    competencias_comportamentais: string | null
  },
  tipo: (typeof TIPOS_ENEAGRAMA)[number]
): string {
  const competenciasTexto = Object.entries(tipo.competencias)
    .map(([nome, c]) => `- ${nome}: costuma "${c.comoAge}" — ponto de atenção: ${c.pontoAtencao} — desenvolver: ${c.desenvolver}`)
    .join('\n')

  return `Você é um analista de RH da empresa CTZ, especializado em cruzar perfil comportamental (Eneagrama, Programa Foco da BeHive) com perfil de cargo. Escreva uma análise curta e prática para uso interno da liderança (não é enviada pra própria pessoa).

CARGO: ${cargo.cargo_base}${cargo.nivel ? ` (${cargo.nivel})` : ''} — área ${cargo.area}
Sumário do cargo: ${cargo.sumario}
Responsabilidades:
${cargo.responsabilidades}
Autonomia esperada: ${cargo.autonomia ?? '—'}
Experiência esperada: ${cargo.experiencia ?? '—'}
Competências técnicas exigidas: ${cargo.competencias_tecnicas ?? '—'}
Competências comportamentais exigidas: ${cargo.competencias_comportamentais ?? '—'}

PERFIL DA PESSOA — Tipo ${tipo.numero} do Eneagrama ("${tipo.motivacao}"):
Forças (versão saudável): ${tipo.forcas}
Sombra (o que atrapalha quando não regulado): ${tipo.sombra}
Virtude a desenvolver: ${tipo.virtude}
Força principal para resultados: ${tipo.forcaPrincipalResultados}
Como esse tipo costuma agir em cada competência de trabalho:
${competenciasTexto}

TAREFA: escreva, em português do Brasil, uma análise objetiva com 4 seções curtas (use estes títulos exatos em negrito markdown):
**O que o Eneagrama ajuda neste cargo** — 2 a 3 frases conectando forças reais do tipo com as competências comportamentais e responsabilidades específicas listadas acima (não genérico, cite a competência do cargo).
**O que pode atrapalhar** — 2 a 3 frases conectando a sombra/armadilha do tipo com riscos concretos nas responsabilidades ou no nível de autonomia esperado desse cargo.
**Como esse tipo tende a agir nas 6 competências relacionais** — liste as 6 competências acima (relacionamento interpessoal, tomada de decisão, comunicação, feedback, gestão de conflitos, orientação a resultados), uma por linha, cada uma em 1 frase curta descrevendo como ESSE tipo específico costuma se comportar nela (use o "costuma agir" e o ponto de atenção de cada competência listados acima, não invente comportamento genérico).
**Sugestão prática de desenvolvimento** — 1 a 2 frases de ação concreta pra liderança apoiar essa pessoa nesse cargo específico, considerando a virtude a desenvolver do tipo.

Regras: nunca trate o tipo como rótulo fechado ou desculpa. Seja específico ao cargo (não escreva algo genérico que serviria pra qualquer cargo). Máximo 320 palavras no total. Sem saudação, vá direto às 4 seções.`
}
