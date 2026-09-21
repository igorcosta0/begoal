const GEMINI_MODEL = 'gemini-3.6-flash'

// Tempo máximo de UMA tentativa contra o Gemini. Sem isso, `fetch` não tem
// timeout nenhum por padrão — se o Google ficar lento/travado em vez de
// devolver um 503 rápido (o caso que o retry abaixo já cobria), a função
// inteira ficava pendurada até o `maxDuration` da rota matar o processo no
// meio, sem nunca chegar a tentar de novo (achado 21/09/2026).
//
// Ajustado de 10s pra 18s no mesmo dia: 10s se mostrou curto demais — esse
// modelo "pensa" antes de escrever a resposta (ver comentário sobre
// maxOutputTokens nas rotas que chamam isso) e pode legitimamente passar de
// 10s numa resposta que ia funcionar, então 10s tava matando tentativa boa e
// cascateando pra "Erro Gemini: 504" depois de esgotar os retries — sintoma
// oposto do que o timeout deveria resolver.
const TIMEOUT_POR_TENTATIVA_MS = 18000

/**
 * Chama o Gemini com retry automático em erros transitórios do lado do Google
 * (503 "the model is overloaded", 429 rate limit, e timeout de uma tentativa
 * individual) — a própria documentação do Google recomenda "wait and retry
 * with exponential backoff" pra 503/429, não indicam request malformado nem
 * cota estourada de verdade. Qualquer outro status (400, 401, 404, chave
 * inválida etc.) não é retry-ável — não adianta tentar de novo, volta na
 * primeira tentativa igual antes.
 *
 * 2 tentativas extras (~2.8s de espera total) + timeout de 18s por tentativa
 * — pior caso ~57s (3 × 18s + 2.8s de espera), por isso as 6 rotas que chamam
 * isso precisam de `maxDuration = 60` (o teto do plano Hobby da Vercel sem
 * Fluid Compute) — ajustar os dois números juntos se mudar um deles.
 */
export async function chamarGemini(
  apiKey: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const esperasMs = [800, 2000]

  for (let tentativa = 0; ; tentativa++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_POR_TENTATIVA_MS)
    const inicio = Date.now()

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

    const duracaoMs = Date.now() - inicio
    // Log de duração (não só de erro): sem isso, da próxima vez que precisar
    // reajustar TIMEOUT_POR_TENTATIVA_MS vai ser chute de novo em vez de
    // olhar quanto tempo as respostas normalmente levam.
    if (duracaoMs > 5000 || status !== 200) {
      console.warn(`Gemini: tentativa ${tentativa + 1} levou ${duracaoMs}ms, status ${status}`)
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
