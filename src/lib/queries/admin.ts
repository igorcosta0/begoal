import { createClient } from '@/lib/supabase/client'

// ==================== EMPRESAS ====================

export async function getEmpresas() {
  const supabase = createClient()
  return supabase
    .from('clients')
    .select('id, company_name, logo_url')
    .order('company_name')
}

export async function createEmpresa(payload: {
  company_name: string
  logo_url?: string
}) {
  const supabase = createClient()
  return supabase.from('clients').insert(payload).select().single()
}

export async function updateEmpresa(
  id: string,
  payload: { company_name?: string; logo_url?: string }
) {
  const supabase = createClient()
  return supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
}

export async function deleteEmpresa(id: string) {
  const supabase = createClient()
  return supabase.from('clients').delete().eq('id', id)
}

// ==================== SETORES ====================

export async function getSetores(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('setores')
    .select('id, nome')
    .eq('client_id', clientId)
    .order('nome')
}

export async function createSetor(payload: {
  nome: string
  client_id: string
}) {
  const supabase = createClient()
  return supabase.from('setores').insert(payload).select().single()
}

export async function updateSetor(id: string, nome: string) {
  const supabase = createClient()
  return supabase
    .from('setores')
    .update({ nome })
    .eq('id', id)
    .select()
    .single()
}

export async function deleteSetor(id: string) {
  const supabase = createClient()
  return supabase.from('setores').delete().eq('id', id)
}

// ==================== PAPÉIS ====================

export async function getUsersByEmpresa(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('user_company_roles')
    .select('id, user_id, role, profiles(id, email, full_name)')
    .eq('client_id', clientId)
}

export async function upsertUserRole(payload: {
  user_id: string
  client_id: string
  role: string
}) {
  const supabase = createClient()
  return supabase.rpc('upsert_user_company_role', {
    p_user_id: payload.user_id,
    p_client_id: payload.client_id,
    p_role: payload.role,
  })
}

export async function deleteUserRole(userId: string, clientId: string) {
  const supabase = createClient()
  return supabase
    .from('user_company_roles')
    .delete()
    .eq('user_id', userId)
    .eq('client_id', clientId)
}

export async function getUserIdByEmail(email: string) {
  const supabase = createClient()
  return supabase.rpc('get_user_id_by_email', { p_email: email })
}