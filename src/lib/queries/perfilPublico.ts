import { createClient } from '@/lib/supabase/client'

// "Perfil público" (pedido 10/09/2026) — 3 campos que cada usuário escreve
// sobre si mesmo (Sobre mim / Minhas Habilidades / Meus sonhos) e que ficam
// visíveis pra qualquer colega da mesma empresa. Tabela própria
// (funcionarios_perfil_publico, migration PENDENTE_20260910020000) — ver
// comentário da migration pro motivo de não ter entrado como coluna em
// funcionarios.

export interface PerfilPublico {
  funcionario_id: string
  sobre_mim: string | null
  habilidades: string | null
  sonhos: string | null
}

// Busca o perfil público da pessoa logada (pra preencher o formulário na aba
// Perfil) — null quando ela ainda não escreveu nada.
export async function getMeuPerfilPublico(): Promise<{ perfil: PerfilPublico | null; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { perfil: null, error: 'Usuário não autenticado.' }

  const { data, error } = await supabase
    .from('funcionarios_perfil_publico')
    .select('funcionario_id, sobre_mim, habilidades, sonhos')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { perfil: null, error: error.message }
  return { perfil: data, error: null }
}

// Grava (cria ou atualiza) o perfil público da pessoa logada. Busca
// funcionario_id/client_id da própria linha em `funcionarios` (leitura já é
// liberada pra qualquer usuário autenticado) porque quem preenche esta
// tabela pela primeira vez ainda não tem linha aqui pra saber esses IDs.
export async function upsertMeuPerfilPublico(campos: {
  sobre_mim: string
  habilidades: string
  sonhos: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: meuFuncionario, error: erroFuncionario } = await supabase
    .from('funcionarios')
    .select('id, client_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (erroFuncionario) return { error: erroFuncionario.message }
  if (!meuFuncionario) return { error: 'Não encontramos seu cadastro de funcionário.' }

  const { error } = await supabase
    .from('funcionarios_perfil_publico')
    .upsert(
      {
        funcionario_id: meuFuncionario.id,
        user_id: user.id,
        client_id: meuFuncionario.client_id,
        sobre_mim: campos.sobre_mim || null,
        habilidades: campos.habilidades || null,
        sonhos: campos.sonhos || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'funcionario_id' }
    )

  if (error) return { error: error.message }
  return { error: null }
}

// Lista o perfil público de todo mundo da empresa — usado na tela de
// Funcionários pra mostrar o que cada colega escreveu sobre si mesmo. Mapa
// por funcionario_id pra ficar fácil de casar com a lista de funcionários já
// carregada ali.
export async function getPerfisPublicosPorEmpresa(clientId: string): Promise<{ mapa: Record<string, PerfilPublico>; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('funcionarios_perfil_publico')
    .select('funcionario_id, sobre_mim, habilidades, sonhos')
    .eq('client_id', clientId)

  if (error) return { mapa: {}, error: error.message }

  const mapa: Record<string, PerfilPublico> = {}
  for (const row of (data ?? []) as PerfilPublico[]) {
    mapa[row.funcionario_id] = row
  }
  return { mapa, error: null }
}
