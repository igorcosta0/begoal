'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'

interface Empresa {
  id: string
  company_name: string
  logo_url?: string
}

export default function SelecaoEmpresaPage() {
  const router = useRouter()
  const { setEmpresa } = useEmpresaStore()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEmpresas() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('user_company_roles')
        .select('clients(*)')
        .eq('user_id', user.id)
      if (data) {
        const lista = data.map((item: any) => item.clients) as Empresa[]
        setEmpresas(lista)
      }
      setLoading(false)
    }
    fetchEmpresas()
  }, [router])

  function handleSelect(empresa: Empresa) {
    setEmpresa(empresa)
    router.push('/okr')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Carregando empresas...</p>
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
            Você tem acesso a múltiplas empresas. Escolha com qual deseja trabalhar.
          </p>
        </div>
        <div className="space-y-3">
          {empresas.map((empresa) => (
            <button
              key={empresa.id}
              onClick={() => handleSelect(empresa)}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
            >
              {empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt={empresa.company_name}
                  className="w-10 h-10 rounded-md object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {empresa.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-foreground">
                {empresa.company_name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}