#!/usr/bin/env node
// Sobe os PDFs de "Adições futuras/" para a Biblioteca da empresa CTZ.
//
// Pré-requisito: já ter rodado supabase/migrations/20260810000000_biblioteca.sql
// no SQL Editor do Supabase (cria a tabela biblioteca_documentos e o bucket).
//
// Uso:
//   1. Garanta que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão
//      disponíveis — via .env.local na raiz do projeto, ou exportadas no shell.
//      (a service role key é necessária pra pular a RLS, já que o script roda
//      sem um usuário logado; pegue em Project Settings → API no Supabase)
//   2. node scripts/seed-biblioteca-ctz.mjs

import { readFileSync, existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function carregarEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const conteudo = readFileSync(envPath, 'utf8')
  for (const linha of conteudo.split('\n')) {
    const match = linha.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    const [, chave, valorBruto] = match
    if (process.env[chave] !== undefined) continue
    let valor = (valorBruto ?? '').trim()
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1)
    }
    process.env[chave] = valor
  }
}
carregarEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY (defina no .env.local ou exporte no shell).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const PASTA_ORIGEM = path.resolve(process.cwd(), 'Adições futuras')

// Nome do arquivo → categoria na Biblioteca. O que não estiver aqui cai em "Outros".
const CATEGORIA_POR_ARQUIVO = {
  'Código de Cultura CTZ 2026.pdf': 'Cultura',
  'CTZ - 1 REVISÃO ESTRATEGICA.pdf': 'Estratégia',
  'CTZ - 2 REVISÃO ESTRATEGICA.pdf': 'Estratégia',
  'CTZ - RELATORIO PE 2026 v1.pdf': 'Estratégia',
}

async function main() {
  if (!existsSync(PASTA_ORIGEM)) {
    console.error(`Pasta não encontrada: ${PASTA_ORIGEM}`)
    process.exit(1)
  }

  const { data: cliente, error: clienteError } = await supabase
    .from('clients')
    .select('id, company_name')
    .ilike('company_name', '%ctz%')
    .limit(1)
    .maybeSingle()

  if (clienteError) throw clienteError
  if (!cliente) {
    console.error('Nenhuma empresa com "CTZ" no nome foi encontrada em `clients`.')
    process.exit(1)
  }
  console.log(`Empresa: ${cliente.company_name} (${cliente.id})`)

  const arquivos = await readdir(PASTA_ORIGEM)
  const pdfs = arquivos.filter((f) => f.toLowerCase().endsWith('.pdf'))

  if (pdfs.length === 0) {
    console.log('Nenhum PDF encontrado em "Adições futuras/".')
    return
  }

  for (const arquivo of pdfs) {
    const categoria = CATEGORIA_POR_ARQUIVO[arquivo] ?? 'Outros'

    const { data: existente } = await supabase
      .from('biblioteca_documentos')
      .select('id')
      .eq('client_id', cliente.id)
      .eq('nome', arquivo)
      .maybeSingle()
    if (existente) {
      console.log(`Já existe, pulando: ${arquivo}`)
      continue
    }

    const caminhoLocal = path.join(PASTA_ORIGEM, arquivo)
    const bytes = readFileSync(caminhoLocal)
    const ext = path.extname(arquivo).slice(1)
    const storagePath = `${cliente.id}/${randomUUID()}${ext ? `.${ext}` : ''}`

    const { error: uploadError } = await supabase.storage
      .from('biblioteca')
      .upload(storagePath, bytes, { contentType: 'application/pdf' })
    if (uploadError) {
      console.error(`Erro ao enviar ${arquivo}:`, uploadError.message)
      continue
    }

    const { error: insertError } = await supabase.from('biblioteca_documentos').insert({
      client_id: cliente.id,
      nome: arquivo,
      categoria,
      storage_path: storagePath,
      tamanho_bytes: bytes.length,
      content_type: 'application/pdf',
      autor_nome: 'Sistema',
    })
    if (insertError) {
      console.error(`Erro ao salvar metadados de ${arquivo}:`, insertError.message)
      await supabase.storage.from('biblioteca').remove([storagePath])
      continue
    }

    console.log(`Enviado: ${arquivo} → categoria "${categoria}"`)
  }

  console.log('Concluído.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
