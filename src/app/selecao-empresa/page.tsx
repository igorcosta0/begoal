'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'

interface Empresa {
  id: string
  company_name: string
  logo_url?: string
  grupo?: string | null
  negocio?: string | null
  negocio_ordem?: number | null
}

/** Uma linha da lista: empresa comum, ou um grupo inteiro (ex.: BMG) com seus negócios. */
interface Entrada {
  chave: string
  nome: string
  logo_url?: string
  /** Empresa em que se entra ao clicar; num grupo, o primeiro negócio da ordem. */
  destino: Empresa
  negocios: number
}

function montarEntradas(lista: Empresa[]): Entrada[] {
  const entradas: Entrada[] = []
  const grupos = new Map<string, Empresa[]>()
  for (const e of lista) {
    if (!e.grupo) {
      entradas.push({ chave: e.id, nome: e.company_name, logo_url: e.logo_url, destino: e, negocios: 0 })
      continue
    }
    const doGrupo = grupos.get(e.grupo)
    if (doGrupo) doGrupo.push(e)
    else grupos.set(e.grupo, [e])
  }
  grupos.forEach((doGrupo, grupo) => {
    doGrupo.sort((a, b) => (a.negocio_ordem ?? 999) - (b.negocio_ordem ?? 999) || a.company_name.localeCompare(b.company_name))
    const destino = doGrupo[0]
    entradas.push({
      chave: `grupo:${grupo}`,
      nome: doGrupo.length > 1 ? grupo : destino.company_name,
      logo_url: destino.logo_url,
      destino,
      negocios: doGrupo.length > 1 ? doGrupo.length : 0,
    })
  })
  return entradas.sort((a, b) => a.nome.localeCompare(b.nome))
}

export default function SelecaoEmpresaPage() {
  const { setEmpresa } = useEmpresaStore()
  const [empresas, setEmpresas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEmpresas() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const { data } = await supabase
        .from('user_company_roles')
        .select('permission_level, clients(*)')
        .eq('user_id', user.id)
      if (data) {
        const lista = data.map((item: any) => item.clients).filter(Boolean) as Empresa[]
        const isAdministrador = data.some((item: any) => item.permission_level === 'administrador')

        // Usuário comum com apenas uma empresa: pula a seleção e vai direto para a página inicial.
        // Administradores sempre escolhem, pois podem acompanhar múltiplas empresas.
        // Vários negócios do mesmo grupo contam como uma entrada só (troca-se pelo botão do topo).
        const entradas = montarEntradas(lista)
        if (!isAdministrador && entradas.length === 1) {
          setEmpresa(entradas[0].destino)
          window.location.href = '/inicio'
          return
        }

        setEmpresas(entradas)
      }
      setLoading(false)
    }
    fetchEmpresas()
  }, [])

  function handleSelect(empresa: Empresa) {
    setEmpresa(empresa)
    window.location.href = '/inicio'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Carregando empresas...</p>
      </div>
    )
  }

  if (empresas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 px-8">
          <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada a este usuário.</p>
          <button
            onClick={async () => {
              await createClient().auth.signOut()
              window.location.href = '/login'
            }}
            className="text-sm text-primary hover:underline"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-8 px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Selecione a empresa
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha com qual empresa deseja trabalhar.
          </p>
        </div>
        <div className="space-y-3">
          {empresas.map((entrada) => (
            <button
              key={entrada.chave}
              onClick={() => handleSelect(entrada.destino)}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
            >
              {entrada.logo_url ? (
                <img
                  src={entrada.logo_url}
                  alt={entrada.nome}
                  className="w-10 h-10 rounded-md object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {entrada.nome.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{entrada.nome}</span>
                {entrada.negocios > 0 && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {entrada.negocios} negócios · alterne pelo botão no topo do sistema
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}