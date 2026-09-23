'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'

// Pente fino (23/09/2026): /admin e /importar-lancamentos só sumiam do menu —
// quem digitasse o endereço abria a tela normalmente. Este hook aplica a
// mesma regra do menu dentro da própria página: administrador da empresa
// selecionada. A proteção de verdade continua sendo a RLS de cada tabela.
export function useAcessoAdministrador(): 'carregando' | 'ok' | 'negado' {
  const { empresa } = useEmpresaStore()
  const [acesso, setAcesso] = useState<'carregando' | 'ok' | 'negado'>('carregando')

  useEffect(() => {
    if (!empresa) {
      setAcesso('negado')
      return
    }
    const empresaId = empresa.id
    async function verificar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAcesso('negado')
        return
      }
      const { data } = await supabase
        .from('user_company_roles')
        .select('permission_level')
        .eq('user_id', user.id)
        .eq('client_id', empresaId)
        .maybeSingle()
      setAcesso(data?.permission_level === 'administrador' ? 'ok' : 'negado')
    }
    verificar()
  }, [empresa])

  return acesso
}
