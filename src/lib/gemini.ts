const GEMINI_MODEL = 'gemini-3.6-flash'

/**
 * Chama o Gemini com retry automático em erros transitórios do lado do Google
 * (503 "the model is overloaded", 429 rate limit) — a própria documentação do
 * Google recomenda "wait and retry with exponential backoff" pra esses dois
 * casos específicos, não indicam request malformado nem cota estourada de
 * verdade (pedido 21/09/2026, depois de um "Erro Gemini: 503" recorrente no
 * Autoconhecimento). Qualquer outro status (400, 401, 404, chave inválida
 * etc.) não é retry-ável — não adianta tentar de novo, volta na primeira
 * tentativa igual antes.
 */
export async function chamarGemini(
  apiKey: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  // Pedido (21/09/2026, 2ª vez): a janela de retry original (2 tentativas extras,
  // ~2s de espera total) não bastou — a sobrecarga do lado do Google às vezes
  // dura mais que isso. Subido pra 3 tentativas extras (~7s de espera total),
  // acompanhado de `export const maxDuration` maior em cada rota que chama isso
  // (senão o timeout da própria função na Vercel cortaria o processo no meio do
  // retry antes mesmo do Gemini responder).
  const esperasMs = [500, 1500, 3000]

  for (let tentativa = 0; ; tentativa++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await response.text()

    const transitorio = response.status === 503 || response.status === 429
    if (response.ok || !transitorio || tentativa >= esperasMs.length) {
      return { ok: response.ok, status: response.status, text }
    }

    console.warn(`Gemini ${response.status} (tentativa ${tentativa + 1}/${esperasMs.length + 1}) — tentando de novo em ${esperasMs[tentativa]}ms`)
    await new Promise((resolve) => setTimeout(resolve, esperasMs[tentativa]))
  }
}
