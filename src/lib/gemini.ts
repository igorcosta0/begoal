// Pedido (21/09/2026, urgente pra demo): "gemini-3.6-flash" bateu 429 (cota
// esgotada — plano gratuito do Flash é ~15 requisições/minuto, ~1.500/dia,
// pesquisado nesta sessão). Cota do Gemini é por MODELO, então um modelo
// diferente tem cota própria, ainda intacta. `gemini-3.1-flash-lite`
// (confirmado existente e recomendado pelo Google pra "tarefas de alto
// volume" — bom encaixe como fallback) entra como segunda opção: se o
// primeiro falhar (qualquer motivo — 429, 503, timeout), tenta o segundo
// antes de desistir. Não é uma troca definitiva: na PRÓXIMA chamada volta a
// tentar o principal primeiro (a cota dele pode já ter resetado).
const MODELOS_EM_ORDEM = ['gemini-3.6-flash', 'gemini-3.1-flash-lite']

// Tempo máximo de UMA tentativa contra o Gemini. Sem isso, `fetch` não tem
// timeout nenhum por padrão — se o Google ficar lento/travado em vez de
// devolver um erro rápido, a função inteira ficava pendurada até o
// `maxDuration` da rota matar o processo no meio (achado 21/09/2026). 18s dá
// espaço suficiente pra uma resposta legítima (esse modelo "pensa" antes de
// escrever, ver comentário sobre maxOutputTokens nas rotas que chamam isso)
// sem cortar cedo demais.
//
// Cada modelo da lista leva NO MÁXIMO 1 tentativa (sem retry dentro do mesmo
// modelo) — o fallback pro próximo modelo já cumpre o papel de "tentar de
// novo", e de um jeito melhor: se o motivo foi 429 (cota) ou 503 (sobrecarga
// DESSE modelo específico), insistir no mesmo modelo não ajudaria mesmo,
// trocar de modelo sim. Com 2 modelos × 18s = 36s de pior caso, sobra bastante
// margem dentro do `maxDuration = 60` de cada rota.
const TIMEOUT_POR_TENTATIVA_MS = 18000

async function tentarUmModelo(
  apiKey: string,
  modelo: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  // Chave no cabeçalho, não na URL (pente fino 23/09/2026): URL costuma ir
  // parar em log de proxy/CDN e em mensagem de erro de rede.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_POR_TENTATIVA_MS)
  const inicio = Date.now()

  let status: number
  let text: string
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    status = response.status
    text = await response.text()
  } catch (err) {
    // AbortError (nosso timeout) e qualquer outro erro de rede (DNS, conexão
    // recusada etc.) caem aqui — 504 sinaliza "não conseguimos nem terminar
    // de conversar com o Google", diferente de um status que o Google de
    // fato devolveu.
    status = 504
    text = err instanceof Error ? err.message : String(err)
  } finally {
    clearTimeout(timer)
  }

  const duracaoMs = Date.now() - inicio
  // Log de duração (não só de erro): sem isso, o próximo ajuste desses
  // números vira chute de novo em vez de olhar quanto tempo as respostas
  // normalmente levam nos logs da Vercel.
  if (duracaoMs > 5000 || status !== 200) {
    console.warn(`Gemini (${modelo}): ${duracaoMs}ms, status ${status}`)
  }

  return { ok: status >= 200 && status < 300, status, text }
}

/**
 * Chama o Gemini tentando cada modelo de `MODELOS_EM_ORDEM` em sequência —
 * primeiro o principal, e só se ele falhar (por qualquer motivo: 429 de cota,
 * 503 de sobrecarga, timeout) cai pro próximo. Sem retry dentro do mesmo
 * modelo de propósito: pra 429/503 insistir no mesmo modelo não costuma
 * ajudar, e trocar de modelo já cumpre esse papel melhor. Devolve o
 * resultado do ÚLTIMO modelo tentado se todos falharem.
 */
export async function chamarGemini(
  apiKey: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  let resultado: { ok: boolean; status: number; text: string } | null = null
  for (const modelo of MODELOS_EM_ORDEM) {
    resultado = await tentarUmModelo(apiKey, modelo, body)
    if (resultado.ok) return resultado
    const ultimo = modelo === MODELOS_EM_ORDEM[MODELOS_EM_ORDEM.length - 1]
    console.warn(`Gemini: modelo ${modelo} não respondeu (status ${resultado.status})${ultimo ? '' : ' — tentando o próximo modelo'}`)
  }
  return resultado!
}
