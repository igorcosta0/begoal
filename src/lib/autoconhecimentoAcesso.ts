import type { SupabaseClient } from '@supabase/supabase-js'
import { souPilotoAutoconhecimento } from '@/lib/utils'

// Quem pode ver o Autoconhecimento (pedido 01/10/2026): só líderes e o piloto.
// Liderado (ex.: Gabriel, liderado do Felipe Marques) não vê o módulo — o
// líder dele é que usa o perfil dele no Mapa do time.
// Líder = tem liderado direto no organograma (sou_lider_de_alguem) OU tem
// "Líder" no cargo do cadastro (Jean, Guilherme: líderes sem liderado).
// Serve tanto pro cliente do navegador quanto pro do servidor.
export async function podeVerAutoconhecimento(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  clientId?: string | null
): Promise<boolean> {
  if (souPilotoAutoconhecimento(user.email)) return true
  let consultaCargo = supabase.from('funcionarios').select('cargo').eq('user_id', user.id)
  if (clientId) consultaCargo = consultaCargo.eq('client_id', clientId)
  const [{ data: liderDeAlguem }, { data: cadastros }] = await Promise.all([
    supabase.rpc('sou_lider_de_alguem'),
    consultaCargo,
  ])
  if (liderDeAlguem === true) return true
  return (cadastros ?? []).some((c: { cargo: string | null }) => /l[ií]der/i.test(c.cargo ?? ''))
}
