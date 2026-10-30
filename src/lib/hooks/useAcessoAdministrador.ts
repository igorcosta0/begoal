'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'

// Pente fino (23/09/2026): /admin e /importar-lancamentos só sumiam do menu —
// quem digitasse o endereço abria a tela normalmente. Este hook aplica a
// mesma regra do menu dentro da própria página: administrador da empresa
// selecionada. A proteção de verdade continua sendo a RLS de cada tabela.
export function useAcessoAdministrador(): 'carregando' | 'ok' | 'negado' {
  const nivel = useNivelPermissao()
  if (nivel === undefined) return 'carregando'
  return nivel === 'administrador' ? 'ok' : 'negado'
}

// permission_level na empresa selecionada: undefined enquanto carrega, null
// sem papel. Usado onde o líder (gestor) também entra (Funcionários, 30/10/2026).
export function useNivelPermissao(): string | null | undefined {
  const { empresa } = useEmpresaStore()
  const [nivel, setNivel] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!empresa) {
      setNivel(null)
      return
    }
    const empresaId = empresa.id
    async function verificar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNivel(null)
        return
      }
      const { data } = await supabase
        .from('user_company_roles')
        .select('permission_level')
        .eq('user_id', user.id)
        .eq('client_id', empresaId)
        .maybeSingle()
      setNivel(data?.permission_level ?? null)
    }
    verificar()
  }, [empresa])

  return nivel
}
