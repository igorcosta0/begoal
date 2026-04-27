import { createClient } from '@/lib/supabase/client'

export async function getFuncionarios(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('funcionarios')
    .select('id, full_name, setor_id, gestor_id, Foto_URL, setores(nome)')
    .eq('client_id', clientId)
    .order('full_name')
}

export async function createFuncionario(payload: {
  full_name: string
  client_id: string
  setor_id?: string
  gestor_id?: string
  user_id?: string
}) {
  const supabase = createClient()
  return supabase.from('funcionarios').insert(payload).select().single()
}

export async function updateFuncionario(
  id: string,
  payload: {
    full_name?: string
    setor_id?: string
    gestor_id?: string
    Foto_URL?: string
  }
) {
  const supabase = createClient()
  return supabase
    .from('funcionarios')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
}

export async function deleteFuncionario(id: string) {
  const supabase = createClient()
  return supabase.from('funcionarios').delete().eq('id', id)
}

export async function getMyProfile(userId: string) {
  const supabase = createClient()
  return supabase.rpc('get_my_employee_profile', { p_user_id: userId })
}