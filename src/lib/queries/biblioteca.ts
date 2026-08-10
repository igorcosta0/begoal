import { createClient } from '@/lib/supabase/client'

export interface BibliotecaDocumento {
  id: string
  client_id: string
  nome: string
  categoria: string
  storage_path: string
  tamanho_bytes: number | null
  content_type: string | null
  autor_nome: string | null
  user_id: string | null
  created_at: string
}

export const CATEGORIAS_BIBLIOTECA = ['Cultura', 'Estratégia', 'Pessoas', 'Financeiro', 'Outros']

export async function getDocumentos(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('biblioteca_documentos')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
}

export async function uploadDocumento(params: {
  clientId: string
  file: File
  categoria: string
  autorNome: string
  userId: string
}) {
  const { clientId, file, categoria, autorNome, userId } = params
  const supabase = createClient()

  const ext = file.name.includes('.') ? file.name.split('.').pop() : undefined
  const path = `${clientId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`

  const { error: uploadError } = await supabase.storage
    .from('biblioteca')
    .upload(path, file, { contentType: file.type || 'application/pdf' })
  if (uploadError) return { error: uploadError }

  const { error: insertError } = await supabase.from('biblioteca_documentos').insert({
    client_id: clientId,
    nome: file.name,
    categoria,
    storage_path: path,
    tamanho_bytes: file.size,
    content_type: file.type || 'application/pdf',
    autor_nome: autorNome || 'Usuário',
    user_id: userId,
  })

  if (insertError) {
    // Reverte o upload se não conseguiu salvar os metadados, pra não deixar arquivo órfão.
    await supabase.storage.from('biblioteca').remove([path])
    return { error: insertError }
  }

  return { error: null }
}

export async function getUrlDownload(storagePath: string) {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from('biblioteca')
    .createSignedUrl(storagePath, 60 * 10)
  return { url: data?.signedUrl ?? null, error }
}

export async function deleteDocumento(id: string, storagePath: string) {
  const supabase = createClient()
  await supabase.storage.from('biblioteca').remove([storagePath])
  return supabase.from('biblioteca_documentos').delete().eq('id', id)
}
