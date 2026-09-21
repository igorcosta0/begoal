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
  foto_url: string | null
}

// Busca o perfil público da pessoa logada (pra preencher o formulário na aba
// Perfil) — null quando ela ainda não escreveu nada.
export async function getMeuPerfilPublico(): Promise<{ perfil: PerfilPublico | null; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { perfil: null, error: 'Usuário não autenticado.' }

  const { data, error } = await supabase
    .from('funcionarios_perfil_publico')
    .select('funcionario_id, sobre_mim, habilidades, sonhos, foto_url')
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
    .select('funcionario_id, sobre_mim, habilidades, sonhos, foto_url')
    .eq('client_id', clientId)

  if (error) return { mapa: {}, error: error.message }

  const mapa: Record<string, PerfilPublico> = {}
  for (const row of (data ?? []) as PerfilPublico[]) {
    mapa[row.funcionario_id] = row
  }
  return { mapa, error: null }
}

// Pedido (21/09/2026): a foto de perfil precisa aparecer em todo lugar que já
// mostra aquele funcionário — alguns desses lugares só têm o funcionario_id
// à mão (listas de Avaliação, Cargos etc.), outros só o user_id (comentários
// de Táticas/mural "Missão", que guardam quem comentou por user_id). Uma
// consulta só, dois mapas de saída — mais leve que reaproveitar
// getPerfisPublicosPorEmpresa (que também traz sobre_mim/habilidades/sonhos,
// sem uso nesses lugares).
export async function getFotosPerfilPorEmpresa(clientId: string): Promise<{
  porFuncionarioId: Record<string, string>
  porUserId: Record<string, string>
  error: string | null
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('funcionarios_perfil_publico')
    .select('funcionario_id, user_id, foto_url')
    .eq('client_id', clientId)
    .not('foto_url', 'is', null)

  if (error) return { porFuncionarioId: {}, porUserId: {}, error: error.message }

  const porFuncionarioId: Record<string, string> = {}
  const porUserId: Record<string, string> = {}
  for (const row of (data ?? []) as { funcionario_id: string; user_id: string; foto_url: string | null }[]) {
    if (!row.foto_url) continue
    porFuncionarioId[row.funcionario_id] = row.foto_url
    porUserId[row.user_id] = row.foto_url
  }
  return { porFuncionarioId, porUserId, error: null }
}

// Sobe a foto pro bucket "avatars" (path fixo "<user_id>/foto.<ext>", com
// upsert — reenviar substitui a anterior, não acumula arquivo órfão) e grava
// a URL pública em funcionarios_perfil_publico.foto_url. Mesmo raciocínio de
// upsertMeuPerfilPublico: resolve funcionario_id/client_id a partir de
// `funcionarios` (leitura liberada pra qualquer autenticado) porque quem
// envia a primeira foto ainda pode não ter linha nenhuma nesta tabela.
export async function uploadMinhaFotoPerfil(arquivo: File): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'Usuário não autenticado.' }

  const { data: meuFuncionario, error: erroFuncionario } = await supabase
    .from('funcionarios')
    .select('id, client_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (erroFuncionario) return { url: null, error: erroFuncionario.message }
  if (!meuFuncionario) return { url: null, error: 'Não encontramos seu cadastro de funcionário.' }

  const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const caminho = `${user.id}/foto.${extensao}`

  const { error: erroUpload } = await supabase.storage
    .from('avatars')
    .upload(caminho, arquivo, { upsert: true, cacheControl: '3600' })
  if (erroUpload) return { url: null, error: erroUpload.message }

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(caminho)
  // Cache-busting: mesmo path, então sem isso o navegador (e o CDN do
  // Storage) continuariam servindo a foto antiga depois de reenviar.
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: erroSalvar } = await supabase
    .from('funcionarios_perfil_publico')
    .upsert(
      {
        funcionario_id: meuFuncionario.id,
        user_id: user.id,
        client_id: meuFuncionario.client_id,
        foto_url: url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'funcionario_id' }
    )
  if (erroSalvar) return { url: null, error: erroSalvar.message }

  return { url, error: null }
}
