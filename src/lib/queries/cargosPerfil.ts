import { createClient } from '@/lib/supabase/client'

// Cruzamento cargo x Eneagrama (pedido do Igor, 01/09/2026) — ver comentário
// no topo de supabase/migrations/PENDENTE_20260901000000_cargos_perfil_eneagrama.sql
// pro histórico completo. Só existe visão de administrador aqui (mesma regra
// de getTodosPerfisEneagrama): a RLS de funcionarios_cargo_perfil só devolve
// linha pra quem pode_ver_todos_eneagrama_ctz() (Igor/Priscila) — pra
// qualquer outra pessoa a query roda normal e volta vazia.

export interface CargoPerfil {
  area: string
  cargo_base: string
  nivel: string | null
  sumario: string
  responsabilidades: string
  autonomia: string | null
  experiencia: string | null
  formacao: string | null
  competencias_tecnicas: string | null
  competencias_comportamentais: string | null
}

export interface CargoPerfilCompleto extends CargoPerfil {
  id: string
}

export interface FuncionarioCargoPerfil {
  funcionario_id: string
  cargo_perfil: CargoPerfil | null // null = cargo dela ainda não está mapeado na planilha de cargos (ver migration)
  dicas_texto: string | null
  dicas_gerado_em: string | null
}

// Aba "Cargos" (pedido 09/09/2026): catálogo puro dos perfis de cargo, sem
// cruzar com Eneagrama nem com nome de pessoa nenhuma — é a mesma planilha
// "Cargos Concretize.xlsx" já importada em 01/09/2026 pra alimentar o
// cruzamento cargo x Eneagrama do Autoconhecimento, só que exposta aqui como
// referência de consulta. Mesma tabela (`cargos_perfil`), mesmo acesso
// restrito (RLS ganhou administrador de verdade além do piloto — migration
// PENDENTE_20260909010000_cargos_perfil_acesso_admin).
export async function getCargosPerfil(clientId: string): Promise<{ data: CargoPerfilCompleto[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cargos_perfil')
    .select('id, area, cargo_base, nivel, sumario, responsabilidades, autonomia, experiencia, formacao, competencias_tecnicas, competencias_comportamentais')
    .eq('client_id', clientId)
    .order('area')
    .order('cargo_base')
    .order('nivel')

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as CargoPerfilCompleto[], error: null }
}

export async function getTodosCargosPerfil(clientId: string): Promise<{ mapa: Record<string, FuncionarioCargoPerfil>; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('funcionarios_cargo_perfil')
    .select('funcionario_id, dicas_texto, dicas_gerado_em, cargos_perfil(area, cargo_base, nivel, sumario, responsabilidades, autonomia, experiencia, formacao, competencias_tecnicas, competencias_comportamentais)')
    .eq('client_id', clientId)

  if (error) return { mapa: {}, error: error.message }

  const mapa: Record<string, FuncionarioCargoPerfil> = {}
  for (const row of (data ?? []) as any[]) {
    mapa[row.funcionario_id] = {
      funcionario_id: row.funcionario_id,
      cargo_perfil: row.cargos_perfil ?? null,
      dicas_texto: row.dicas_texto,
      dicas_gerado_em: row.dicas_gerado_em,
    }
  }
  return { mapa, error: null }
}
