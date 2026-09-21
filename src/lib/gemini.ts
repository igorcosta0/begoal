const GEMINI_MODEL = 'gemini-3.6-flash'

// Tempo máximo de UMA tentativa contra o Gemini. Sem isso, `fetch` não tem
// timeout nenhum por padrão — se o Google ficar lento/travado em vez de
// devolver um 503 rápido (o caso que o retry abaixo já cobria), a função
// inteira ficava pendurada até o `maxDuration` da rota matar o processo no
// meio, sem nunca chegar a tentar de novo — e a resposta cortada (não é JSON
// válido) é o que produz "Erro ao consultar o assistente." genérico no
// front-end em vez de uma mensagem específica (achado 21/09/2026, depois do
// reforço de retry não resolver: o problema não era só POUCAS tentativas, era
// UMA tentativa lenta travando tudo).
const TIMEOUT_POR_TENTATIVA_MS = 10000

/**
 * Chama o Gemini com retry automático em erros transitórios do lado do Google
 * (503 "the model is overloaded", 429 rate limit, e agora também timeout de
 * uma tentativa individual) — a própria documentação do Google recomenda
 * "wait and retry with exponential backoff" pra 503/429, não indicam request
 * malformado nem cota estourada de verdade. Qualquer outro status (400, 401,
 * 404, chave inválida etc.) não é retry-ável — não adianta tentar de novo,
 * volta na primeira tentativa igual antes.
 *
 * Pedido (21/09/2026): 3 tentativas extras (~5s de espera total) + timeout de
 * 10s por tentativa — pior caso ~45s (4 × 10s + 5s de espera), por isso as 6
 * rotas que chamam isso precisam de `maxDuration = 60` (o teto do plano
 * Hobby da Vercel sem Fluid Compute) — ajustar os dois números juntos se
 * mudar um deles.
 */
export async function chamarGemini(
  apiKey: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const esperasMs = [500, 1500, 3000]

  for (let tentativa = 0; ; tentativa++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_POR_TENTATIVA_MS)

    let status: number
    let text: string
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      status = response.status
      text = await response.text()
    } catch (err) {
      // AbortError (nosso timeout) é tratado como transitório, igual 503 —
      // qualquer outro erro de rede (DNS, conexão recusada etc.) também, não
      // tem por que assumir que é permanente.
      status = 504
      text = err instanceof Error ? err.message : String(err)
    } finally {
      clearTimeout(timer)
    }

    const ok = status >= 200 && status < 300
    const transitorio = status === 503 || status === 429 || status === 504
    if (ok || !transitorio || tentativa >= esperasMs.length) {
      return { ok, status, text }
    }

    console.warn(`Gemini ${status} (tentativa ${tentativa + 1}/${esperasMs.length + 1}) — tentando de novo em ${esperasMs[tentativa]}ms`)
    await new Promise((resolve) => setTimeout(resolve, esperasMs[tentativa]))
  }
}
