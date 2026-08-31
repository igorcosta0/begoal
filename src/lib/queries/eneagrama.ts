import { createClient } from '@/lib/supabase/client'

export interface PerfilEneagrama {
  tipo: number
  subtipo_sequencia: string | null
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
