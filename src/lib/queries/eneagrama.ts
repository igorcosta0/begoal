import { createClient } from '@/lib/supabase/client'

export interface PerfilEneagrama {
  tipo: number
  subtipo_sequencia: string | null
}

export interface PerfilEneagramaComNome extends PerfilEneagrama {
  funcionario_id: string
  full_name: string
}

// Busca o perfil de Eneagrama da pessoa logada (nunca de outra pessoa — a RLS
// de funcionarios_eneagrama já restringe a linha a user_id = auth.uid(), este
// filtro aqui é só explícito). Retorna perfil: null quando a pessoa ainda não
// foi mapeada (ex.: contratação recente que ainda não fez o assessment).
export async function getMeuPerfilEneagrama(): Promise<{ perfil: PerfilEneagrama | null; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { perfil: null, error: 'Usuário não autenticado.' }

  const { data, error } = await supabase
    .from('funcionarios_eneagrama')
    .select('tipo, subtipo_sequencia')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { perfil: null, error: error.message }
  return { perfil: data, error: null }
}

// Lista o perfil de todos os funcionários mapeados de uma empresa. Só
// devolve linha pra quem está em pode_ver_todos_eneagrama_ctz() (RLS) — pra
// qualquer outra pessoa a query roda normal, mas volta vazia. Uso: visão de
// administrador do protótipo (Igor/Priscila), pra conferir se o mapeamento
// está funcionando pra todo mundo, não só pro próprio perfil.
export async function getTodosPerfisEneagrama(clientId: string): Promise<{ perfis: PerfilEneagramaComNome[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('funcionarios_eneagrama')
    .select('tipo, subtipo_sequencia, funcionario_id, funcionarios(full_name)')
    .eq('client_id', clientId)
    .order('tipo')

  if (error) return { perfis: [], error: error.message }

  const perfis = (data ?? []).map((row: any) => ({
    tipo: row.tipo,
    subtipo_sequencia: row.subtipo_sequencia,
    funcionario_id: row.funcionario_id,
    full_name: row.funcionarios?.full_name ?? '—',
  }))

  return { perfis, error: null }
}

export interface ColegaComPerfilMapeado {
  funcionario_id: string
  full_name: string
}

// 3 mapas do Autoconhecimento (pedido 10/09/2026, ver migration
// PENDENTE_20260910010000_autoconhecimento_3_mapas.sql). As 3 funções abaixo
// chamam RPCs security-definer que devolvem só NOME (nunca o tipo) — o tipo
// da outra pessoa só é lido no servidor, dentro das rotas de API que geram
// orientação (/api/como-abordar-colega, /api/liderar-liderado).

// Mapa 2 "Liderando o time": só aparece pra quem tem liderado direto no
// organograma (funcionarios.gestor_id) — mesma definição de líder já usada
// no escopo de gestor em avaliação.
export async function getSouLiderDeAlguem(): Promise<{ souLider: boolean; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('sou_lider_de_alguem')
  if (error) return { souLider: false, error: error.message }
  return { souLider: !!data, error: null }
}

// Mapa 3 "Relacionando com o time": qualquer colega da mesma empresa com tipo
// mapeado (menos a própria pessoa).
export async function getColegasComPerfilMapeado(): Promise<{ colegas: ColegaComPerfilMapeado[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('listar_colegas_com_perfil_mapeado')
  if (error) return { colegas: [], error: error.message }
  return { colegas: (data ?? []) as ColegaComPerfilMapeado[], error: null }
}

// Mapa 2 "Liderando o time": só os PRÓPRIOS liderados diretos, não a empresa
// toda.
export async function getMeusLideradosComPerfilMapeado(): Promise<{ liderados: ColegaComPerfilMapeado[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('listar_meus_liderados_com_perfil_mapeado')
  if (error) return { liderados: [], error: error.message }
  return { liderados: (data ?? []) as ColegaComPerfilMapeado[], error: null }
}
